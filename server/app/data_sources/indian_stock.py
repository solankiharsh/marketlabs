"""
Indian stock data source - uses yfinance with .NS (NSE) and .BO (BSE) suffixes.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import time

import yfinance as yf

from app.data_sources.base import BaseDataSource
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IndianStockDataSource(BaseDataSource):
    """Indian stock (NSE/BSE) data source via yfinance."""

    name = "IndianStock/yfinance"

    INTERVAL_MAP = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1H': '1h',
        '4H': '4h',
        '1D': '1d',
        '1W': '1wk'
    }

    DAYS_MAP = {
        '1m': lambda limit: min(7, max(1, (limit // 390) + 2)),
        '5m': lambda limit: min(60, max(1, (limit // 78) + 2)),
        '15m': lambda limit: min(60, max(1, (limit // 26) + 2)),
        '30m': lambda limit: min(60, max(1, (limit // 13) + 2)),
        '1H': lambda limit: min(730, max(1, (limit // 6) + 2)),
        '4H': lambda limit: min(730, max(1, (limit // 6) + 2)),
        '1D': lambda limit: min(3650, limit + 1),
        '1W': lambda limit: min(3650, (limit * 7) + 7)
    }

    def _to_yf_symbol(self, symbol: str) -> str:
        """
        Convert plain Indian symbol to yfinance format.

        - If already has .NS or .BO suffix, keep it.
        - Index symbols starting with ^ are kept as-is.
        - Otherwise append .NS (NSE is default).
        """
        symbol = (symbol or '').strip().upper()
        if symbol.startswith('^'):
            return symbol
        if symbol.endswith('.NS') or symbol.endswith('.BO'):
            return symbol
        return f"{symbol}.NS"

    def _get_ticker_for_yf_symbol(self, yf_symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch quote for a single yfinance symbol (.NS or .BO). Returns None if no data."""
        try:
            ticker = yf.Ticker(yf_symbol)
            try:
                fast_info = ticker.fast_info
                last_price = fast_info.get('lastPrice') or fast_info.get('last_price')
                prev_close = (
                    fast_info.get('previousClose')
                    or fast_info.get('previous_close')
                    or fast_info.get('regularMarketPreviousClose')
                )
                if last_price:
                    change = (last_price - prev_close) if prev_close else 0
                    change_pct = (change / prev_close * 100) if prev_close else 0
                    return {
                        'last': float(last_price),
                        'change': round(change, 4),
                        'changePercent': round(change_pct, 2),
                        'high': float(fast_info.get('dayHigh') or fast_info.get('day_high') or last_price),
                        'low': float(fast_info.get('dayLow') or fast_info.get('day_low') or last_price),
                        'open': float(fast_info.get('open') or fast_info.get('regularMarketOpen') or last_price),
                        'previousClose': float(prev_close) if prev_close else 0
                    }
            except Exception as e:
                logger.debug(f"yfinance fast_info failed for {yf_symbol}: {e}")

            try:
                info = ticker.info
                last_price = info.get('regularMarketPrice') or info.get('currentPrice')
                prev_close = info.get('regularMarketPreviousClose') or info.get('previousClose')
                if last_price:
                    change = (last_price - prev_close) if prev_close else 0
                    change_pct = (change / prev_close * 100) if prev_close else 0
                    return {
                        'last': float(last_price),
                        'change': round(change, 4),
                        'changePercent': round(change_pct, 2),
                        'high': float(info.get('regularMarketDayHigh') or info.get('dayHigh') or last_price),
                        'low': float(info.get('regularMarketDayLow') or info.get('dayLow') or last_price),
                        'open': float(info.get('regularMarketOpen') or info.get('open') or last_price),
                        'previousClose': float(prev_close) if prev_close else 0
                    }
            except Exception as e:
                logger.debug(f"yfinance info failed for {yf_symbol}: {e}")

            try:
                hist = ticker.history(period='1d', interval='1m')
                if hist is not None and not hist.empty:
                    last_row = hist.iloc[-1]
                    first_row = hist.iloc[0]
                    last_price = float(last_row['Close'])
                    open_price = float(first_row['Open'])
                    return {
                        'last': last_price,
                        'change': round(last_price - open_price, 4),
                        'changePercent': round((last_price - open_price) / open_price * 100, 2) if open_price else 0,
                        'high': float(hist['High'].max()),
                        'low': float(hist['Low'].min()),
                        'open': open_price,
                        'previousClose': open_price
                    }
            except Exception as e:
                logger.debug(f"yfinance history fallback failed for {yf_symbol}: {e}")
        except Exception as e:
            logger.debug(f"Failed to get ticker for {yf_symbol}: {e}")
        return None

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get Indian stock real-time quote via yfinance. Tries BSE (.BO) if NSE (.NS) has no data."""
        yf_symbol = self._to_yf_symbol(symbol)
        result = self._get_ticker_for_yf_symbol(yf_symbol)
        if result is not None:
            return result
        # Fallback to BSE when NSE returns no data (e.g. Yahoo 404 for some .NS symbols)
        if yf_symbol.endswith('.NS'):
            bse_symbol = yf_symbol[:-3] + '.BO'
            result = self._get_ticker_for_yf_symbol(bse_symbol)
            if result is not None:
                logger.debug(f"Using BSE fallback for {symbol}: {bse_symbol}")
                return result
        return {'last': 0, 'symbol': symbol}

    def get_kline(
        self,
        symbol: str,
        timeframe: str,
        limit: int,
        before_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get Indian stock kline data."""
        klines = []
        yf_symbol = self._to_yf_symbol(symbol)

        try:
            interval = self.INTERVAL_MAP.get(timeframe, '1d')
            days_func = self.DAYS_MAP.get(timeframe, lambda x: x + 1)
            days = days_func(limit)

            if before_time:
                end_date = datetime.fromtimestamp(before_time)
                start_date = end_date - timedelta(days=days)
            else:
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days)

            df = self._fetch_yfinance(yf_symbol, interval, start_date, end_date)

            if df is not None and not df.empty:
                klines = self._convert_dataframe(df, limit)

            klines = self.filter_and_limit(klines, limit, before_time)
            self.log_result(symbol, klines, timeframe, market='IndianStock')

        except Exception as e:
            logger.error(f"Failed to fetch Indian stock K-lines {yf_symbol}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

        return klines

    def _fetch_yfinance(self, yf_symbol: str, interval: str, start_date: datetime, end_date: datetime, max_retries: int = 2):
        """Fetch via yfinance with retry on transient failures."""
        end_date_inclusive = end_date + timedelta(days=1)
        for attempt in range(max_retries + 1):
            try:
                ticker = yf.Ticker(yf_symbol)
                df = ticker.history(
                    start=start_date.strftime('%Y-%m-%d'),
                    end=end_date_inclusive.strftime('%Y-%m-%d'),
                    interval=interval
                )
                if df is not None and not df.empty:
                    return df
                if attempt < max_retries:
                    logger.debug(f"yfinance returned empty for {yf_symbol}, retry {attempt + 1}")
                    time.sleep(1)
            except Exception as e:
                if attempt < max_retries:
                    logger.debug(f"yfinance error for {yf_symbol}: {e}, retry {attempt + 1}")
                    time.sleep(1)
                else:
                    logger.warning(f"yfinance fetch failed after {max_retries + 1} attempts: {e}")
                    return None
        return None

    def _convert_dataframe(self, df, limit: int) -> List[Dict[str, Any]]:
        """Convert DataFrame to kline list."""
        klines = []
        df = df.tail(limit).reset_index()

        time_col = None
        if 'Datetime' in df.columns:
            time_col = 'Datetime'
        elif 'Date' in df.columns:
            time_col = 'Date'
        elif 'index' in df.columns:
            time_col = 'index'

        if time_col is None:
            logger.warning(f"Unable to determine time column; available columns: {df.columns.tolist()}")
            return klines

        for _, row in df.iterrows():
            try:
                time_value = row[time_col]
                if hasattr(time_value, 'timestamp'):
                    ts = int(time_value.timestamp())
                else:
                    continue

                klines.append(self.format_kline(
                    timestamp=ts,
                    open_price=row['Open'],
                    high=row['High'],
                    low=row['Low'],
                    close=row['Close'],
                    volume=row['Volume']
                ))
            except Exception as e:
                logger.debug(f"Failed to parse row data: {e}")
                continue

        return klines
