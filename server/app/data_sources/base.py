"""
Base data source class.
Defines a unified data source interface.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.utils.logger import get_logger

logger = get_logger(__name__)


# K-line timeframe to seconds mapping
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
    """Base data source class."""

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
        Get K-line (OHLCV) data.

        Args:
            symbol: Trading pair or stock symbol
            timeframe: Time period (1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W)
            limit: Number of candles
            before_time: Data before this time (Unix timestamp, seconds)

        Returns:
            List of K-line dicts:
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
        """Format a single K-line record."""
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
        Calculate time range in seconds needed for the given number of candles.

        Args:
            timeframe: Time period
            limit: Number of candles
            buffer_ratio: Buffer multiplier

        Returns:
            Time range in seconds
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
        Filter and limit K-line data.

        Args:
            klines: List of K-line dicts
            limit: Maximum count
            before_time: Drop candles after this time

        Returns:
            Filtered and limited K-line list
        """
        klines.sort(key=lambda x: x['time'])

        if before_time:
            klines = [k for k in klines if k['time'] < before_time]

        if len(klines) > limit:
            klines = klines[-limit:]

        return klines

    def log_result(
        self,
        symbol: str,
        klines: List[Dict[str, Any]],
        timeframe: str
    ):
        """Log fetch result."""
        if klines:
            latest_time = datetime.fromtimestamp(klines[-1]['time'])
            time_diff = (datetime.now() - latest_time).total_seconds()
            max_diff = TIMEFRAME_SECONDS.get(timeframe, 3600) * 2
            if time_diff > max_diff:
                logger.warning(f"Warning: {symbol} data is delayed ({time_diff:.0f}s)")
        else:
            logger.warning(f"{self.name}: no data for {symbol}")
