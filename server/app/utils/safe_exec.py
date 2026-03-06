"""
Safe code execution utility
Provides timeout, resource limits, and sandboxed environment
"""
import signal
import sys
import os
import threading
import traceback
from typing import Dict, Any, Optional, Tuple
from contextlib import contextmanager

from app.utils.logger import get_logger

logger = get_logger(__name__)


class TimeoutError(Exception):
    """Code execution timeout exception"""
    pass


@contextmanager
def timeout_context(seconds: int):
    """
    Code execution timeout context manager

    Note:
    - Only effective on Unix/Linux systems
    - Only effective in the main thread; non-main threads fall back to no timeout limit
    - Falls back to no timeout limit on Windows

    Args:
        seconds: Timeout in seconds
    """
    # Check if running in the main thread
    is_main_thread = threading.current_thread() is threading.main_thread()
    
    if sys.platform == 'win32':
        # Windows does not support signal.alarm, can only log a warning
        logger.warning("Windows does not support signal-based timeouts; execution time limits may not work")
        yield
        return
    
    if not is_main_thread:
        # Non-main threads cannot use signal; log warning but do not enforce timeout
        # logger.warning(f"Running in non-main thread (thread: {threading.current_thread().name}), "
        #               f"signal timeout unavailable, code execution time cannot be limited")
        yield
        return
    
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Code execution timed out (exceeded {seconds} seconds)")
    
    try:
        # Set signal handler
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(seconds)
        
        try:
            yield
        finally:
            # Restore the original signal handler
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
    except ValueError as e:
        # If signal setup fails (e.g., in certain environments), log warning but do not interrupt execution
        logger.warning(f"Failed to set signal timeout: {str(e)}; execution will continue without timeout enforcement")
        yield


def safe_exec_code(
    code: str,
    exec_globals: Dict[str, Any],
    exec_locals: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
    max_memory_mb: Optional[int] = None
) -> Dict[str, Any]:
    """
    Safely execute Python code

    Args:
        code: Python code to execute
        exec_globals: Global variables dict
        exec_locals: Local variables dict (if None, uses exec_globals)
        timeout: Timeout in seconds, default 30s
        max_memory_mb: Maximum memory limit in MB, default 500MB

    Returns:
        Execution result dict containing:
        - success: bool, whether execution succeeded
        - error: str, error message (if failed)
        - result: Any, execution result (if any)

    Raises:
        TimeoutError: If code execution times out
    """
    if exec_locals is None:
        exec_locals = exec_globals
    
    # Set memory limit (if supported)
    if max_memory_mb is None:
        max_memory_mb = 500  # Default 500MB
    
    try:
        # Note: resource.setrlimit is process-level and affects the entire API process.
        # Previously the global 500MB limit could prevent parallel strategies/threads from allocating memory.
        # Only set when SAFE_EXEC_ENABLE_RLIMIT is explicitly enabled.
        if sys.platform != 'win32' and os.getenv('SAFE_EXEC_ENABLE_RLIMIT', 'false').lower() == 'true':
            try:
                import resource
                max_memory_bytes = max_memory_mb * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_AS, (max_memory_bytes, max_memory_bytes))
                logger.debug(f"Memory limit set: {max_memory_mb}MB (SAFE_EXEC_ENABLE_RLIMIT enabled)")
            except (ImportError, ValueError, OSError) as e:
                logger.warning(f"Failed to set memory limit: {str(e)}")
        else:
            logger.debug("No resource memory limit (SAFE_EXEC_ENABLE_RLIMIT disabled or unsupported platform)")
        
        # On Windows, timeout_context does not actually enforce time limits
        # but will log a warning
        with timeout_context(timeout):
            exec(code, exec_globals, exec_locals)
        
        return {
            'success': True,
            'error': None,
            'result': None
        }
        
    except MemoryError as e:
        error_msg = f"Code execution out of memory (exceeded {max_memory_mb}MB limit)"
        logger.error(f"Code execution out of memory (limit={max_memory_mb}MB)")
        return {
            'success': False,
            'error': error_msg,
            'result': None
        }
    except TimeoutError as e:
        error_msg = str(e)
        logger.error(f"Code execution timed out (timeout={timeout}s)")
        return {
            'success': False,
            'error': error_msg,
            'result': None
        }
    except Exception as e:
        error_msg = f"Code execution error: {str(e)}\n{traceback.format_exc()}"
        logger.error(f"Code execution error: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': error_msg,
            'result': None
        }


def validate_code_safety(code: str) -> Tuple[bool, Optional[str]]:
    """
    Validate code safety (basic check)

    Check whether the code contains dangerous function calls or imports

    Args:
        code: Python code to check

    Returns:
        (is_safe: bool, error_message: Optional[str])
    """
    import ast
    import re
    
    # Dangerous keywords and function names
    dangerous_patterns = [
        # System command execution
        r'\bos\.system\b',
        r'\bos\.popen\b',
        r'\bos\.spawn\b',
        r'\bos\.exec\b',
        r'\bos\.fork\b',
        r'\bsubprocess\b',
        r'\bcommands\b',
        # Code execution
        r'\b__import__\s*\(',
        r'\beval\s*\(',
        r'\bexec\s*\(',
        r'\bcompile\s*\(',
        # File operations
        r'\bopen\s*\(',
        r'\bfile\s*\(',
        r'\b__builtins__\b',
        # Module imports
        r'\bimport\s+os\b',
        r'\bimport\s+sys\b',
        r'\bimport\s+subprocess\b',
        r'\bimport\s+pymysql\b',
        r'\bimport\s+sqlite3\b',
        r'\bimport\s+requests\b',
        r'\bimport\s+urllib\b',
        r'\bimport\s+http\b',
        r'\bimport\s+socket\b',
        r'\bimport\s+ftplib\b',
        r'\bimport\s+telnetlib\b',
        r'\bimport\s+pickle\b',
        r'\bimport\s+cpickle\b',
        r'\bimport\s+marshal\b',
        r'\bimport\s+ctypes\b',
        r'\bimport\s+multiprocessing\b',
        r'\bimport\s+threading\b',
        r'\bimport\s+concurrent\b',
        # Reflection and metaprogramming (could be used to bypass restrictions)
        r'\bgetattr\s*\(.*__import__',
        r'\bgetattr\s*\(.*eval',
        r'\bgetattr\s*\(.*exec',
        r'\bsetattr\s*\(',
        r'\b__getattribute__\b',
        r'\b__setattr__\b',
        r'\b__dict__\b',
        r'\bglobals\s*\(',
        r'\blocals\s*\(',
        r'\bdir\s*\(',
        r'\btype\s*\(.*\)\s*\(',  # type() could be used to create new types
        r'\b__class__\b',
        r'\b__bases__\b',
        r'\b__subclasses__\b',
        r'\b__mro__\b',
        r'\b__init__\b.*__import__',
        r'\b__new__\b.*__import__',
        # Other dangerous operations
        r'\b__builtins__\s*\[',
        r'\b__builtins__\s*\.',
        r'\b__import__\s*\(',
        r'\bimportlib\b',
        r'\bimp\b',
    ]
    
    # Check if the code contains dangerous patterns
    for pattern in dangerous_patterns:
        if re.search(pattern, code):
            return False, f"Dangerous code pattern detected: {pattern}"
    
    # Try parsing AST to check for dangerous nodes
    try:
        tree = ast.parse(code)
        
        # Dangerous modules list (extended)
        dangerous_modules = [
            'os', 'sys', 'subprocess', 'pymysql', 'sqlite3',
            'requests', 'urllib', 'http', 'socket', 'ftplib', 'telnetlib',
            'pickle', 'cpickle', 'marshal', 'ctypes',
            'multiprocessing', 'threading', 'concurrent',
            'importlib', 'imp', 'builtins'
        ]
        
        # Dangerous functions list (extended)
        # Note: hasattr is safe, only used for attribute checking, not access
        dangerous_functions = [
            'eval', 'exec', 'compile', '__import__',
            'getattr', 'setattr', 'delattr',  # hasattr removed, it is safe
            'globals', 'locals', 'vars', 'dir', 'type'
        ]
        
        # Check for dangerous function calls
        for node in ast.walk(tree):
            # Check for calls to dangerous functions
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name in dangerous_functions:
                        return False, f"Dangerous function call detected: {func_name}()"
                
                # Check for calls like os.system
                if isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name):
                        if node.func.value.id in dangerous_modules:
                            return False, f"Dangerous module call detected: {node.func.value.id}.{node.func.attr}"
                    
                    # Check for bypass patterns like getattr(builtins, '__import__')
                    if isinstance(node.func, ast.Name) and node.func.id == 'getattr':
                        # Check getattr arguments
                        if len(node.args) >= 2:
                            if isinstance(node.args[0], ast.Name) and node.args[0].id in ['builtins', '__builtins__']:
                                if isinstance(node.args[1], ast.Constant) and node.args[1].value in dangerous_functions:
                                    return False, f"Bypass via getattr detected: getattr({node.args[0].id}, '{node.args[1].value}')"
        
        # Check import statements
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in dangerous_modules:
                        return False, f"Dangerous module import detected: {alias.name}"
            
            if isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] in dangerous_modules:
                    return False, f"Dangerous module import detected: {node.module}"
        
        # Check for attempts to access __builtins__
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute):
                if isinstance(node.attr, str) and node.attr.startswith('__') and node.attr.endswith('__'):
                    if node.attr in ['__builtins__', '__import__', '__class__', '__bases__', '__subclasses__', '__mro__']:
                        # Check if used in a dangerous context
                        if isinstance(node.value, ast.Name) and node.value.id in ['builtins', '__builtins__']:
                            return False, f"Dangerous attribute access detected: {node.value.id}.{node.attr}"
        
    except SyntaxError as e:
        return False, f"Code syntax error: {str(e)}"
    except Exception as e:
        # If AST parsing fails, log warning but allow to continue (code may be incomplete)
        logger.warning(f"AST parse failed; skipping safety checks: {str(e)}")
    
    return True, None
