"""
Crypto data source.
Uses CCXT first; falls back to yfinance if ccxt not installed (ticker only; K-lines empty).
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

try:
    import ccxt
except ImportError:
    ccxt = None  # type: ignore

from app.data_sources.base import BaseDataSource, TIMEFRAME_SECONDS
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Common quote currencies (priority order)
_COMMON_QUOTES = ['USDT', 'USD', 'BTC', 'ETH', 'BUSD', 'USDC', 'BNB', 'EUR', 'GBP']


class CryptoDataSource(BaseDataSource):
    """Crypto data source (CCXT or yfinance fallback)."""

    name = "Crypto/CCXT" if ccxt else "Crypto/yfinance"

    # Timeframe mapping (CCXT); yfinance fallback supports get_ticker only
    TIMEFRAME_MAP = {}
    
    COMMON_QUOTES = _COMMON_QUOTES
    
    def __init__(self):
        self._use_yfinance = ccxt is None
        self.exchange = None
        self._markets_loaded = False
        self._markets_cache = None
        
        if not self._use_yfinance:
            from app.config import CCXTConfig
            self.TIMEFRAME_MAP = CCXTConfig.TIMEFRAME_MAP
            config = {
                'timeout': CCXTConfig.TIMEOUT,
                'enableRateLimit': CCXTConfig.ENABLE_RATE_LIMIT
            }
            if CCXTConfig.PROXY:
                config['proxies'] = {
                    'http': CCXTConfig.PROXY,
                    'https': CCXTConfig.PROXY
                }
            exchange_id = CCXTConfig.DEFAULT_EXCHANGE
            if not hasattr(ccxt, exchange_id):
                logger.warning("CCXT exchange '%s' not found, falling back to 'coinbase'", exchange_id)
                exchange_id = 'coinbase'
            exchange_class = getattr(ccxt, exchange_id)
            self.exchange = exchange_class(config)
        else:
            logger.info("ccxt not installed; using yfinance for crypto ticker (K-line unavailable). pip install ccxt for full support.")
    
    def _ensure_markets_loaded(self) -> bool:
        """Ensure markets are loaded (for symbol validation)."""
        if self._use_yfinance:
            return True
        if self._markets_loaded and self._markets_cache is not None:
            return True
        try:
            if hasattr(self.exchange, 'load_markets'):
                self.exchange.load_markets(reload=False)
            self._markets_cache = getattr(self.exchange, 'markets', {})
            self._markets_loaded = True
            return True
        except Exception as e:
            logger.debug("Failed to load markets for %s: %s", getattr(self.exchange, 'id', ''), e)
            return False
    
    def _normalize_symbol(self, symbol: str) -> Tuple[str, str]:
        """
        Normalize symbol to (normalized_symbol, base_currency).
        Handles: BTC/USDT, BTCUSDT, BTC/USDT:USDT -> BTC/USDT; BTC -> BTC/USDT; PI, TRX -> PI/USDT, TRX/USDT.
        """
        if not symbol:
            return '', ''

        sym = symbol.strip()

        # Drop swap/futures suffix
        if ':' in sym:
            sym = sym.split(':', 1)[0]

        sym = sym.upper()

        # If already has separator, parse
        if '/' in sym:
            parts = sym.split('/', 1)
            base = parts[0].strip()
            quote = parts[1].strip() if len(parts) > 1 else ''
            if base and quote:
                return f"{base}/{quote}", base
        
        # Try to identify from common quote currencies
        for quote in self.COMMON_QUOTES:
            if sym.endswith(quote) and len(sym) > len(quote):
                base = sym[:-len(quote)]
                if base:
                    return f"{base}/{quote}", base
        
        # If unrecognized, default to USDT
        return f"{sym}/USDT", sym
    
    def _find_valid_symbol(self, base: str, preferred_quote: str = 'USDT') -> Optional[str]:
        """
        Find a valid symbol in the exchange markets.

        Args:
            base: Base currency (e.g. 'PI', 'TRX')
            preferred_quote: Preferred quote currency

        Returns:
            Valid symbol if found, else None
        """
        if not self._ensure_markets_loaded():
            return None
        
        markets = self._markets_cache or {}
        if not markets:
            return None
        
        # Try quote currencies by priority
        quotes_to_try = [preferred_quote] + [q for q in _COMMON_QUOTES if q != preferred_quote]

        for quote in quotes_to_try:
            candidate = f"{base}/{quote}"
            if candidate in markets:
                market = markets[candidate]
                # Check if market is active
                if market.get('active', True):
                    return candidate
        
        return None
    
    def _normalize_symbol_for_exchange(self, symbol: str) -> str:
        """Normalize symbol for the exchange."""
        normalized, base = self._normalize_symbol(symbol)
        if not normalized or not base:
            return symbol
        if self._use_yfinance:
            return normalized
        exchange_id = getattr(self.exchange, 'id', '').lower()
        
        # Exchange-specific symbol mapping
        if exchange_id == 'coinbase':
            # Coinbase often uses USD not USDT
            if normalized.endswith('/USDT'):
                usd_version = normalized.replace('/USDT', '/USD')
                if self._ensure_markets_loaded():
                    markets = self._markets_cache or {}
                    if usd_version in markets:
                        return usd_version
        
        # Try to find valid symbol on exchange
        if self._ensure_markets_loaded():
            valid_symbol = self._find_valid_symbol(base, normalized.split('/')[1] if '/' in normalized else 'USDT')
            if valid_symbol:
                return valid_symbol
        
        return normalized

    def _get_ticker_yfinance(self, symbol: str) -> Dict[str, Any]:
        """Fallback: get ticker via yfinance (e.g. BTC-USD)."""
        normalized, base = self._normalize_symbol(symbol)
        if not base:
            return {'last': 0, 'symbol': symbol}
        try:
            import yfinance as yf
            # yfinance uses BTC-USD, ETH-USD, etc.
            yf_symbol = f"{base}-USD"
            t = yf.Ticker(yf_symbol)
            info = t.fast_info
            last = getattr(info, 'last_price', None) or getattr(info, 'previous_close', None)
            if last is None:
                hist = t.history(period="5d")
                if hist is not None and not hist.empty:
                    last = float(hist['Close'].iloc[-1])
            if last is not None:
                return {
                    'last': float(last),
                    'symbol': symbol,
                    'close': float(last),
                    'percentage': getattr(info, 'regular_market_change_percent', None),
                }
        except Exception as e:
            logger.debug("yfinance ticker failed for %s: %s", base, e)
        return {'last': 0, 'symbol': symbol}

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get latest ticker for a crypto symbol (CCXT or yfinance fallback).
        """
        if not symbol or not symbol.strip():
            return {'last': 0, 'symbol': symbol}
        if self._use_yfinance:
            return self._get_ticker_yfinance(symbol)
        normalized = self._normalize_symbol_for_exchange(symbol)
        if not normalized:
            logger.warning("Failed to normalize symbol: %s", symbol)
            return {'last': 0, 'symbol': symbol}
        try:
            ticker = self.exchange.fetch_ticker(normalized)
            if ticker and isinstance(ticker, dict):
                return ticker
        except Exception as e:
            error_msg = str(e).lower()
            is_symbol_error = any(keyword in error_msg for keyword in [
                'does not have market symbol',
                'symbol not found',
                'invalid symbol',
                'market does not exist',
                'trading pair not found'
            ])
            
            if is_symbol_error:
                # Try alternative symbol
                base = normalized.split('/')[0] if '/' in normalized else normalized
                if self._ensure_markets_loaded():
                    valid_symbol = self._find_valid_symbol(base)
                    if valid_symbol and valid_symbol != normalized:
                        try:
                            logger.debug(f"Trying alternative symbol: {valid_symbol} (original: {symbol}, first attempt: {normalized})")
                            ticker = self.exchange.fetch_ticker(valid_symbol)
                            if ticker and isinstance(ticker, dict):
                                return ticker
                        except Exception as e2:
                            logger.debug(f"Alternative symbol {valid_symbol} also failed: {e2}")
            
            # All attempts failed; log and return default
            logger.warning(
                f"Symbol '{symbol}' (normalized: {normalized}) not found on {self.exchange.id}. "
                f"Error: {str(e)[:100]}"
            )
        
        return {'last': 0, 'symbol': symbol}
    
    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get crypto K-line data (returns empty on yfinance fallback)."""
        if self._use_yfinance:
            return []
        klines = []
        try:
            ccxt_timeframe = self.TIMEFRAME_MAP.get(timeframe, '1d')
            
            # Use unified symbol normalization
            symbol_pair = self._normalize_symbol_for_exchange(symbol)
            
            if not symbol_pair:
                logger.warning(f"Failed to normalize symbol for K-line: {symbol}")
                return []
            
            # logger.info(f"Fetch crypto K-line: {symbol_pair}, tf={ccxt_timeframe}, limit={limit}")
            
            ohlcv = self._fetch_ohlcv(symbol_pair, ccxt_timeframe, limit, before_time, timeframe)
            
            if not ohlcv:
                logger.warning(f"CCXT returned no K-lines: {symbol_pair}")
                return []
            
            # Convert data format
            for candle in ohlcv:
                if len(candle) < 6:
                    continue
                klines.append(self.format_kline(
                    timestamp=int(candle[0] / 1000),  # ms to seconds
                    open_price=candle[1],
                    high=candle[2],
                    low=candle[3],
                    close=candle[4],
                    volume=candle[5]
                ))
            
            # Filter and limit
            klines = self.filter_and_limit(klines, limit, before_time)

            # Log result
            self.log_result(symbol, klines, timeframe)
            
        except Exception as e:
            logger.error(f"Failed to fetch crypto K-lines {symbol}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
        
        return klines
    
    def _fetch_ohlcv(
        self,
        symbol_pair: str,
        ccxt_timeframe: str,
        limit: int,
        before_time: Optional[int],
        timeframe: str
    ) -> List:
        """Fetch OHLCV data (paginated for full range)."""
        try:
            if before_time:
                # Compute time range
                total_seconds = self.calculate_time_range(timeframe, limit)
                end_time = datetime.fromtimestamp(before_time)
                start_time = end_time - timedelta(seconds=total_seconds)
                since = int(start_time.timestamp() * 1000)
                end_ms = before_time * 1000
                
                # logger.info(f"History request: since={since//1000}, end={before_time}, span_days={total_seconds/86400:.1f}")
                
                # Paginate until full range covered
                all_ohlcv = []
                batch_limit = 300  # Coinbase limit is often 300, safer than 1000
                current_since = since
                
                while current_since < end_ms:
                    batch = self.exchange.fetch_ohlcv(
                        symbol_pair, 
                        ccxt_timeframe, 
                        since=current_since, 
                        limit=batch_limit
                    )
                    
                    if not batch:
                        break
                    
                    all_ohlcv.extend(batch)
                    
                    # Use last bar time as next request start
                    last_timestamp = batch[-1][0]

                    # Done if past end or got fewer than requested
                    # if last_timestamp >= end_ms or len(batch) < batch_limit:
                    if last_timestamp >= end_ms:
                        break
                    
                    # Next batch starts after last bar
                    timeframe_ms = TIMEFRAME_SECONDS.get(timeframe, 86400) * 1000
                    current_since = last_timestamp + timeframe_ms
                    
                    # logger.info(f"Paginating: got {len(all_ohlcv)}, next from {datetime.fromtimestamp(current_since/1000)}")
                
                ohlcv = all_ohlcv
            else:
                ohlcv = self.exchange.fetch_ohlcv(symbol_pair, ccxt_timeframe, limit=limit)
            
            # logger.info(f"CCXT returned {len(ohlcv) if ohlcv else 0} bars")
            return ohlcv
            
        except Exception as e:
            logger.warning(f"CCXT fetch_ohlcv failed: {str(e)}; trying fallback")
            return self._fetch_ohlcv_fallback(symbol_pair, ccxt_timeframe, limit, before_time, timeframe)
    
    def _fetch_ohlcv_fallback(
        self,
        symbol_pair: str,
        ccxt_timeframe: str,
        limit: int,
        before_time: Optional[int],
        timeframe: str
    ) -> List:
        """Fallback fetch method."""
        try:
            total_seconds = self.calculate_time_range(timeframe, limit)
            
            if before_time:
                end_time = datetime.fromtimestamp(before_time)
                start_time = end_time - timedelta(seconds=total_seconds)
                since = int(start_time.timestamp() * 1000)
            else:
                since = int((datetime.now() - timedelta(seconds=total_seconds)).timestamp() * 1000)
            
            ohlcv = self.exchange.fetch_ohlcv(symbol_pair, ccxt_timeframe, since=since, limit=limit)
            # logger.info(f"CCXT fallback returned {len(ohlcv) if ohlcv else 0} bars")
            return ohlcv
        except Exception as e:
            logger.error(f"CCXT fallback method also failed: {str(e)}")
            return []

