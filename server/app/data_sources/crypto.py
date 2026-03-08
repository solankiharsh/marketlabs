"""
Crypto data source - uses CCXT (e.g. Coinbase) for data.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import ccxt

from app.data_sources.base import BaseDataSource, TIMEFRAME_SECONDS
from app.utils.logger import get_logger
from app.config import CCXTConfig, APIKeys

logger = get_logger(__name__)


class CryptoDataSource(BaseDataSource):
    """Crypto data source (CCXT)."""

    name = "Crypto/CCXT"

    TIMEFRAME_MAP = CCXTConfig.TIMEFRAME_MAP

    def __init__(self):
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
            logger.warning(f"CCXT exchange '{exchange_id}' not found, falling back to 'coinbase'")
            exchange_id = 'coinbase'
            
        exchange_class = getattr(ccxt, exchange_id)
        self.exchange = exchange_class(config)

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get latest ticker for a crypto symbol via CCXT.

        Accepts common formats:
        - BTC/USDT
        - BTCUSDT
        - BTC/USDT:USDT (swap-style suffix, will be normalized)
        """
        sym = (symbol or "").strip()
        if ":" in sym:
            sym = sym.split(":", 1)[0]
        sym = sym.upper()
        if "/" not in sym:
            # Coinbase often uses USD, check if we need to adapt
            if sym.endswith("USDT") and len(sym) > 4:
                sym = f"{sym[:-4]}/USDT"
            elif sym.endswith("USD") and len(sym) > 3:
                sym = f"{sym[:-3]}/USD"
        return self.exchange.fetch_ticker(sym)
    
    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get crypto kline data."""
        klines = []

        try:
            ccxt_timeframe = self.TIMEFRAME_MAP.get(timeframe, '1d')

            if not symbol.endswith('USDT') and not symbol.endswith('USD'):
                symbol_pair = f'{symbol}/USDT'
            else:
                symbol_pair = symbol
            
            # logger.info(f"Fetch crypto kline: {symbol_pair}, tf={ccxt_timeframe}, limit={limit}")
            
            ohlcv = self._fetch_ohlcv(symbol_pair, ccxt_timeframe, limit, before_time, timeframe)
            
            if not ohlcv:
                logger.warning(f"CCXT returned no K-lines: {symbol_pair}")
                return []
            
            for candle in ohlcv:
                if len(candle) < 6:
                    continue
                klines.append(self.format_kline(
                    timestamp=int(candle[0] / 1000),  # ms -> seconds
                    open_price=candle[1],
                    high=candle[2],
                    low=candle[3],
                    close=candle[4],
                    volume=candle[5]
                ))
            
            klines = self.filter_and_limit(klines, limit, before_time)
            self.log_result(symbol, klines, timeframe, market='Crypto')
            
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
        """Fetch OHLCV (supports pagination for full range)."""
        try:
            if before_time:
                total_seconds = self.calculate_time_range(timeframe, limit)
                end_time = datetime.fromtimestamp(before_time)
                start_time = end_time - timedelta(seconds=total_seconds)
                since = int(start_time.timestamp() * 1000)
                end_ms = before_time * 1000
                
                # logger.info(f"History request: since={since//1000}, end={before_time}, span={total_seconds/86400:.1f}d")
                
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
                    
                    last_timestamp = batch[-1][0]
                    # if last_timestamp >= end_ms or len(batch) < batch_limit:
                    if last_timestamp >= end_ms:
                        break
                    
                    timeframe_ms = TIMEFRAME_SECONDS.get(timeframe, 86400) * 1000
                    current_since = last_timestamp + timeframe_ms
                    
                    # logger.info(f"Paginating: {len(all_ohlcv)} so far, next from {datetime.fromtimestamp(current_since/1000)}")
                
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

