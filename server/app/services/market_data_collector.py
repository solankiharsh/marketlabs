"""
Market data collection service for AI analysis.

Design:
1. Data first - reliable data fetching
2. Unified source - reuse DataSourceFactory and kline_service
3. Reuse global market - macro/sentiment from global_market.py cache
4. Fast and stable - no slow external services (e.g. Jina Reader)

Data source mapping:
- Price/Kline: DataSourceFactory (aligned with kline module and watchlist)
- Macro: global_market.py (VIX, DXY, TNX, Fear&Greed, cached)
- News: Finnhub API (structured)
- Fundamental: Finnhub (US) / fixed descriptions (crypto)
"""

import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

import yfinance as yf

from app.data_sources import DataSourceFactory
from app.services.kline import KlineService
from app.utils.logger import get_logger
from app.config import APIKeys

logger = get_logger(__name__)


class MarketDataCollector:
    """
    Market data collector for AI analysis.

    Provides complete, accurate, timely market data. Layers:
    1. Core (required): price, kline
    2. Analysis: technical indicators, fundamental
    3. Macro (optional): global_market.py (VIX, DXY, TNX, Fear&Greed)
    4. Sentiment (optional): news, market sentiment
    """

    def __init__(self):
        self.kline_service = KlineService()
        self._finnhub_client = None
        self._ak = None
        self._init_clients()

    def _init_clients(self):
        """Initialize external API clients."""
        # Finnhub
        finnhub_key = APIKeys.FINNHUB_API_KEY
        if finnhub_key:
            try:
                import finnhub
                self._finnhub_client = finnhub.Client(api_key=finnhub_key)
            except Exception as e:
                logger.warning(f"Finnhub client init failed: {e}")
        
        # akshare (optional, for supplementary data)
        try:
            import akshare as ak
            self._ak = ak
        except ImportError:
            logger.info("akshare not installed")
    
    def collect_all(
        self,
        market: str,
        symbol: str,
        timeframe: str = "1D",
        include_macro: bool = True,
        include_news: bool = True,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Collect all market data.

        Args:
            market: Market type (USStock, Crypto, Forex, Futures)
            symbol: Symbol code
            timeframe: Kline period
            include_macro: Include macro data
            include_news: Include news
            timeout: Total timeout (seconds)

        Returns:
            Full market data dict.
        """
        start_time = time.time()

        data = {
            "market": market,
            "symbol": symbol,
            "timeframe": timeframe,
            "collected_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            # core
            "price": None,
            "kline": None,
            "indicators": {},
            # fundamental
            "fundamental": {},
            "company": {},
            # macro
            "macro": {},
            # sentiment
            "news": [],
            "sentiment": {},
            # meta
            "_meta": {
                "success_items": [],
                "failed_items": [],
                "duration_ms": 0
            }
        }

        # === Phase 1: core data (parallel) ===
        with ThreadPoolExecutor(max_workers=4) as executor:
            core_futures = {
                executor.submit(self._get_price, market, symbol): "price",
                executor.submit(self._get_kline, market, symbol, timeframe, 60): "kline",
            }
            
            # if fundamental needed, fetch in parallel
            if market == 'USStock':
                core_futures[executor.submit(self._get_fundamental, market, symbol)] = "fundamental"
                core_futures[executor.submit(self._get_company, market, symbol)] = "company"
            elif market == 'Crypto':
                # crypto "fundamental" is fixed description
                core_futures[executor.submit(self._get_crypto_info, symbol)] = "fundamental"
            
            try:
                for future in as_completed(core_futures, timeout=15):
                    key = core_futures[future]
                    try:
                        result = future.result(timeout=3)
                        if result:
                            data[key] = result
                            data["_meta"]["success_items"].append(key)
                        else:
                            data["_meta"]["failed_items"].append(key)
                    except Exception as e:
                        logger.warning(f"Core data fetch failed ({key}): {e}")
                        data["_meta"]["failed_items"].append(key)
            except TimeoutError:
                logger.warning(f"Core data fetch timed out for {market}:{symbol}")
        
        # compute indicators (local, no external API)
        if data.get("kline"):
            data["indicators"] = self._calculate_indicators(data["kline"])
            data["_meta"]["success_items"].append("indicators")
        
        # === Phase 2: macro (if needed) ===
        if include_macro:
            try:
                data["macro"] = self._get_macro_data(market, timeout=10)
                if data["macro"]:
                    data["_meta"]["success_items"].append("macro")
            except Exception as e:
                logger.warning(f"Macro data fetch failed: {e}")
                data["_meta"]["failed_items"].append("macro")
        
        # === Phase 3: news/sentiment (if needed) ===
        if include_news:
            try:
                # get company name for better search
                company_name = None
                if data.get("company"):
                    company_name = data["company"].get("name")
                
                news_result = self._get_news(market, symbol, company_name, timeout=8)
                data["news"] = news_result.get("news", [])
                data["sentiment"] = news_result.get("sentiment", {})
                
                if data["news"]:
                    data["_meta"]["success_items"].append("news")
            except Exception as e:
                logger.warning(f"News fetch failed: {e}")
                data["_meta"]["failed_items"].append("news")
        
        # log total duration
        data["_meta"]["duration_ms"] = int((time.time() - start_time) * 1000)
        logger.info(f"Market data collection completed for {market}:{symbol} in {data['_meta']['duration_ms']}ms")
        logger.info(f"  Success: {data['_meta']['success_items']}")
        logger.info(f"  Failed: {data['_meta']['failed_items']}")
        
        return data
    
    # ==================== Core data ====================

    def _get_price(self, market: str, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get real-time price via kline_service (aligned with watchlist).
        """
        try:
            price_data = self.kline_service.get_realtime_price(market, symbol, force_refresh=True)
            if price_data and price_data.get('price', 0) > 0:
                # safe cast to float, handle None
                def safe_float(val, default=0.0):
                    if val is None:
                        return default
                    try:
                        return float(val)
                    except (ValueError, TypeError):
                        return default
                
                price = safe_float(price_data.get('price'))
                return {
                    "price": price,
                    "change": safe_float(price_data.get('change')),
                    "changePercent": safe_float(price_data.get('changePercent')),
                    "high": safe_float(price_data.get('high'), price),
                    "low": safe_float(price_data.get('low'), price),
                    "open": safe_float(price_data.get('open'), price),
                    "previousClose": safe_float(price_data.get('previousClose'), price),
                    "source": price_data.get('source', 'unknown')
                }
        except Exception as e:
            logger.warning(f"Price fetch failed for {market}:{symbol}: {e}")
        
        # if kline_service fails, use last kline close
        try:
            klines = DataSourceFactory.get_kline(market, symbol, "1D", 2)
            if klines and len(klines) > 0:
                latest = klines[-1]
                price = float(latest.get('close', 0))
                if price > 0:
                    prev_close = float(klines[-2].get('close', price)) if len(klines) > 1 else price
                    change = price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close > 0 else 0
                    
                    logger.info(f"Price fetched from K-line fallback for {market}:{symbol}: ${price}")
                    return {
                        "price": price,
                        "change": round(change, 6),
                        "changePercent": round(change_pct, 2),
                        "high": float(latest.get('high', price)),
                        "low": float(latest.get('low', price)),
                        "open": float(latest.get('open', price)),
                        "previousClose": prev_close,
                        "source": "kline_fallback"
                    }
        except Exception as e:
            logger.warning(f"K-line fallback price fetch also failed for {market}:{symbol}: {e}")
        
        return None
    
    def _get_kline(
        self, market: str, symbol: str, timeframe: str, limit: int = 60
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get kline data via DataSourceFactory (aligned with kline module).
        """
        try:
            klines = DataSourceFactory.get_kline(market, symbol, timeframe, limit)
            if klines and len(klines) > 0:
                return klines
        except Exception as e:
            logger.warning(f"Kline fetch failed for {market}:{symbol}: {e}")
        return None
    
    def _calculate_indicators(self, klines: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compute technical indicators (local, no external deps).
        Return shape matches FastAnalysisReport.vue: rsi, macd, moving_averages, levels, volatility.
        """
        if not klines or len(klines) < 5:
            return {}
        
        try:
            closes = [float(k.get('close', 0)) for k in klines]
            highs = [float(k.get('high', 0)) for k in klines]
            lows = [float(k.get('low', 0)) for k in klines]
            volumes = [float(k.get('volume', 0)) for k in klines]
            
            if not closes:
                return {}
            
            current_price = closes[-1]
            indicators = {}
            
            # ========== RSI ==========
            if len(closes) >= 15:
                rsi_value = self._calc_rsi(closes, 14)
                if rsi_value < 30:
                    rsi_signal = "oversold"
                elif rsi_value > 70:
                    rsi_signal = "overbought"
                else:
                    rsi_signal = "neutral"
                indicators['rsi'] = {
                    'value': round(rsi_value, 2),
                    'signal': rsi_signal,
                }
            
            # ========== MACD ==========
            if len(closes) >= 26:
                macd_raw = self._calc_macd(closes)
                macd_val = macd_raw.get('MACD', 0)
                macd_sig = macd_raw.get('MACD_signal', 0)
                macd_hist = macd_raw.get('MACD_histogram', 0)
                
                if macd_val > macd_sig and macd_hist > 0:
                    macd_signal = "bullish"
                    macd_trend = "golden_cross" if macd_hist > 0 else "bullish"
                elif macd_val < macd_sig and macd_hist < 0:
                    macd_signal = "bearish"
                    macd_trend = "death_cross" if macd_hist < 0 else "bearish"
                else:
                    macd_signal = "neutral"
                    macd_trend = "consolidating"
                
                indicators['macd'] = {
                    'value': round(macd_val, 6),
                    'signal_line': round(macd_sig, 6),
                    'histogram': round(macd_hist, 6),
                    'signal': macd_signal,
                    'trend': macd_trend,
                }
            
            # ========== Moving averages ==========
            ma5 = sum(closes[-5:]) / 5 if len(closes) >= 5 else current_price
            ma10 = sum(closes[-10:]) / 10 if len(closes) >= 10 else current_price
            ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else current_price
            
            if current_price > ma5 > ma10 > ma20:
                ma_trend = "strong_uptrend"
            elif current_price > ma20:
                ma_trend = "uptrend"
            elif current_price < ma5 < ma10 < ma20:
                ma_trend = "strong_downtrend"
            elif current_price < ma20:
                ma_trend = "downtrend"
            else:
                ma_trend = "sideways"
            
            indicators['moving_averages'] = {
                'ma5': round(ma5, 6),
                'ma10': round(ma10, 6),
                'ma20': round(ma20, 6),
                'trend': ma_trend,
            }
            
            # ========== Support/Resistance (combined) ==========
            # Method 1: Pivot points (prior day)
            if len(klines) >= 2:
                prev_high = float(klines[-2].get('high', highs[-2]) if len(highs) >= 2 else current_price * 1.02)
                prev_low = float(klines[-2].get('low', lows[-2]) if len(lows) >= 2 else current_price * 0.98)
                prev_close = float(klines[-2].get('close', closes[-2]) if len(closes) >= 2 else current_price)
                
                pivot = (prev_high + prev_low + prev_close) / 3
                r1 = 2 * pivot - prev_low   # resistance 1
                s1 = 2 * pivot - prev_high  # support 1
                r2 = pivot + (prev_high - prev_low)   # resistance 2
                s2 = pivot - (prev_high - prev_low)   # support 2
            else:
                pivot = current_price
                r1 = r2 = current_price * 1.02
                s1 = s2 = current_price * 0.98
            
            # Method 2: recent high/low
            recent_highs = highs[-20:] if len(highs) >= 20 else highs
            recent_lows = lows[-20:] if len(lows) >= 20 else lows
            swing_high = max(recent_highs) if recent_highs else current_price * 1.05
            swing_low = min(recent_lows) if recent_lows else current_price * 0.95
            
            # Method 3: Bollinger mid band (if available)
            bb_upper = indicators.get('bollinger', {}).get('upper', swing_high)
            bb_lower = indicators.get('bollinger', {}).get('lower', swing_low)
            
            # Combined: average of methods
            resistance = round((r1 + swing_high + bb_upper) / 3, 6) if bb_upper else round((r1 + swing_high) / 2, 6)
            support = round((s1 + swing_low + bb_lower) / 3, 6) if bb_lower else round((s1 + swing_low) / 2, 6)
            
            indicators['levels'] = {
                'support': support,
                'resistance': resistance,
                'pivot': round(pivot, 6),
                's1': round(s1, 6),
                'r1': round(r1, 6),
                's2': round(s2, 6),
                'r2': round(r2, 6),
                'swing_high': round(swing_high, 6),
                'swing_low': round(swing_low, 6),
                'method': 'pivot_swing_bb_avg'
            }
            
            # ========== ATR and volatility ==========
            atr = 0
            if len(klines) >= 14:
                # True Range / ATR
                true_ranges = []
                for i in range(-14, 0):
                    h = float(klines[i].get('high', 0))
                    l = float(klines[i].get('low', 0))
                    prev_c = float(klines[i-1].get('close', 0)) if i > -14 else h
                    if h > 0 and l > 0:
                        tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
                        true_ranges.append(tr)
                
                atr = sum(true_ranges) / len(true_ranges) if true_ranges else 0
                volatility_pct = (atr / current_price * 100) if current_price > 0 else 0
                
                if volatility_pct > 5:
                    volatility_level = "high"
                elif volatility_pct > 2:
                    volatility_level = "medium"
                else:
                    volatility_level = "low"
            else:
                volatility_level = "unknown"
                volatility_pct = 0
            
            indicators['volatility'] = {
                'level': volatility_level,
                'pct': round(volatility_pct, 2),
                'atr': round(atr, 6),
            }
            
            # ========== Stop/target suggestion (ATR + S/R) ==========
            # Stop: 2x ATR or support, whichever is more conservative
            atr_stop_loss = current_price - (2 * atr) if atr > 0 else current_price * 0.95
            support_stop = indicators['levels']['support']
            suggested_stop_loss = max(atr_stop_loss, support_stop * 0.99)

            # Target: 3x ATR or resistance, risk/reward aware
            atr_take_profit = current_price + (3 * atr) if atr > 0 else current_price * 1.05
            resistance_tp = indicators['levels']['resistance']
            suggested_take_profit = min(atr_take_profit, resistance_tp * 1.01)

            # Risk/reward ratio
            risk = current_price - suggested_stop_loss
            reward = suggested_take_profit - current_price
            risk_reward_ratio = round(reward / risk, 2) if risk > 0 else 0
            
            indicators['trading_levels'] = {
                'suggested_stop_loss': round(suggested_stop_loss, 6),
                'suggested_take_profit': round(suggested_take_profit, 6),
                'risk_reward_ratio': risk_reward_ratio,
                'atr_multiplier_sl': 2.0,
                'atr_multiplier_tp': 3.0,
                'method': 'atr_support_resistance'
            }
            
            # ========== Bollinger (optional) ==========
            if len(closes) >= 20:
                bb_data = self._calc_bollinger(closes, 20, 2)
                indicators['bollinger'] = bb_data
            
            # ========== Volume (optional) ==========
            if len(volumes) >= 20:
                avg_vol = sum(volumes[-20:]) / 20
                indicators['volume_ratio'] = round(volumes[-1] / avg_vol, 2) if avg_vol > 0 else 1.0
            
            # ========== Price position (optional) ==========
            if len(closes) >= 20:
                high_20 = max(highs[-20:])
                low_20 = min(lows[-20:])
                if high_20 > low_20:
                    indicators['price_position'] = round((current_price - low_20) / (high_20 - low_20) * 100, 1)
                else:
                    indicators['price_position'] = 50.0
            
            # ========== Overall trend (optional) ==========
            indicators['trend'] = ma_trend
            indicators['current_price'] = round(current_price, 6)
            
            return indicators
            
        except Exception as e:
            logger.warning(f"Indicator calculation failed: {e}")
            return {}
    
    def _calc_rsi(self, closes: List[float], period: int = 14) -> float:
        """Compute RSI."""
        if len(closes) < period + 1:
            return 50.0
        
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)
    
    def _calc_macd(self, closes: List[float]) -> Dict[str, float]:
        """Compute MACD."""
        def ema(data, period):
            multiplier = 2 / (period + 1)
            ema_values = [data[0]]
            for i in range(1, len(data)):
                ema_values.append((data[i] - ema_values[-1]) * multiplier + ema_values[-1])
            return ema_values
        
        ema12 = ema(closes, 12)
        ema26 = ema(closes, 26)
        
        macd_line = [ema12[i] - ema26[i] for i in range(len(closes))]
        signal_line = ema(macd_line, 9)
        histogram = [macd_line[i] - signal_line[i] for i in range(len(closes))]
        
        return {
            'MACD': round(macd_line[-1], 4),
            'MACD_signal': round(signal_line[-1], 4),
            'MACD_histogram': round(histogram[-1], 4)
        }
    
    def _calc_bollinger(self, closes: List[float], period: int = 20, std_dev: int = 2) -> Dict[str, float]:
        """Compute Bollinger Bands."""
        if len(closes) < period:
            return {}
        
        recent = closes[-period:]
        middle = sum(recent) / period
        
        variance = sum((x - middle) ** 2 for x in recent) / period
        std = variance ** 0.5
        
        return {
            'BB_upper': round(middle + std_dev * std, 4),
            'BB_middle': round(middle, 4),
            'BB_lower': round(middle - std_dev * std, 4),
            'BB_width': round((std_dev * std * 2) / middle * 100, 2) if middle > 0 else 0
        }
    
    # ==================== Fundamental ====================

    def _get_fundamental(self, market: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get fundamental data."""
        try:
            if market == 'USStock':
                return self._get_us_fundamental(symbol)
        except Exception as e:
            logger.warning(f"Fundamental data fetch failed for {market}:{symbol}: {e}")
        return None
    
    def _get_us_fundamental(self, symbol: str) -> Optional[Dict[str, Any]]:
        """US fundamental - Finnhub + yfinance."""
        result = {}
        
        # Finnhub
        if self._finnhub_client:
            try:
                metrics = self._finnhub_client.company_basic_financials(symbol, 'all')
                if metrics and metrics.get('metric'):
                    m = metrics['metric']
                    result.update({
                        'pe_ratio': m.get('peBasicExclExtraTTM'),
                        'pb_ratio': m.get('pbQuarterly'),
                        'ps_ratio': m.get('psTTM'),
                        'market_cap': m.get('marketCapitalization'),
                        'dividend_yield': m.get('dividendYieldIndicatedAnnual'),
                        'beta': m.get('beta'),
                        '52w_high': m.get('52WeekHigh'),
                        '52w_low': m.get('52WeekLow'),
                        'roe': m.get('roeTTM'),
                        'eps': m.get('epsBasicExclExtraItemsTTM'),
                        'revenue_growth': m.get('revenueGrowthTTMYoy'),
                    })
            except Exception as e:
                logger.debug(f"Finnhub fundamental failed for {symbol}: {e}")
        
        # yfinance fallback
        if not result:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info or {}
                result.update({
                    'pe_ratio': info.get('trailingPE') or info.get('forwardPE'),
                    'pb_ratio': info.get('priceToBook'),
                    'market_cap': info.get('marketCap'),
                    'dividend_yield': info.get('dividendYield'),
                    'beta': info.get('beta'),
                    '52w_high': info.get('fiftyTwoWeekHigh'),
                    '52w_low': info.get('fiftyTwoWeekLow'),
                    'roe': info.get('returnOnEquity'),
                    'eps': info.get('trailingEps'),
                })
            except Exception as e:
                logger.debug(f"yfinance fundamental failed for {symbol}: {e}")
        
        return result if result else None
    
    def _get_crypto_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Crypto info (fixed descriptions)."""
        crypto_info = {
            'BTC': {
                'name': 'Bitcoin',
                'description': 'Digital gold, largest crypto by market cap; store of value and hedge asset.',
                'category': 'Store of Value',
            },
            'ETH': {
                'name': 'Ethereum',
                'description': 'Smart contract platform; base for DeFi and NFT ecosystems.',
                'category': 'Smart Contract Platform',
            },
            'BNB': {
                'name': 'Binance Coin',
                'description': 'Binance exchange platform token.',
                'category': 'Exchange Token',
            },
            'SOL': {
                'name': 'Solana',
                'description': 'High-performance chain, high TPS and low gas.',
                'category': 'Smart Contract Platform',
            },
            'XRP': {
                'name': 'Ripple',
                'description': 'Cross-border payment solutions.',
                'category': 'Payment',
            },
            'DOGE': {
                'name': 'Dogecoin',
                'description': 'Meme coin, community-driven.',
                'category': 'Meme',
            },
        }

        base = symbol.split('/')[0] if '/' in symbol else symbol
        base = base.upper()

        if base in crypto_info:
            return crypto_info[base]

        return {
            'name': base,
            'description': f'{base} is a cryptocurrency.',
            'category': 'Unknown',
        }
    
    def _get_company(self, market: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get company info."""
        try:
            if market == 'USStock' and self._finnhub_client:
                profile = self._finnhub_client.company_profile2(symbol=symbol)
                if profile:
                    return {
                        'name': profile.get('name'),
                        'industry': profile.get('finnhubIndustry'),
                        'country': profile.get('country'),
                        'exchange': profile.get('exchange'),
                        'ipo_date': profile.get('ipo'),
                        'market_cap': profile.get('marketCapitalization'),
                        'website': profile.get('weburl'),
                    }
            
        except Exception as e:
            logger.debug(f"Company info fetch failed for {market}:{symbol}: {e}")
        
        return None
    
    # ==================== Macro (reuse global_market) ====================

    def _get_macro_data(self, market: str, timeout: int = 10) -> Dict[str, Any]:
        """
        Get macro data from global_market.py (cached).
        Same data as global finance page; reuses 30s/5min cache.
        """
        try:
            from app.routes.global_market import (
                _fetch_vix, _fetch_dollar_index, _fetch_yield_curve,
                _fetch_fear_greed_index,
                _get_cached, _set_cached
            )
            
            result = {}

            MACRO_CACHE_TTL = 21600  # 6 hours
            cached_sentiment = _get_cached("market_sentiment", MACRO_CACHE_TTL)
            if cached_sentiment:
                logger.info("Using cached sentiment data from global_market (6h cache)")
                if cached_sentiment.get('vix'):
                    vix = cached_sentiment['vix']
                    result['VIX'] = {
                        'name': 'VIX Fear Index',
                        'description': vix.get('interpretation', ''),
                        'price': vix.get('value', 0),
                        'change': vix.get('change', 0),
                        'changePercent': vix.get('change', 0),
                        'level': vix.get('level', 'unknown'),
                    }
                
                if cached_sentiment.get('dxy'):
                    dxy = cached_sentiment['dxy']
                    result['DXY'] = {
                        'name': 'US Dollar Index',
                        'description': dxy.get('interpretation', ''),
                        'price': dxy.get('value', 0),
                        'change': dxy.get('change', 0),
                        'changePercent': dxy.get('change', 0),
                        'level': dxy.get('level', 'unknown'),
                    }
                
                if cached_sentiment.get('yield_curve'):
                    yc = cached_sentiment['yield_curve']
                    result['TNX'] = {
                        'name': 'US 10Y Treasury Yield',
                        'description': yc.get('interpretation', ''),
                        'price': yc.get('yield_10y', 0),
                        'change': yc.get('change', 0),
                        'changePercent': 0,
                        'spread': yc.get('spread', 0),
                        'level': yc.get('level', 'unknown'),
                    }
                
                if cached_sentiment.get('fear_greed'):
                    fg = cached_sentiment['fear_greed']
                    result['FEAR_GREED'] = {
                        'name': 'Fear & Greed Index',
                        'description': fg.get('classification', 'Neutral'),
                        'price': fg.get('value', 50),
                        'change': 0,
                        'changePercent': 0,
                    }
                
                if result:
                    return result
            
            # 2) If no cache, fetch in parallel
            logger.info("Fetching macro data from global_market functions")

            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {
                    executor.submit(_fetch_vix): "VIX",
                    executor.submit(_fetch_dollar_index): "DXY",
                    executor.submit(_fetch_yield_curve): "TNX",
                    executor.submit(_fetch_fear_greed_index): "FEAR_GREED",
                }
                
                try:
                    for future in as_completed(futures, timeout=timeout):
                        key = futures[future]
                        try:
                            data = future.result(timeout=5)
                            if data:
                                if key == 'VIX':
                                    result[key] = {
                                        'name': 'VIX Fear Index',
                                        'description': data.get('interpretation', ''),
                                        'price': data.get('value', 0),
                                        'change': data.get('change', 0),
                                        'changePercent': data.get('change', 0),
                                        'level': data.get('level', 'unknown'),
                                    }
                                elif key == 'DXY':
                                    result[key] = {
                                        'name': 'US Dollar Index',
                                        'description': data.get('interpretation', ''),
                                        'price': data.get('value', 0),
                                        'change': data.get('change', 0),
                                        'changePercent': data.get('change', 0),
                                        'level': data.get('level', 'unknown'),
                                    }
                                elif key == 'TNX':
                                    result[key] = {
                                        'name': 'US 10Y Treasury Yield',
                                        'description': data.get('interpretation', ''),
                                        'price': data.get('yield_10y', 0),
                                        'change': data.get('change', 0),
                                        'changePercent': 0,
                                        'spread': data.get('spread', 0),
                                        'level': data.get('level', 'unknown'),
                                    }
                                elif key == 'FEAR_GREED':
                                    result[key] = {
                                        'name': 'Fear & Greed Index',
                                        'description': data.get('classification', 'Neutral'),
                                        'price': data.get('value', 50),
                                        'change': 0,
                                        'changePercent': 0,
                                    }
                        except Exception as e:
                            logger.debug(f"Macro indicator {key} fetch failed: {e}")
                except TimeoutError:
                    logger.warning("Macro data fetch timed out")
            
            # Gold/commodities not fetched here; if analyzing gold, price is in _get_price
            pass
            
            return result
            
        except ImportError as e:
            logger.warning(f"Could not import from global_market: {e}")
            return {}
        except Exception as e:
            logger.error(f"_get_macro_data failed: {e}")
            return {}
    
    # ==================== News / sentiment ====================

    def _get_news(
        self, market: str, symbol: str, company_name: str = None, timeout: int = 8
    ) -> Dict[str, Any]:
        """
        Get news and sentiment. Priority: 1) Finnhub (US), 2) search (Bocha/Tavily), 3) Finnhub social sentiment.
        """
        news_list = []
        sentiment = {}

        # === 1) Finnhub news ===
        if self._finnhub_client:
            try:
                end_date = datetime.now().strftime('%Y-%m-%d')
                start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
                
                raw_news = []
                
                if market == 'USStock':
                    raw_news = self._finnhub_client.company_news(symbol, _from=start_date, to=end_date)
                elif market == 'Crypto':
                    raw_news = self._finnhub_client.general_news('crypto', min_id=0)
                else:
                    raw_news = self._finnhub_client.general_news('general', min_id=0)
                
                if raw_news:
                    for item in raw_news[:10]:
                        if not item.get('headline'):
                            continue
                        news_list.append({
                            "datetime": datetime.fromtimestamp(item.get('datetime', 0)).strftime('%Y-%m-%d %H:%M'),
                            "headline": item.get('headline', ''),
                            "summary": item.get('summary', '')[:300] if item.get('summary') else '',
                            "source": item.get('source', 'Finnhub'),
                            "url": item.get('url', ''),
                            "sentiment": item.get('sentiment', 'neutral'),
                        })
                    logger.info(f"Finnhub news fetched: {len(news_list)} items")
            except Exception as e:
                logger.debug(f"Finnhub news fetch failed: {e}")
        
        # === 2) Finnhub social sentiment (US) ===
        if self._finnhub_client and market == 'USStock':
            try:
                social = self._finnhub_client.stock_social_sentiment(symbol)
                if social:
                    sentiment['reddit'] = social.get('reddit', {})
                    sentiment['twitter'] = social.get('twitter', {})
            except Exception as e:
                logger.debug(f"Finnhub sentiment fetch failed: {e}")
        
        # === 3) Search fallback if few news ===
        if len(news_list) < 5:
            search_news = self._get_news_from_search(market, symbol, company_name)
            news_list.extend(search_news)
        
        # Dedupe by title
        seen_titles = set()
        unique_news = []
        for item in news_list:
            title = item.get('headline', '')
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_news.append(item)
        
        # Sort by time
        unique_news.sort(key=lambda x: x.get('datetime', ''), reverse=True)
        
        return {
            "news": unique_news[:15],
            "sentiment": sentiment,
        }
    
    def _get_news_from_search(
        self, market: str, symbol: str, company_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get news from search (Bocha/Tavily/SerpAPI).
        """
        news_list = []

        try:
            from app.services.search import get_search_service
            search_service = get_search_service()

            if not search_service.is_available:
                return news_list

            search_name = company_name or symbol

            response = search_service.search_stock_news(
                stock_code=symbol,
                stock_name=search_name,
                market=market,
                max_results=5
            )
            
            if response.success and response.results:
                for result in response.results:
                    news_list.append({
                        "datetime": result.published_date or datetime.now().strftime('%Y-%m-%d'),
                        "headline": result.title,
                        "summary": result.snippet[:200] if result.snippet else '',
                        "source": f"Search:{result.source}",
                        "url": result.url,
                        "sentiment": result.sentiment,
                    })
                logger.info(f"Search news added: {len(news_list)} (provider: {response.provider})")
        except Exception as e:
            logger.debug(f"Search news fetch failed: {e}")
        
        return news_list


# Singleton
_collector: Optional[MarketDataCollector] = None

def get_market_data_collector() -> MarketDataCollector:
    """Get market data collector singleton."""
    global _collector
    if _collector is None:
        _collector = MarketDataCollector()
    return _collector
