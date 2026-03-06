"""
Forex data source - uses Tiingo for FX data.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import time
import requests
import threading

from app.data_sources.base import BaseDataSource, TIMEFRAME_SECONDS
from app.utils.logger import get_logger
from app.config import TiingoConfig, APIKeys

logger = get_logger(__name__)

# Global cache to reduce Tiingo API calls
_forex_cache: Dict[str, Dict[str, Any]] = {}
_forex_cache_lock = threading.Lock()
_FOREX_CACHE_TTL = 60  # 60s cache (Tiingo free API is rate-limited)


class ForexDataSource(BaseDataSource):
    """Forex data source (Tiingo)."""

    name = "Forex/Tiingo"

    # Tiingo resampleFreq: free tier supports 5min, 15min, 30min, 1hour, 4hour, 1day; 1min is paid; 1W/1M need aggregation
    TIMEFRAME_MAP = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1H': '1hour',
        '4H': '4hour',
        '1D': '1day',
        '1W': None,
        '1M': None
    }

    SYMBOL_MAP = {
        'XAUUSD': 'xauusd',
        'XAGUSD': 'xagusd',
        'EURUSD': 'eurusd',
        'GBPUSD': 'gbpusd',
        'USDJPY': 'usdjpy',
        'AUDUSD': 'audusd',
        'USDCAD': 'usdcad',
        'USDCHF': 'usdchf',
        'NZDUSD': 'nzdusd',
    }
    
    def __init__(self):
        self.base_url = TiingoConfig.BASE_URL
        if not APIKeys.TIINGO_API_KEY:
             logger.warning("Tiingo API key is not configured; FX data will be unavailable")
    
    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get forex real-time quote via Tiingo FX Top-of-Book API (60s cache).
        Returns dict: last (mid), bid, ask, change, changePercent.
        """
        api_key = APIKeys.TIINGO_API_KEY
        if not api_key:
            logger.warning("Tiingo API key not configured")
            return {'last': 0, 'symbol': symbol}

        cache_key = f"ticker_{symbol}"
        with _forex_cache_lock:
            cached = _forex_cache.get(cache_key)
            if cached:
                cache_time = cached.get('_cache_time', 0)
                if time.time() - cache_time < _FOREX_CACHE_TTL:
                    logger.debug(f"Using cached forex ticker for {symbol}")
                    return cached
        
        try:
            tiingo_symbol = self.SYMBOL_MAP.get(symbol)
            if not tiingo_symbol:
                tiingo_symbol = symbol.lower()
            
            # Tiingo FX Top-of-Book API
            # https://api.tiingo.com/tiingo/fx/top?tickers=eurusd&token=...
            url = f"{self.base_url}/fx/top"
            params = {
                'tickers': tiingo_symbol,
                'token': api_key
            }
            
            for attempt in range(3):
                response = requests.get(url, params=params, timeout=TiingoConfig.TIMEOUT)
                if response.status_code == 429:
                    wait_time = 2 * (attempt + 1)
                    logger.warning(f"Tiingo rate limit (429), waiting {wait_time}s before retry ({attempt+1}/3)")
                    time.sleep(wait_time)
                    continue
                break
            
            if response.status_code == 429:
                logger.warning("Tiingo rate limit exceeded for ticker request")
                logger.info("Note: Tiingo 1-minute forex data requires a paid subscription")
                with _forex_cache_lock:
                    if cache_key in _forex_cache:
                        logger.info(f"Returning stale cache for {symbol} due to rate limit")
                        return _forex_cache[cache_key]
                return {'last': 0, 'symbol': symbol}
            
            response.raise_for_status()
            data = response.json()
            
            if data and isinstance(data, list) and len(data) > 0:
                item = data[0]
                # Tiingo FX top returns: ticker, quoteTimestamp, bidPrice, bidSize, askPrice, askSize, midPrice
                bid = float(item.get('bidPrice', 0) or 0)
                ask = float(item.get('askPrice', 0) or 0)
                mid = float(item.get('midPrice', 0) or 0)
                
                if not mid and bid and ask:
                    mid = (bid + ask) / 2
                
                last_price = mid or bid or ask
                
                prev_close = 0
                change = 0
                change_pct = 0
                
                try:
                    yesterday = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
                    today = datetime.now().strftime('%Y-%m-%d')
                    price_url = f"{self.base_url}/fx/{tiingo_symbol}/prices"
                    price_params = {
                        'startDate': yesterday,
                        'endDate': today,
                        'resampleFreq': '1day',
                        'token': api_key
                    }
                    price_resp = requests.get(price_url, params=price_params, timeout=TiingoConfig.TIMEOUT)
                    if price_resp.status_code == 200:
                        price_data = price_resp.json()
                        if price_data and len(price_data) > 0:
                            prev_close = float(price_data[-1].get('close', 0) or 0)
                            if prev_close and last_price:
                                change = last_price - prev_close
                                change_pct = (change / prev_close) * 100
                except Exception:
                    pass

                result = {
                    'last': round(last_price, 5),
                    'bid': round(bid, 5),
                    'ask': round(ask, 5),
                    'change': round(change, 5),
                    'changePercent': round(change_pct, 2),
                    'previousClose': round(prev_close, 5) if prev_close else 0,
                    '_cache_time': time.time()
                }
                
                with _forex_cache_lock:
                    _forex_cache[cache_key] = result
                
                return result
                
        except Exception as e:
            logger.error(f"Failed to get forex ticker for {symbol}: {e}")
        
        return {'last': 0, 'symbol': symbol}
    
    def _get_timeframe_seconds(self, timeframe: str) -> int:
        """Return seconds for the given timeframe."""
        return TIMEFRAME_SECONDS.get(timeframe, 86400)

    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get forex kline data.
        Args: symbol (e.g. XAUUSD, EURUSD), timeframe, limit, before_time.
        """
        api_key = APIKeys.TIINGO_API_KEY
        if not api_key:
            logger.error("Tiingo API key is not configured")
            return []
            
        try:
            tiingo_symbol = self.SYMBOL_MAP.get(symbol)
            if not tiingo_symbol:
                tiingo_symbol = symbol.lower()

            resample_freq = self.TIMEFRAME_MAP.get(timeframe)
            aggregate_to_weekly = (timeframe == '1W')
            aggregate_to_monthly = (timeframe == '1M')
            original_limit = limit

            if aggregate_to_weekly or aggregate_to_monthly:
                resample_freq = '1day'
                max_limit = 100 if aggregate_to_weekly else 36
                original_limit = min(original_limit, max_limit)
                limit = original_limit * (7 if aggregate_to_weekly else 30)

            if not resample_freq:
                logger.warning(f"Tiingo does not support timeframe: {timeframe}")
                return []

            if timeframe == '1m':
                logger.info(f"Note: Tiingo 1-minute forex data requires a paid subscription")
            
            # 3. Time range
            if before_time:
                end_dt = datetime.fromtimestamp(before_time)
            else:
                end_dt = datetime.now()
            
            if aggregate_to_weekly or aggregate_to_monthly:
                tf_seconds = 86400
            else:
                tf_seconds = self._get_timeframe_seconds(timeframe)
            # 1.5x buffer (FX no weekend)
            start_dt = end_dt - timedelta(seconds=limit * tf_seconds * 1.5)
            
            max_days = 365 * 3
            if (end_dt - start_dt).days > max_days:
                start_dt = end_dt - timedelta(days=max_days)
                logger.info(f"Tiingo: Limited date range to {max_days} days")
            
            # YYYY-MM-DD for Tiingo
            start_date_str = start_dt.strftime('%Y-%m-%d')
            end_date_str = end_dt.strftime('%Y-%m-%d')
            
            # 4. API request (with retry)
            # URL: https://api.tiingo.com/tiingo/fx/{ticker}/prices
            url = f"{self.base_url}/fx/{tiingo_symbol}/prices"
            
            params = {
                'startDate': start_date_str,
                'endDate': end_date_str,
                'resampleFreq': resample_freq,
                'token': api_key,
                'format': 'json'
            }
            
            # logger.info(f"Tiingo Request: {url} params={params}")
            
            max_retries = 3
            retry_delay = 2
            response = None
            
            for attempt in range(max_retries):
                try:
                    response = requests.get(url, params=params, timeout=TiingoConfig.TIMEOUT)
                    
                    if response.status_code == 429:
                        # rate limit, wait and retry
                        wait_time = retry_delay * (attempt + 1)
                        logger.warning(f"Tiingo rate limit (429), waiting {wait_time}s before retry ({attempt + 1}/{max_retries})")
                        time.sleep(wait_time)
                        continue
                    
                    break
                    
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        logger.warning(f"Tiingo request timeout, retrying ({attempt + 1}/{max_retries})")
                        time.sleep(retry_delay)
                        continue
                    raise
            
            if response is None:
                logger.error("Tiingo API request failed after all retries")
                return []
            
            if response.status_code == 429:
                logger.error("Tiingo API rate limit exceeded. Please wait a moment before retrying.")
                return []
            
            if response.status_code == 403:
                logger.error("Tiingo API permission error (403): check whether your API key is valid and has access to this dataset.")
                return []
                 
            response.raise_for_status()
            data = response.json()
            
            # 5. Process response
            # Tiingo returns a list of dicts:
            # [
            #   {
            #     "date": "2023-01-01T00:00:00.000Z",
            #     "ticker": "eurusd",
            #     "open": 1.07,
            #     "high": 1.08,
            #     "low": 1.06,
            #     "close": 1.07
            #     "mid": ... (optional, depends on settings, usually OHLC are bid or mid)
            #   }, ...
            # ]
            # Note: Tiingo FX prices objects keys: date, open, high, low, close.
            
            if not isinstance(data, list):
                logger.warning(f"Tiingo response is not a list: {data}")
                return []
                
            klines = []
            for item in data:
                dt_str = item.get('date')
                if dt_str.endswith('Z'):
                    dt_str = dt_str[:-1] + '+00:00'

                dt = datetime.fromisoformat(dt_str)
                ts = int(dt.timestamp())

                klines.append({
                    'time': ts,
                    'open': float(item.get('open')),
                    'high': float(item.get('high')),
                    'low': float(item.get('low')),
                    'close': float(item.get('close')),
                    'volume': 0.0
                })

            klines.sort(key=lambda x: x['time'])

            if aggregate_to_weekly:
                klines = self._aggregate_to_weekly(klines)
                logger.debug(f"Aggregated {len(klines)} weekly candles from daily data")
            elif aggregate_to_monthly:
                klines = self._aggregate_to_monthly(klines)
                logger.debug(f"Aggregated {len(klines)} monthly candles from daily data")
            
            if len(klines) > original_limit:
                klines = klines[-original_limit:]
            
            # logger.info(f"Fetched {len(klines)} Tiingo forex bars")
            return klines
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Tiingo API request failed: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to process Tiingo data: {e}")
            return []
    
    def _aggregate_to_weekly(self, daily_klines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Aggregate daily klines to weekly."""
        if not daily_klines:
            return []

        weekly_klines = []
        current_week = None
        week_data = None

        for kline in daily_klines:
            dt = datetime.fromtimestamp(kline['time'])
            week_start = dt - timedelta(days=dt.weekday())
            week_key = week_start.strftime('%Y-%W')

            if week_key != current_week:
                if week_data:
                    weekly_klines.append(week_data)
                current_week = week_key
                week_data = {
                    'time': int(week_start.timestamp()),
                    'open': kline['open'],
                    'high': kline['high'],
                    'low': kline['low'],
                    'close': kline['close'],
                    'volume': kline['volume']
                }
            else:
                week_data['high'] = max(week_data['high'], kline['high'])
                week_data['low'] = min(week_data['low'], kline['low'])
                week_data['close'] = kline['close']
                week_data['volume'] += kline['volume']
        
        if week_data:
            weekly_klines.append(week_data)
        
        return weekly_klines
    
    def _aggregate_to_monthly(self, daily_klines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Aggregate daily klines to monthly."""
        if not daily_klines:
            return []

        monthly_klines = []
        current_month = None
        month_data = None

        for kline in daily_klines:
            dt = datetime.fromtimestamp(kline['time'])
            month_key = dt.strftime('%Y-%m')

            if month_key != current_month:
                if month_data:
                    monthly_klines.append(month_data)
                current_month = month_key
                month_start = dt.replace(day=1, hour=0, minute=0, second=0)
                month_data = {
                    'time': int(month_start.timestamp()),
                    'open': kline['open'],
                    'high': kline['high'],
                    'low': kline['low'],
                    'close': kline['close'],
                    'volume': kline['volume']
                }
            else:
                month_data['high'] = max(month_data['high'], kline['high'])
                month_data['low'] = min(month_data['low'], kline['low'])
                month_data['close'] = kline['close']
                month_data['volume'] += kline['volume']
        
        if month_data:
            monthly_klines.append(month_data)
        
        return monthly_klines
