"""
Futures data source.
Supports:
1. Crypto futures (Binance Futures via CCXT)
2. Traditional futures (Yahoo Finance)
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import ccxt
import yfinance as yf

from app.data_sources.base import BaseDataSource, TIMEFRAME_SECONDS
from app.utils.logger import get_logger
from app.config import CCXTConfig, APIKeys

logger = get_logger(__name__)


class FuturesDataSource(BaseDataSource):
    """Futures data source."""

    name = "Futures"

    # Yahoo Finance timeframe mapping
    YF_TIMEFRAME_MAP = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1H': '1h',
        '4H': '4h',
        '1D': '1d',
        '1W': '1wk'
    }

    # CCXT timeframe mapping
    CCXT_TIMEFRAME_MAP = CCXTConfig.TIMEFRAME_MAP

    # Traditional futures symbols (Yahoo Finance)
    YF_SYMBOLS = {
        'GC': 'GC=F',   # Gold
        'SI': 'SI=F',   # Silver
        'CL': 'CL=F',   # Crude oil
        'NG': 'NG=F',   # Natural gas
        'ZC': 'ZC=F',   # Corn
        'ZW': 'ZW=F',   # Wheat
    }

    def __init__(self):
        config = {
            'timeout': CCXTConfig.TIMEOUT,
            'enableRateLimit': CCXTConfig.ENABLE_RATE_LIMIT,
            'options': {
                'defaultType': 'future'
            }
        }

        if CCXTConfig.PROXY:
            config['proxies'] = {
                'http': CCXTConfig.PROXY,
                'https': CCXTConfig.PROXY
            }

        self.exchange = ccxt.binance(config)

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get latest ticker for futures symbol.

        - For crypto futures, uses CCXT Binance futures client.
        - For traditional futures (Yahoo Finance symbols), returns a minimal ticker shape with `last`.
        """
        sym = (symbol or "").strip()
        if sym in self.YF_SYMBOLS or sym.endswith("=F"):
            try:
                yf_symbol = self.YF_SYMBOLS.get(sym, sym)
                if not yf_symbol.endswith("=F"):
                    yf_symbol = yf_symbol + "=F"
                t = yf.Ticker(yf_symbol)
                last = None
                try:
                    last = getattr(t, "fast_info", {}).get("last_price")
                except Exception:
                    last = None
                if last is None:
                    hist = t.history(period="2d", interval="1d")
                    if hist is not None and not hist.empty:
                        last = float(hist["Close"].iloc[-1])
                return {"symbol": yf_symbol, "last": float(last or 0.0)}
            except Exception:
                return {"symbol": sym, "last": 0.0}

        if ":" in sym:
            sym = sym.split(":", 1)[0]
        sym = sym.upper()
        if "/" not in sym:
            if sym.endswith("USDT") and len(sym) > 4:
                sym = f"{sym[:-4]}/USDT"
            elif sym.endswith("USD") and len(sym) > 3:
                sym = f"{sym[:-3]}/USD"
        return self.exchange.fetch_ticker(sym)

    def _get_timeframe_seconds(self, timeframe: str) -> int:
        """Get seconds for the given timeframe."""
        return TIMEFRAME_SECONDS.get(timeframe, 86400)

    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get futures K-line data.

        Args:
            symbol: Futures contract symbol
            timeframe: Time period
            limit: Number of candles
            before_time: End timestamp
        """
        if symbol in self.YF_SYMBOLS or symbol.endswith('=F'):
            return self._get_traditional_futures(symbol, timeframe, limit, before_time)
        else:
            return self._get_crypto_futures(symbol, timeframe, limit, before_time)

    def _get_traditional_futures(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Fetch traditional futures via yfinance."""
        try:
            yf_symbol = self.YF_SYMBOLS.get(symbol, symbol)
            if not yf_symbol.endswith('=F'):
                yf_symbol = symbol + '=F'

            yf_interval = self.YF_TIMEFRAME_MAP.get(timeframe, '1d')

            if before_time:
                end_time = datetime.fromtimestamp(before_time)
            else:
                end_time = datetime.now()

            tf_seconds = self._get_timeframe_seconds(timeframe)
            start_time = end_time - timedelta(seconds=tf_seconds * limit * 1.5)
            end_time_inclusive = end_time + timedelta(days=1)

            ticker = yf.Ticker(yf_symbol)
            df = ticker.history(
                start=start_time,
                end=end_time_inclusive,
                interval=yf_interval
            )

            if df.empty:
                logger.warning(f"No data: {yf_symbol}")
                return []

            klines = []
            for index, row in df.iterrows():
                klines.append({
                    'time': int(index.timestamp()),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': float(row['Volume'])
                })

            klines.sort(key=lambda x: x['time'])
            if len(klines) > limit:
                klines = klines[-limit:]

            return klines

        except Exception as e:
            logger.error(f"Failed to fetch traditional futures data: {e}")
            return []

    def _get_crypto_futures(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Fetch crypto futures via CCXT."""
        try:
            ccxt_symbol = symbol if '/' in symbol else f"{symbol}/USDT"
            ccxt_timeframe = self.CCXT_TIMEFRAME_MAP.get(timeframe, '1d')

            if before_time:
                since_time = before_time - limit * self._get_timeframe_seconds(timeframe)
                ohlcv = self.exchange.fetch_ohlcv(
                    ccxt_symbol,
                    ccxt_timeframe,
                    since=since_time * 1000,
                    limit=limit
                )
            else:
                ohlcv = self.exchange.fetch_ohlcv(
                    ccxt_symbol,
                    ccxt_timeframe,
                    limit=limit
                )

            klines = []
            for candle in ohlcv:
                klines.append({
                    'time': int(candle[0] / 1000),
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': float(candle[5])
                })

            return klines

        except Exception as e:
            logger.error(f"Failed to fetch crypto futures data: {e}")
            return []
