"""
Indicator Parameters Parser and Helper Functions

Two core features:
1. External indicator params - parse @param declarations in indicator code
2. Indicator calling another indicator - call_indicator() helper

Param declaration format:
# @param param_name type default_value description
# @param ma_fast int 5 short MA period
# @param ma_slow int 20 long MA period
# @param threshold float 0.5 threshold

Supported types: int, float, bool, str
"""

import re
import json
from typing import Dict, Any, List, Optional, Tuple
from app.utils.logger import get_logger
from app.utils.db import get_db_connection

logger = get_logger(__name__)


class IndicatorParamsParser:
    """Parse @param declarations from indicator code."""

    # Param declaration regex: # @param name type default description
    PARAM_PATTERN = re.compile(
        r'#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)',
        re.IGNORECASE
    )
    
    @classmethod
    def parse_params(cls, indicator_code: str) -> List[Dict[str, Any]]:
        """
        Parse @param declarations from indicator code.

        Returns:
            List of param definitions, e.g. name, type, default, description.
        """
        params = []
        if not indicator_code:
            return params
        
        for line in indicator_code.split('\n'):
            line = line.strip()
            match = cls.PARAM_PATTERN.match(line)
            if match:
                name = match.group(1)
                param_type = match.group(2).lower()
                default_str = match.group(3)
                description = match.group(4).strip() if match.group(4) else ''

                # convert default value type
                default = cls._convert_value(default_str, param_type)

                # normalize type name
                if param_type == 'string':
                    param_type = 'str'
                
                params.append({
                    "name": name,
                    "type": param_type,
                    "default": default,
                    "description": description
                })
        
        return params
    
    @classmethod
    def _convert_value(cls, value_str: str, param_type: str) -> Any:
        """Convert string value to the given type."""
        try:
            param_type = param_type.lower()
            if param_type == 'int':
                return int(value_str)
            elif param_type == 'float':
                return float(value_str)
            elif param_type == 'bool':
                return value_str.lower() in ('true', '1', 'yes', 'on')
            else:  # str/string
                return value_str
        except (ValueError, TypeError):
            return value_str
    
    @classmethod
    def merge_params(cls, declared_params: List[Dict], user_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge declared params with user-provided params.

        Args:
            declared_params: Params parsed from code
            user_params: User-provided values

        Returns:
            Merged dict (user value or default).
        """
        result = {}
        for param in declared_params:
            name = param['name']
            param_type = param['type']
            default = param['default']

            if name in user_params:
                # user provided value, convert to correct type
                result[name] = cls._convert_value(str(user_params[name]), param_type)
            else:
                # use default
                result[name] = default
        
        return result


class IndicatorCaller:
    """
    Indicator caller - allows one indicator to call another.

    Usage (in indicator code):
        # by ID
        rsi_df = call_indicator(5, df)
        # by name (own indicator)
        macd_df = call_indicator('My MACD', df)
    """

    # Max call depth to prevent circular dependency
    MAX_CALL_DEPTH = 5

    def __init__(self, user_id: int, current_indicator_id: int = None):
        self.user_id = user_id
        self.current_indicator_id = current_indicator_id
        self._call_stack = []  # call stack for cycle detection

    def call_indicator(
        self,
        indicator_ref: Any,  # int (ID) or str (name)
        df: 'pd.DataFrame',
        params: Dict[str, Any] = None,
        _depth: int = 0
    ) -> Optional['pd.DataFrame']:
        """
        Call another indicator and return its result.

        Args:
            indicator_ref: Indicator ID or name
            df: Input kline data
            params: Params passed to the called indicator
            _depth: Internal, tracks call depth

        Returns:
            DataFrame with columns from the called indicator.
        """
        import pandas as pd
        import numpy as np

        # check call depth
        if _depth >= self.MAX_CALL_DEPTH:
            logger.error(f"Indicator call depth exceeded {self.MAX_CALL_DEPTH}")
            return df.copy()

        # get indicator code
        indicator_code, indicator_id = self._get_indicator_code(indicator_ref)
        if not indicator_code:
            logger.warning(f"Indicator not found: {indicator_ref}")
            return df.copy()

        # check circular dependency
        if indicator_id in self._call_stack:
            logger.error(f"Circular dependency detected: {self._call_stack} -> {indicator_id}")
            return df.copy()

        self._call_stack.append(indicator_id)

        try:
            # parse and merge params
            declared_params = IndicatorParamsParser.parse_params(indicator_code)
            merged_params = IndicatorParamsParser.merge_params(declared_params, params or {})

            # prepare execution env
            df_copy = df.copy()
            local_vars = {
                'df': df_copy,
                'open': df_copy['open'].astype('float64') if 'open' in df_copy.columns else pd.Series(dtype='float64'),
                'high': df_copy['high'].astype('float64') if 'high' in df_copy.columns else pd.Series(dtype='float64'),
                'low': df_copy['low'].astype('float64') if 'low' in df_copy.columns else pd.Series(dtype='float64'),
                'close': df_copy['close'].astype('float64') if 'close' in df_copy.columns else pd.Series(dtype='float64'),
                'volume': df_copy['volume'].astype('float64') if 'volume' in df_copy.columns else pd.Series(dtype='float64'),
                'signals': pd.Series(0, index=df_copy.index, dtype='float64'),
                'np': np,
                'pd': pd,
                'params': merged_params,
                # recursive call support
                'call_indicator': lambda ref, d, p=None: self.call_indicator(ref, d, p, _depth + 1)
            }

            # safe execution
            import builtins
            def safe_import(name, *args, **kwargs):
                allowed_modules = ['numpy', 'pandas', 'math', 'json', 'time']
                if name in allowed_modules or name.split('.')[0] in allowed_modules:
                    return builtins.__import__(name, *args, **kwargs)
                raise ImportError(f"Module not allowed: {name}")
            
            safe_builtins = {k: getattr(builtins, k) for k in dir(builtins) 
                           if not k.startswith('_') and k not in [
                               'eval', 'exec', 'compile', 'open', 'input',
                               'help', 'exit', 'quit', '__import__',
                               'copyright', 'credits', 'license'
                           ]}
            safe_builtins['__import__'] = safe_import
            
            exec_env = local_vars.copy()
            exec_env['__builtins__'] = safe_builtins
            
            pre_import = "import numpy as np\nimport pandas as pd\n"
            exec(pre_import, exec_env)
            exec(indicator_code, exec_env)
            
            return exec_env.get('df', df_copy)
            
        except Exception as e:
            logger.error(f"Error calling indicator {indicator_ref}: {e}")
            return df.copy()
        finally:
            self._call_stack.pop()
    
    def _get_indicator_code(self, indicator_ref: Any) -> Tuple[Optional[str], Optional[int]]:
        """Get indicator code by ID or name."""
        try:
            with get_db_connection() as db:
                cursor = db.cursor()

                if isinstance(indicator_ref, int):
                    # by ID
                    cursor.execute("""
                        SELECT id, code FROM ml_indicator_codes 
                        WHERE id = %s AND (user_id = %s OR publish_to_community = 1)
                    """, (indicator_ref, self.user_id))
                else:
                    # by name (prefer own indicator)
                    cursor.execute("""
                        SELECT id, code FROM ml_indicator_codes 
                        WHERE name = %s AND user_id = %s
                        UNION
                        SELECT id, code FROM ml_indicator_codes 
                        WHERE name = %s AND publish_to_community = 1
                        LIMIT 1
                    """, (str(indicator_ref), self.user_id, str(indicator_ref)))
                
                row = cursor.fetchone()
                cursor.close()
                
                if row:
                    return row['code'], row['id']
                return None, None
                
        except Exception as e:
            logger.error(f"Error fetching indicator code: {e}")
            return None, None


def get_indicator_params(indicator_id: int) -> List[Dict[str, Any]]:
    """
    Get parameter declarations for an indicator (for API).

    Args:
        indicator_id: Indicator ID

    Returns:
        List of param declarations.
    """
    try:
        with get_db_connection() as db:
            cursor = db.cursor()
            cursor.execute("SELECT code FROM ml_indicator_codes WHERE id = %s", (indicator_id,))
            row = cursor.fetchone()
            cursor.close()
            
            if row and row['code']:
                return IndicatorParamsParser.parse_params(row['code'])
            return []
    except Exception as e:
        logger.error(f"Error getting indicator params: {e}")
        return []
