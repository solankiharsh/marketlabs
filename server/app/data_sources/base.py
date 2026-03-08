"""
Data source base class.
Defines a unified data source interface.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.utils.logger import get_logger
from app.utils.market_hours import is_market_open

logger = get_logger(__name__)


# K-line period mapping (seconds)
TIMEFRAME_SECONDS = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1H': 3600,
    '4H': 14400,
    '1D': 86400,
    '1W': 604800
}


class BaseDataSource(ABC):
    """Data source base class"""
    
    name: str = "base"
    
    @abstractmethod
    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get K-line data
        
        Args:
            symbol: Trading pair/stock code
            timeframe: Time period (1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W)
            limit: Number of data points
            before_time: Get data before this time (Unix timestamp, seconds)
            
        Returns:
            K-line data list, format:
            [{"time": int, "open": float, "high": float, "low": float, "close": float, "volume": float}, ...]
        """
        pass

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get latest ticker for a symbol (best-effort).

        This is an optional interface used by the strategy executor for fetching current price.
        Implementations may return a dict compatible with CCXT `fetch_ticker` shape (e.g. {'last': ...}).
        """
        raise NotImplementedError("get_ticker is not implemented for this data source")
    
    def format_kline(
        self,
        timestamp: int,
        open_price: float,
        high: float,
        low: float,
        close: float,
        volume: float
    ) -> Dict[str, Any]:
        """Format single K-line data"""
        return {
            'time': timestamp,
            'open': round(float(open_price), 4),
            'high': round(float(high), 4),
            'low': round(float(low), 4),
            'close': round(float(close), 4),
            'volume': round(float(volume), 2)
        }
    
    def calculate_time_range(
        self,
        timeframe: str,
        limit: int,
        buffer_ratio: float = 1.2
    ) -> int:
        """
        Calculate the time range needed to get the specified number of K-line data (seconds)
        
        Args:
            timeframe: Time period
            limit: Number of K-line data
            buffer_ratio: Buffer coefficient
            
        Returns:
            Time range (seconds)
        """
        seconds_per_candle = TIMEFRAME_SECONDS.get(timeframe, 86400)
        return int(seconds_per_candle * limit * buffer_ratio)
    
    def filter_and_limit(
        self,
        klines: List[Dict[str, Any]],
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter and limit K-line data
        
        Args:
            klines: K-line data list
            limit: Maximum number
            before_time: Filter data after this time
            
        Returns:
            Processed K-line data
        """
        # Sort by time
        klines.sort(key=lambda x: x['time'])
        
        # Filter time
        if before_time:
            klines = [k for k in klines if k['time'] < before_time]
        
        # Limit number (take the latest)
        if len(klines) > limit:
            klines = klines[-limit:]
        
        return klines
    
    def log_result(
        self,
        symbol: str,
        klines: List[Dict[str, Any]],
        timeframe: str,
        market: Optional[str] = None
    ):
        """Log the result of getting data, market-hours aware."""
        if klines:
            latest_time = datetime.fromtimestamp(klines[-1]['time'])
            time_diff = (datetime.now() - latest_time).total_seconds()

            # Check if the data is too old
            max_diff = TIMEFRAME_SECONDS.get(timeframe, 3600) * 2
            if time_diff > max_diff:
                if market and not is_market_open(market):
                    logger.debug(f"{symbol}: data is {time_diff:.0f}s old (market closed, expected)")
                else:
                    logger.warning(f"Warning: {symbol} data is delayed ({time_diff:.0f} seconds)")
        else:
            logger.warning(f"{self.name}: no data for {symbol}")

