"""
Kline (candlestick) data service
"""
from typing import Dict, List, Any, Optional

from app.data_sources import DataSourceFactory
from app.utils.cache import CacheManager
from app.utils.logger import get_logger
from app.utils.market_hours import is_market_open
from app.config import CacheConfig

logger = get_logger(__name__)


class KlineService:
    """Kline (candlestick) data service"""
    
    def __init__(self):
        self.cache = CacheManager()
        self.cache_ttl = CacheConfig.KLINE_CACHE_TTL
    
    def _get_cache_ttl(self, market: str, timeframe: str) -> int:
        """Get cache TTL, extended when market is closed."""
        base_ttl = self.cache_ttl.get(timeframe, 300)
        if not is_market_open(market):
            return max(base_ttl, 600)  # at least 10 minutes when closed
        return base_ttl

    def get_kline(
        self,
        market: str,
        symbol: str,
        timeframe: str,
        limit: int = 300,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get kline (candlestick) data

        Args:
            market: Market type (Crypto, USStock, Forex, Futures)
            symbol: Trading pair / stock code
            timeframe: Time period
            limit: Number of data points
            before_time: Get data before this time

        Returns:
            List of kline data
        """
        # Build cache key (historical data is not cached)
        if not before_time:
            cache_key = f"kline:{market}:{symbol}:{timeframe}:{limit}"
            cached = self.cache.get(cache_key)
            if cached:
                # logger.info(f"Cache hit: {cache_key}")
                return cached
        
        # Fetch data
        klines = DataSourceFactory.get_kline(
            market=market,
            symbol=symbol,
            timeframe=timeframe,
            limit=limit,
            before_time=before_time
        )
        
        # Set cache (latest data only)
        if klines and not before_time:
            ttl = self._get_cache_ttl(market, timeframe)
            self.cache.set(cache_key, klines, ttl)
            # logger.info(f"Cache set: {cache_key}, TTL: {ttl}s")
        
        return klines
    
    def get_latest_price(self, market: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest price (uses 1-minute kline, deprecated, use get_realtime_price instead)"""
        klines = self.get_kline(market, symbol, '1m', 1)
        if klines:
            return klines[-1]
        return None
    
    def get_realtime_price(self, market: str, symbol: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get real-time price (prefers ticker API, falls back to minute kline)

        Args:
            market: Market type (Crypto, USStock, Forex, Futures)
            symbol: Trading pair / stock code
            force_refresh: Whether to force refresh (skip cache)

        Returns:
            Real-time price data: {
                'price': Latest price,
                'change': Price change,
                'changePercent': Price change percentage,
                'high': High price,
                'low': Low price,
                'open': Open price,
                'previousClose': Previous close price,
                'source': Data source ('ticker' or 'kline')
            }
        """
        # Build cache key (short-term cache to avoid frequent requests)
        cache_key = f"realtime_price:{market}:{symbol}"
        
        # If not force refresh, try using cache
        if not force_refresh:
            cached = self.cache.get(cache_key)
            if cached:
                return cached
        
        result = {
            'price': 0,
            'change': 0,
            'changePercent': 0,
            'high': 0,
            'low': 0,
            'open': 0,
            'previousClose': 0,
            'source': 'unknown'
        }
        
        # Try ticker API first for real-time price
        try:
            ticker = DataSourceFactory.get_ticker(market, symbol)
            if ticker and ticker.get('last', 0) > 0:
                result = {
                    'price': ticker.get('last', 0),
                    'change': ticker.get('change', 0),
                    'changePercent': ticker.get('changePercent', 0),
                    'high': ticker.get('high', 0),
                    'low': ticker.get('low', 0),
                    'open': ticker.get('open', 0),
                    'previousClose': ticker.get('previousClose', 0),
                    'source': 'ticker'
                }
                # Cache for 30 seconds
                self.cache.set(cache_key, result, 30)
                return result
        except Exception as e:
            logger.debug(f"Ticker API failed for {market}:{symbol}, falling back to kline: {e}")

        # Fallback: use 1-minute kline
        try:
            klines = self.get_kline(market, symbol, '1m', 2)
            if klines and len(klines) > 0:
                latest = klines[-1]
                prev_close = klines[-2]['close'] if len(klines) > 1 else latest.get('open', 0)
                current_price = latest.get('close', 0)
                
                change = round(current_price - prev_close, 4) if prev_close else 0
                change_pct = round(change / prev_close * 100, 2) if prev_close and prev_close > 0 else 0
                
                result = {
                    'price': current_price,
                    'change': change,
                    'changePercent': change_pct,
                    'high': latest.get('high', 0),
                    'low': latest.get('low', 0),
                    'open': latest.get('open', 0),
                    'previousClose': prev_close,
                    'source': 'kline_1m'
                }
                # Cache for 30 seconds
                self.cache.set(cache_key, result, 30)
                return result
        except Exception as e:
            logger.debug(f"1m kline failed for {market}:{symbol}, trying daily: {e}")

        # Final fallback: use daily kline data (for off-market hours)
        try:
            klines = self.get_kline(market, symbol, '1D', 2)
            if klines and len(klines) > 0:
                latest = klines[-1]
                prev_close = klines[-2]['close'] if len(klines) > 1 else latest.get('open', 0)
                current_price = latest.get('close', 0)
                
                change = round(current_price - prev_close, 4) if prev_close else 0
                change_pct = round(change / prev_close * 100, 2) if prev_close and prev_close > 0 else 0
                
                result = {
                    'price': current_price,
                    'change': change,
                    'changePercent': change_pct,
                    'high': latest.get('high', 0),
                    'low': latest.get('low', 0),
                    'open': latest.get('open', 0),
                    'previousClose': prev_close,
                    'source': 'kline_1d'
                }
                # Cache daily data for 5 minutes
                self.cache.set(cache_key, result, 300)
                return result
        except Exception as e:
            logger.error(f"All price sources failed for {market}:{symbol}: {e}")
        
        return result

