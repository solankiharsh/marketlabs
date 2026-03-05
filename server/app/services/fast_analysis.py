"""
Fast Analysis Service 3.0
Uses unified MarketDataCollector.

Improvements:
1. Unified data source (MarketDataCollector, aligned with K-line and watchlist)
2. Macro data: DXY, VIX, rates, etc.
3. Structured news API
4. Single LLM call with constrained prompt for structured output
"""
import json
import time
from typing import Dict, Any, Optional, List
from decimal import Decimal, ROUND_HALF_UP

from app.utils.logger import get_logger
from app.services.llm import LLMService
from app.services.market_data_collector import get_market_data_collector

logger = get_logger(__name__)


def _replace_placeholder_reasons_risks(analysis: Dict, conflicts: List[str], is_buy_conflict: bool = True) -> None:
    """Replace 'Unable to analyze' / 'Analysis error' placeholders with meaningful text when forcing HOLD."""
    key_reasons = analysis.get("key_reasons") or []
    risks = analysis.get("risks") or []
    if not key_reasons or key_reasons == ["Unable to analyze"] or (len(key_reasons) == 1 and "Unable to analyze" in str(key_reasons[0])):
        analysis["key_reasons"] = [
            "Objective score suggested " + ("BUY" if is_buy_conflict else "SELL") + " but technical indicators conflict.",
            "Conflicts: " + "; ".join(conflicts) + ". Recommend HOLD until clearer setup.",
        ]
    if not risks or risks == ["Analysis error"] or (len(risks) == 1 and "Analysis error" in str(risks[0])):
        analysis["risks"] = [
            "Technical conflict: " + "; ".join(conflicts) + ". Wait for clearer signals."
        ]


class FastAnalysisService:
    """
    Fast Analysis Service 3.0
    1. Data layer: MarketDataCollector
    2. Analysis: single LLM call (constrained prompt)
    3. Memory: analysis history storage and retrieval
    """
    
    def __init__(self):
        self.llm_service = LLMService()
        self.data_collector = get_market_data_collector()
        self._memory_db = None  # Lazy init
    
    # ==================== Data Collection Layer ====================
    
    def _collect_market_data(self, market: str, symbol: str, timeframe: str = "1D") -> Dict[str, Any]:
        """
        Collect market data via unified collector.
        Layers: core (price, K-line, indicators), fundamental, macro, news, prediction markets.
        """
        return self.data_collector.collect_all(
            market=market,
            symbol=symbol,
            timeframe=timeframe,
            include_macro=True,
            include_news=True,
            include_polymarket=True,
            timeout=45
        )
    
    def _calculate_indicators(self, kline_data: List[Dict]) -> Dict[str, Any]:
        """
        Calculate technical indicators using rules (no LLM).
        Returns actionable signals, not raw numbers.
        """
        if not kline_data or len(kline_data) < 5:
            return {"error": "Insufficient data"}
        
        try:
            # Use tools' built-in calculation
            raw_indicators = self.tools.calculate_technical_indicators(kline_data)
            
            # Extract key values
            closes = [float(k.get("close", 0)) for k in kline_data if k.get("close")]
            if not closes:
                return {"error": "No close prices"}
            
            current_price = closes[-1]
            
            # RSI interpretation
            rsi = raw_indicators.get("RSI", 50)
            if rsi < 30:
                rsi_signal = "oversold"
                rsi_action = "potential_buy"
            elif rsi > 70:
                rsi_signal = "overbought"
                rsi_action = "potential_sell"
            else:
                rsi_signal = "neutral"
                rsi_action = "hold"
            
            # MACD interpretation
            macd = raw_indicators.get("MACD", 0)
            macd_signal_line = raw_indicators.get("MACD_Signal", 0)
            macd_hist = raw_indicators.get("MACD_Hist", 0)
            
            if macd > macd_signal_line and macd_hist > 0:
                macd_signal = "bullish"
                macd_trend = "golden_cross" if macd_hist > 0 and len(kline_data) > 1 else "bullish"
            elif macd < macd_signal_line and macd_hist < 0:
                macd_signal = "bearish"
                macd_trend = "death_cross" if macd_hist < 0 and len(kline_data) > 1 else "bearish"
            else:
                macd_signal = "neutral"
                macd_trend = "consolidating"
            
            # Moving averages
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
            
            # Support/Resistance (simple: recent highs/lows)
            recent_highs = [float(k.get("high", 0)) for k in kline_data[-14:] if k.get("high")]
            recent_lows = [float(k.get("low", 0)) for k in kline_data[-14:] if k.get("low")]
            
            resistance = max(recent_highs) if recent_highs else current_price * 1.05
            support = min(recent_lows) if recent_lows else current_price * 0.95
            
            # Volatility (ATR-like)
            if len(kline_data) >= 14:
                ranges = []
                for k in kline_data[-14:]:
                    h = float(k.get("high", 0))
                    l = float(k.get("low", 0))
                    if h > 0 and l > 0:
                        ranges.append(h - l)
                atr = sum(ranges) / len(ranges) if ranges else 0
                volatility_pct = (atr / current_price * 100) if current_price > 0 else 0
                
                if volatility_pct > 5:
                    volatility = "high"
                elif volatility_pct > 2:
                    volatility = "medium"
                else:
                    volatility = "low"
            else:
                volatility = "unknown"
                volatility_pct = 0
            
            return {
                "current_price": round(current_price, 6),
                "rsi": {
                    "value": round(rsi, 2),
                    "signal": rsi_signal,
                    "action": rsi_action,
                },
                "macd": {
                    "value": round(macd, 6),
                    "signal_line": round(macd_signal_line, 6),
                    "histogram": round(macd_hist, 6),
                    "signal": macd_signal,
                    "trend": macd_trend,
                },
                "moving_averages": {
                    "ma5": round(ma5, 6),
                    "ma10": round(ma10, 6),
                    "ma20": round(ma20, 6),
                    "trend": ma_trend,
                },
                "levels": {
                    "support": round(support, 6),
                    "resistance": round(resistance, 6),
                },
                "volatility": {
                    "level": volatility,
                    "pct": round(volatility_pct, 2),
                },
                "raw": raw_indicators,
            }
        except Exception as e:
            logger.error(f"Indicator calculation failed: {e}")
            return {"error": str(e)}
    
    def _format_news_summary(self, news_data: List[Dict], max_items: int = 5) -> str:
        """Format news into a concise summary for the prompt."""
        if not news_data:
            return "No recent news available."
        
        summaries = []
        for item in news_data[:max_items]:
            title = item.get("title", item.get("headline", ""))
            sentiment = item.get("sentiment", "neutral")
            date = item.get("date", item.get("datetime", ""))[:10] if item.get("date") or item.get("datetime") else ""
            
            if title:
                summaries.append(f"- [{sentiment}] {title} ({date})")
        
        return "\n".join(summaries) if summaries else "No recent news available."
    
    def _format_polymarket_summary(self, polymarket_events: List[Dict], max_items: int = 3) -> str:
        """Format prediction market events into a concise summary for the prompt."""
        if not polymarket_events:
            return "No related prediction market events found."
        
        summaries = []
        for event in polymarket_events[:max_items]:
            question = event.get('question', '')
            prob = event.get('current_probability', 50.0)
            summaries.append(f"- {question[:80]}: Market probability {prob:.1f}%")
        
        return "\n".join(summaries) if summaries else "No related prediction market events found."
    
    # ==================== Memory Layer ====================
    
    def _get_memory_context(self, market: str, symbol: str, current_indicators: Dict) -> str:
        """
        Retrieve relevant historical analysis for similar market conditions.
        """
        try:
            from app.services.analysis_memory import get_analysis_memory
            memory = get_analysis_memory()
            
            # Get similar patterns
            patterns = memory.get_similar_patterns(market, symbol, current_indicators, limit=3)
            
            if not patterns:
                return "No similar historical patterns found in memory."
            
            context_lines = ["Historical patterns with similar conditions:"]
            for p in patterns:
                outcome = ""
                if p.get("was_correct") is not None:
                    outcome = f" (Outcome: {'Correct' if p['was_correct'] else 'Incorrect'}"
                    if p.get("actual_return_pct"):
                        outcome += f", Return: {p['actual_return_pct']:.2f}%"
                    outcome += ")"
                
                context_lines.append(
                    f"- Decision: {p['decision']} at ${p.get('price', 'N/A')}{outcome}"
                )
            
            return "\n".join(context_lines)
            
        except Exception as e:
            logger.warning(f"Memory retrieval failed: {e}")
            return "Memory retrieval failed."
    
    # ==================== Prompt Engineering ====================
    
    def _build_analysis_prompt(self, data: Dict[str, Any], language: str) -> tuple:
        """
        Build the single, comprehensive analysis prompt.
        Key: Strong constraints to prevent absurd recommendations.
        """
        price_data = data.get("price") or {}
        current_price = price_data.get("price", 0) if price_data else 0
        change_24h = price_data.get("changePercent", 0) if price_data else 0
        
        # Ensure all data fields have safe defaults (may be None from failed fetches)
        indicators = data.get("indicators") or {}
        fundamental = data.get("fundamental") or {}
        company = data.get("company") or {}
        news_summary = self._format_news_summary(data.get("news") or [])
        polymarket_events = data.get("polymarket") or []
        
        # Language instruction - MUST be enforced strictly
        lang_map = {
            'zh-CN': '⚠️ IMPORTANT: You MUST answer ALL content in Simplified Chinese, including summary, key_reasons, risks, and all text fields. Do NOT use English.',
            'zh-TW': '⚠️ IMPORTANT: You MUST answer ALL content in Traditional Chinese, including summary, key_reasons, risks, and all text fields. Do NOT use English.',
            'en-US': '⚠️ IMPORTANT: You MUST answer ALL content in English, including summary, key_reasons, risks, and all text fields. Do NOT use Chinese.',
            'ja-JP': '⚠️ IMPORTANT: Answer all content in Japanese, including summary, key_reasons, risks, and all text fields.',
        }
        lang_instruction = lang_map.get(language, '⚠️ IMPORTANT: Answer ALL content in English.')
        
        # Get pre-calculated trading levels from technical analysis
        levels = indicators.get("levels", {})
        trading_levels = indicators.get("trading_levels", {})
        volatility = indicators.get("volatility", {})
        
        support = levels.get("support", current_price * 0.95)
        resistance = levels.get("resistance", current_price * 1.05)
        pivot = levels.get("pivot", current_price)
        
        # Use ATR-based suggestions if available, otherwise use percentage
        atr = volatility.get("atr", current_price * 0.02)
        suggested_stop_loss = trading_levels.get("suggested_stop_loss", current_price - 2 * atr)
        suggested_take_profit = trading_levels.get("suggested_take_profit", current_price + 3 * atr)
        risk_reward_ratio = trading_levels.get("risk_reward_ratio", 1.5)
        
        # Price bounds (still enforce max 10% deviation)
        if current_price > 0:
            price_lower_bound = round(max(suggested_stop_loss, current_price * 0.90), 6)
            price_upper_bound = round(min(suggested_take_profit, current_price * 1.10), 6)
            entry_range_low = round(current_price * 0.98, 6)
            entry_range_high = round(current_price * 1.02, 6)
        else:
            price_lower_bound = price_upper_bound = entry_range_low = entry_range_high = 0
        
        # Get technical indicator values for decision constraints
        rsi_value = indicators.get("rsi", {}).get("value", 50)
        macd_signal = indicators.get("macd", {}).get("signal", "neutral")
        ma_trend = indicators.get("moving_averages", {}).get("trend", "sideways")
        
        # Build decision guidance based on technical indicators
        decision_guidance = self._build_decision_guidance(rsi_value, macd_signal, ma_trend, change_24h, language)
        
        system_prompt = f"""You are Zing's Senior Financial Analyst with 20+ years of experience. 
You are CONSERVATIVE and OBJECTIVE. Your analysis must be based on DATA, not speculation.

{lang_instruction}

🎯 CRITICAL DECISION RULES (MUST FOLLOW):
1. **Market Context**: This market supports BOTH long (BUY) and short (SELL) positions. SELL signals are VALID trading opportunities, not just risk warnings.
2. **Multi-Factor Analysis** (IMPORTANT - Consider ALL factors):
   - **Technical Indicators** (RSI, MACD, MA trends): Provide baseline direction
   - **Macro Environment** (DXY, VIX, interest rates, geopolitical events): Can override technical signals
   - **Breaking News & Events**: Major news can cause sudden reversals - pay attention!
   - **Fundamental Data**: Valuation, growth, financial health matter for medium/long-term
   - **Market Sentiment**: News sentiment, fear/greed index, market mood
3. **Decision Priority** (When factors conflict):
   - **Major macro events** (war, policy changes, major economic data) > Technical indicators
   - **Breaking news** (regulatory changes, major partnerships, scandals) > Short-term technical
   - **Technical indicators** > General news sentiment (when no major events)
   - **Fundamental data** > Short-term price movements (for long-term decisions)
4. **Balance Your Decisions** (IMPORTANT - Give SELL signals when appropriate):
   - BUY: When technical indicators show oversold (RSI < 40), bullish MACD, uptrend, OR strong macro/fundamental catalyst
   - SELL: When technical indicators show overbought (RSI > 60), bearish MACD, downtrend, OR major negative macro/news event
   - HOLD: Only when signals are truly mixed or unclear - DO NOT default to HOLD just because you're uncertain
   - **Remember**: SELL is a valid trading signal for short positions, not just a warning to avoid buying
5. **Confidence Thresholds**:
   - BUY requires confidence >= 60 AND (technical support OR macro/fundamental catalyst)
   - SELL requires confidence >= 60 AND (technical support OR negative event) - SELL signals are encouraged when indicators suggest downside
   - HOLD only when confidence < 60 AND signals are truly unclear
6. **Identify Trading Opportunities**:
   - When RSI > 60, MACD bearish, downtrend: Consider SELL (short position opportunity)
   - When RSI < 40, MACD bullish, uptrend: Consider BUY (long position opportunity)
   - Do NOT default to HOLD when clear technical signals exist
7. **Consider Macro Impact**: 
   - Strong USD (DXY ↑) usually negative for crypto/commodities → Consider SELL
   - High VIX (>30) indicates fear → Consider SELL or HOLD, avoid BUY
   - Rising interest rates usually negative for growth assets → Consider SELL
   - Geopolitical tensions can cause sudden volatility → Consider SELL if risk-off sentiment

{decision_guidance}

📐 TECHNICAL LEVELS (Pre-calculated from chart data):
- Support: ${support} | Resistance: ${resistance} | Pivot: ${pivot}
- ATR (14-day): ${atr:.4f} ({volatility.get('pct', 0)}% volatility)
- Suggested Stop Loss: ${suggested_stop_loss:.4f} (based on 2x ATR below support)
- Suggested Take Profit: ${suggested_take_profit:.4f} (based on 3x ATR above resistance)
- Risk/Reward Ratio: {risk_reward_ratio}

⚠️ CRITICAL PRICE RULES:
1. Current price: ${current_price}
2. Your stop_loss MUST be near ${suggested_stop_loss:.4f} (range: ${price_lower_bound:.4f} ~ ${current_price})
3. Your take_profit MUST be near ${suggested_take_profit:.4f} (range: ${current_price} ~ ${price_upper_bound:.4f})
4. Entry price: ${entry_range_low:.4f} ~ ${entry_range_high:.4f}
5. These levels are based on ATR and support/resistance analysis - use them as reference!

📊 YOUR ANALYSIS MUST INCLUDE (ALL factors are important):
1. **Technical Analysis**: Objectively interpret RSI, MACD, MA, support/resistance. Be honest about conflicting signals.
2. **Macro Environment Analysis**: 
   - Analyze DXY, VIX, interest rates impact on the asset
   - Consider geopolitical events and their potential impact
   - Evaluate how macro trends affect this specific market/symbol
3. **News & Event Analysis**: 
   - **CRITICAL**: Pay special attention to GEOPOLITICAL EVENTS (wars, conflicts, military actions, sanctions)
   - These events can cause sudden and severe market movements, especially for crypto and global markets
   - Identify BREAKING NEWS or major events that could cause sudden moves
   - Assess news sentiment and its credibility
   - Consider regulatory changes, partnerships, scandals, geopolitical tensions, etc.
   - **DO NOT ignore major geopolitical news** (e.g., US-Iran conflict, Russia-Ukraine war) even if technical indicators look good
   - Global events like wars can override all technical analysis - treat them as HIGHEST PRIORITY
4. **Prediction Market Analysis**:
   - Review related prediction market events and their current probabilities
   - Prediction markets reflect collective market wisdom and can indicate future price movements
   - If prediction markets show high probability for bullish events (e.g., "BTC reaches $100k"), consider this as a positive signal
   - If prediction markets show high probability for bearish events, consider this as a risk factor
   - Use prediction market probabilities as a sentiment indicator alongside technical analysis
5. **Fundamental Analysis**: Evaluate valuation, growth, competitive position if data available. If data is insufficient, say so.
6. **Risk Assessment**: 
   - Explain why the stop loss level is appropriate
   - List ALL significant risks (technical, macro, news, fundamental)
   - Consider tail risks from unexpected events
7. **Clear Recommendation**: BUY/SELL/HOLD with entry, stop loss (near suggested), take profit (near suggested)
   - **BUY**: For long positions when indicators suggest upside
   - **SELL**: For short positions when indicators suggest downside - this is a VALID trading opportunity
   - **HOLD**: Only when signals are truly unclear - DO NOT default to HOLD just to be safe
   - Your decision should reflect the WEIGHTED importance of ALL factors
   - If macro/news factors strongly contradict technical, explain why you prioritize one over the other
8. **Trading Opportunity Recognition**:
   - When you see RSI > 60, bearish MACD, downtrend → Give SELL signal (short opportunity)
   - When you see RSI < 40, bullish MACD, uptrend → Give BUY signal (long opportunity)
   - Only choose HOLD when signals are genuinely mixed or unclear

Output ONLY valid JSON (do NOT include word counts or format hints in your actual response):
{{
  "decision": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "summary": "Executive summary in 2-3 sentences - be honest about uncertainty if present",
  "analysis": {{
    "technical": "Your detailed technical analysis here - interpret RSI, MACD, MA, support/resistance objectively",
    "fundamental": "Your fundamental assessment here - valuation, growth, competitive position. If data is limited, state that clearly.",
    "sentiment": "Your market sentiment analysis here - news impact, macro factors, mood. Don't overreact."
  }},
  "entry_price": number,
  "stop_loss": number,
  "take_profit": number,
  "position_size_pct": 1-100,
  "timeframe": "short" | "medium" | "long",
  "key_reasons": ["First key reason for this decision", "Second key reason", "Third key reason"],
  "risks": ["Primary risk with potential impact", "Secondary risk"],
  "technical_score": 0-100,
  "fundamental_score": 0-100,
  "sentiment_score": 0-100
}}

⚠️ IMPORTANT: 
- The analysis fields should contain your ACTUAL analysis text, NOT the format description above.
- Be HONEST and CONSERVATIVE. If you're not confident, choose HOLD with lower confidence.
- Do NOT make up facts or exaggerate. Base everything on the provided data.

📊 OBJECTIVE SCORING SYSTEM (Reference):
The system will calculate an objective score based on technical indicators, fundamentals, sentiment (including geopolitical events), and macro factors.
- Score >= +20: Bullish signal → BUY recommended
- Score <= -20: Bearish signal → SELL recommended  
- Score between -20 and +20: Neutral → HOLD recommended (narrow range)
- Score >= +70: Strong bullish → Strong BUY signal
- Score <= -70: Strong bearish → Strong SELL signal
- Geopolitical events (wars, conflicts) are heavily weighted in sentiment score and can cause severe negative scores
- Macro factors (VIX, DXY, interest rates) are also heavily weighted
Your decision should align with this objective score when it's significant (>=20 or <=-20).
When the score is neutral (-20 to +20), you can use your judgment, but still consider giving BUY/SELL if technical indicators are clear."""

        # Format indicator data for prompt (ensure safe defaults)
        rsi_data = indicators.get("rsi") or {}
        macd_data = indicators.get("macd") or {}
        ma_data = indicators.get("moving_averages") or {}
        vol_data = indicators.get("volatility") or {}
        levels = indicators.get("levels") or {}
        
        # Format macro data
        macro = data.get("macro") or {}
        macro_summary = self._format_macro_summary(macro, data.get("market", ""), language)
        
        user_prompt = f"""Analyze {data['symbol']} in {data['market']} market.

📊 REAL-TIME DATA:
- Current Price: ${current_price}
- 24h Change: {change_24h}%
- Support: ${support}
- Resistance: ${resistance}

📈 TECHNICAL INDICATORS:
- RSI(14): {rsi_data.get('value', 'N/A')} ({rsi_data.get('signal', 'N/A')})
- MACD: {macd_data.get('signal', 'N/A')} ({macd_data.get('trend', 'N/A')})
- MA Trend: {ma_data.get('trend', 'N/A')}
- Volatility: {vol_data.get('level', 'N/A')} ({vol_data.get('pct', 0)}%)
- Trend: {indicators.get('trend', 'N/A')}
- Price Position (20d): {indicators.get('price_position', 'N/A')}%

🌐 MACRO ENVIRONMENT:
{macro_summary}

📰 MARKET NEWS ({len(data.get('news') or [])} items):
{news_summary}

🎯 PREDICTION MARKETS ({len(polymarket_events)} related events):
{self._format_polymarket_summary(polymarket_events)}

💼 FUNDAMENTALS:
- Company: {company.get('name', data['symbol'])}
- Industry: {company.get('industry', 'N/A')}
- P/E Ratio: {fundamental.get('pe_ratio', 'N/A')}
- P/B Ratio: {fundamental.get('pb_ratio', 'N/A')}
- Market Cap: {fundamental.get('market_cap', 'N/A')}
- 52W High/Low: {fundamental.get('52w_high', 'N/A')} / {fundamental.get('52w_low', 'N/A')}
- ROE: {fundamental.get('roe', 'N/A')}
- Revenue Growth: {fundamental.get('revenue_growth', 'N/A')}
- Profit Margin: {fundamental.get('profit_margin', 'N/A')}
- Debt to Equity: {fundamental.get('debt_to_equity', 'N/A')}
- Current Ratio: {fundamental.get('current_ratio', 'N/A')}
- Free Cash Flow: {fundamental.get('free_cash_flow', 'N/A')}

📊 FINANCIAL STATEMENTS (Latest Quarter):
{self._format_financial_statements(fundamental.get('financial_statements', {}), language)}

📈 EARNINGS DATA:
{self._format_earnings_data(fundamental.get('earnings', {}), language)}

IMPORTANT: 
1. **CRITICAL**: Check for GEOPOLITICAL EVENTS (wars, conflicts, military actions) in the news section. These events have HIGHEST PRIORITY and can override all technical indicators.
2. Consider the macro environment (especially DXY, VIX, rates, geopolitical events) when making your recommendation.
3. Pay attention to BREAKING NEWS and international events that could cause sudden market moves. Geopolitical tensions (e.g., US-Iran conflict) can cause severe market volatility.
4. For US stocks, analyze financial statements and earnings trends to assess company health.
5. If you see news about wars, conflicts, or major geopolitical events, you MUST mention them in your analysis and adjust your recommendation accordingly.
6. Provide your analysis now. Remember: all prices must be within 10% of ${current_price}."""

        return system_prompt, user_prompt
    
    def _format_financial_statements(self, statements: Dict[str, Any], language: str = 'en-US') -> str:
        """Format financial statements data for prompt"""
        labels = {
            'en-US': {
                'no_data': 'Financial statements data not available',
                'balance_sheet': 'Balance Sheet',
                'total_assets': 'Total Assets',
                'total_liabilities': 'Total Liabilities',
                'total_equity': 'Shareholders Equity',
                'cash': 'Cash',
                'debt': 'Total Debt',
                'current_ratio': 'Current Ratio',
                'income_statement': 'Income Statement',
                'total_revenue': 'Total Revenue',
                'gross_profit': 'Gross Profit',
                'operating_income': 'Operating Income',
                'net_income': 'Net Income',
                'eps': 'EPS',
                'cash_flow': 'Cash Flow Statement',
                'operating_cash_flow': 'Operating Cash Flow',
                'free_cash_flow': 'Free Cash Flow'
            },
            'zh-CN': {
                'no_data': 'Financial statement data temporarily unavailable',
                'balance_sheet': 'Balance Sheet',
                'total_assets': 'Total Assets',
                'total_liabilities': 'Total Liabilities',
                'total_equity': 'Shareholders\' Equity',
                'cash': 'Cash',
                'debt': 'Total Debt',
                'current_ratio': 'Current Ratio',
                'income_statement': 'Income Statement',
                'total_revenue': 'Total Revenue',
                'gross_profit': 'Gross Profit',
                'operating_income': 'Operating Income',
                'net_income': 'Net Income',
                'eps': 'EPS',
                'cash_flow': 'Cash Flow Statement',
                'operating_cash_flow': 'Operating Cash Flow',
                'free_cash_flow': 'Free Cash Flow'
            }
        }
        
        lang = labels.get(language, labels['en-US'])
        
        if not statements:
            return lang['no_data']
        
        lines = []
        
        if 'balance_sheet' in statements:
            bs = statements['balance_sheet']
            lines.append(f"{lang['balance_sheet']}:")
            if bs.get('total_assets'):
                lines.append(f"  - {lang['total_assets']}: ${bs['total_assets']:,.0f}")
            if bs.get('total_liabilities'):
                lines.append(f"  - {lang['total_liabilities']}: ${bs['total_liabilities']:,.0f}")
            if bs.get('total_equity'):
                lines.append(f"  - {lang['total_equity']}: ${bs['total_equity']:,.0f}")
            if bs.get('cash'):
                lines.append(f"  - {lang['cash']}: ${bs['cash']:,.0f}")
            if bs.get('debt'):
                lines.append(f"  - {lang['debt']}: ${bs['debt']:,.0f}")
            if bs.get('current_assets') and bs.get('current_liabilities'):
                current_ratio = bs['current_assets'] / bs['current_liabilities'] if bs['current_liabilities'] > 0 else 0
                lines.append(f"  - {lang['current_ratio']}: {current_ratio:.2f}")
        
        if 'income_statement' in statements:
            is_stmt = statements['income_statement']
            lines.append(f"{lang['income_statement']}:")
            if is_stmt.get('total_revenue'):
                lines.append(f"  - {lang['total_revenue']}: ${is_stmt['total_revenue']:,.0f}")
            if is_stmt.get('gross_profit'):
                lines.append(f"  - {lang['gross_profit']}: ${is_stmt['gross_profit']:,.0f}")
            if is_stmt.get('operating_income'):
                lines.append(f"  - {lang['operating_income']}: ${is_stmt['operating_income']:,.0f}")
            if is_stmt.get('net_income'):
                lines.append(f"  - {lang['net_income']}: ${is_stmt['net_income']:,.0f}")
            if is_stmt.get('eps'):
                lines.append(f"  - {lang['eps']}: ${is_stmt['eps']:.2f}")
        
        if 'cash_flow' in statements:
            cf = statements['cash_flow']
            lines.append(f"{lang['cash_flow']}:")
            if cf.get('operating_cash_flow'):
                lines.append(f"  - {lang['operating_cash_flow']}: ${cf['operating_cash_flow']:,.0f}")
            if cf.get('free_cash_flow'):
                lines.append(f"  - {lang['free_cash_flow']}: ${cf['free_cash_flow']:,.0f}")
        
        return "\n".join(lines) if lines else lang['no_data']
    
    def _format_earnings_data(self, earnings: Dict[str, Any], language: str = 'en-US') -> str:
        """Format earnings data for prompt"""
        labels = {
            'en-US': {
                'no_data': 'Earnings data not available',
                'history': 'Earnings History',
                'actual': 'Actual',
                'estimate': 'Estimate',
                'surprise': 'Surprise',
                'next_report': 'Next Earnings Report',
                'eps_estimate': 'EPS Estimate',
                'revenue_estimate': 'Revenue Estimate',
                'latest_quarter': 'Latest Quarter',
                'revenue': 'Revenue',
                'earnings': 'Earnings'
            },
            'zh-CN': {
                'no_data': 'Earnings data temporarily unavailable',
                'history': 'Earnings History',
                'actual': 'Actual',
                'estimate': 'Estimate',
                'surprise': 'Surprise',
                'next_report': 'Next Earnings Report',
                'eps_estimate': 'EPS Estimate',
                'revenue_estimate': 'Revenue Estimate',
                'latest_quarter': 'Latest Quarter',
                'revenue': 'Revenue',
                'earnings': 'Earnings'
            }
        }
        
        lang = labels.get(language, labels['en-US'])
        
        if not earnings:
            return lang['no_data']
        
        lines = []
        
        if 'history' in earnings and earnings['history']:
            lines.append(f"{lang['history']}:")
            for i, hist in enumerate(earnings['history'][:4], 1):
                date = hist.get('date', 'N/A')
                eps_actual = hist.get('eps_actual')
                eps_estimate = hist.get('eps_estimate')
                surprise = hist.get('surprise')
                
                if eps_actual is not None:
                    line = f"  {i}. {date}: EPS {lang['actual']}={eps_actual:.2f}"
                    if eps_estimate is not None:
                        line += f", {lang['estimate']}={eps_estimate:.2f}"
                    if surprise is not None:
                        surprise_str = f"{surprise:+.1f}%"
                        line += f", {lang['surprise']}={surprise_str}"
                    lines.append(line)
        
        if 'upcoming' in earnings:
            upcoming = earnings['upcoming']
            if upcoming.get('next_earnings_date'):
                lines.append(f"{lang['next_report']}: {upcoming['next_earnings_date']}")
                if upcoming.get('eps_estimate'):
                    lines.append(f"  - {lang['eps_estimate']}: ${upcoming['eps_estimate']:.2f}")
                if upcoming.get('revenue_estimate'):
                    lines.append(f"  - {lang['revenue_estimate']}: ${upcoming['revenue_estimate']:,.0f}")
        
        if 'quarterly' in earnings:
            q = earnings['quarterly']
            if q.get('latest_quarter'):
                lines.append(f"{lang['latest_quarter']} ({q['latest_quarter']}):")
                if q.get('revenue'):
                    lines.append(f"  - {lang['revenue']}: ${q['revenue']:,.0f}")
                if q.get('earnings'):
                    lines.append(f"  - {lang['earnings']}: ${q['earnings']:,.0f}")
        
        return "\n".join(lines) if lines else lang['no_data']
    
    def _format_macro_summary(self, macro: Dict[str, Any], market: str, language: str = 'en-US') -> str:
        """Format macro data summary"""
        labels = {
            'en-US': {
                'no_data': 'Macro data not available',
                'usd_up': 'USD strength',
                'usd_down': 'USD weakness',
                'bearish_crypto': 'bearish for crypto',
                'bullish_crypto': 'bullish for crypto',
                'impacts_forex': 'directly impacts forex',
                'extreme_fear': 'Extreme Fear (>30)',
                'high_fear': 'High Fear (20-30)',
                'normal': 'Normal (15-20)',
                'low_vol': 'Low Volatility (<15)',
                'high_rates': 'High rate environment, negative for valuations',
                'risk_indicator': 'risk appetite indicator'
            },
            'zh-CN': {
                'no_data': 'Macro data not available',
                'usd_up': 'USD strength',
                'usd_down': 'USD weakness',
                'bearish_crypto': 'bearish for crypto',
                'bullish_crypto': 'bullish for crypto',
                'impacts_forex': 'directly impacts forex',
                'extreme_fear': 'Extreme Fear (>30)',
                'high_fear': 'High Fear (20-30)',
                'normal': 'Normal (15-20)',
                'low_vol': 'Low Volatility (<15)',
                'high_rates': 'High rate environment, negative for valuations',
                'risk_indicator': 'risk appetite indicator'
            }
        }
        
        lang = labels.get(language, labels['en-US'])
        
        if not macro:
            return lang['no_data']
        
        lines = []
        
        if 'DXY' in macro:
            dxy = macro['DXY']
            direction = "↑" if dxy.get('change', 0) > 0 else "↓"
            lines.append(f"- {dxy.get('name', 'USD Index')}: {dxy.get('price', 'N/A')} ({direction}{abs(dxy.get('changePercent', 0)):.2f}%)")
            if market == 'Crypto':
                impact = lang['bearish_crypto'] if dxy.get('change', 0) > 0 else lang['bullish_crypto']
                usd_dir = lang['usd_up'] if dxy.get('change', 0) > 0 else lang['usd_down']
                lines.append(f"  ⚠️ {usd_dir} {impact}")
            elif market == 'Forex':
                usd_dir = lang['usd_up'] if dxy.get('change', 0) > 0 else lang['usd_down']
                lines.append(f"  ⚠️ {usd_dir} {lang['impacts_forex']}")
        
        if 'VIX' in macro:
            vix = macro['VIX']
            vix_value = vix.get('price', 0)
            if vix_value > 30:
                level = lang['extreme_fear']
            elif vix_value > 20:
                level = lang['high_fear']
            elif vix_value > 15:
                level = lang['normal']
            else:
                level = lang['low_vol']
            lines.append(f"- {vix.get('name', 'VIX')}: {vix_value:.2f} - {level}")
        
        if 'TNX' in macro:
            tnx = macro['TNX']
            direction = "↑" if tnx.get('change', 0) > 0 else "↓"
            lines.append(f"- {tnx.get('name', '10Y Treasury')}: {tnx.get('price', 'N/A'):.3f}% ({direction})")
            if tnx.get('price', 0) > 4.5:
                lines.append(f"  ⚠️ {lang['high_rates']}")
        
        if 'GOLD' in macro:
            gold = macro['GOLD']
            direction = "↑" if gold.get('change', 0) > 0 else "↓"
            lines.append(f"- {gold.get('name', 'Gold')}: ${gold.get('price', 'N/A'):.2f} ({direction}{abs(gold.get('changePercent', 0)):.2f}%)")
        
        if 'SPY' in macro:
            spy = macro['SPY']
            direction = "↑" if spy.get('change', 0) > 0 else "↓"
            lines.append(f"- {spy.get('name', 'S&P 500')}: ${spy.get('price', 'N/A'):.2f} ({direction}{abs(spy.get('changePercent', 0)):.2f}%)")
        
        if 'BTC' in macro and market != 'Crypto':
            btc = macro['BTC']
            direction = "↑" if btc.get('change', 0) > 0 else "↓"
            lines.append(f"- {btc.get('name', 'BTC')}: ${btc.get('price', 'N/A'):,.0f} ({direction}{abs(btc.get('changePercent', 0)):.2f}%) [{lang['risk_indicator']}]")
        
        return "\n".join(lines) if lines else lang['no_data']
    
    # ==================== Main Analysis ====================
    
    def analyze(self, market: str, symbol: str, language: str = 'en-US', 
                model: str = None, timeframe: str = "1D", user_id: int = None) -> Dict[str, Any]:
        """
        Run fast single-call analysis.
        
        Args:
            market: Market type (Crypto, USStock, etc.)
            symbol: Trading pair or stock symbol
            language: Response language (zh-CN or en-US)
            model: LLM model to use
            timeframe: Analysis timeframe (1D, 4H, etc.)
            user_id: User ID for storing analysis history
        
        Returns:
            Complete analysis result with actionable recommendations.
        """
        start_time = time.time()
        
        # Get default model if not specified
        if not model:
            model = self.llm_service.get_default_model()
            logger.debug(f"Using default model: {model}")
        
        result = {
            "market": market,
            "symbol": symbol,
            "language": language,
            "model": model,  # Include model in result from the start
            "timeframe": timeframe,
            "analysis_time_ms": 0,
            "error": None,
        }
        
        try:
            # Phase 1: Data collection (parallel)
            logger.info(f"Fast analysis starting: {market}:{symbol}")
            data = self._collect_market_data(market, symbol, timeframe)
            
            # Validate we have essential data - with fallback to indicators
            current_price = None
            
            # Prefer price from price data
            if data.get("price") and data["price"].get("price"):
                current_price = data["price"]["price"]

            # Fallback: from indicators if K-line computed
            if not current_price and data.get("indicators"):
                current_price = data["indicators"].get("current_price")
                if current_price:
                    logger.info(f"Using price from indicators: ${current_price}")
                    # Build minimal price data
                    data["price"] = {
                        "price": current_price,
                        "change": 0,
                        "changePercent": 0,
                        "source": "indicators_fallback"
                    }
            
            # Fallback: from last kline
            if not current_price and data.get("kline"):
                klines = data["kline"]
                if klines and len(klines) > 0:
                    current_price = float(klines[-1].get("close", 0))
                    if current_price > 0:
                        logger.info(f"Using price from kline: ${current_price}")
                        prev_close = float(klines[-2].get("close", current_price)) if len(klines) > 1 else current_price
                        change = current_price - prev_close
                        change_pct = (change / prev_close * 100) if prev_close > 0 else 0
                        data["price"] = {
                            "price": current_price,
                            "change": round(change, 6),
                            "changePercent": round(change_pct, 2),
                            "source": "kline_fallback"
                        }
            
            if not current_price or current_price <= 0:
                result["error"] = "Failed to fetch current price from all sources"
                logger.error(f"Price fetch failed for {market}:{symbol}, all sources exhausted")
                return result
            
            # Phase 2: Build prompt
            system_prompt, user_prompt = self._build_analysis_prompt(data, language)
            
            # Phase 3: Single LLM call
            logger.info(f"Calling LLM for analysis...")
            llm_start = time.time()
            
            analysis = self.llm_service.safe_call_llm(
                system_prompt,
                user_prompt,
                default_structure={
                    "decision": "HOLD",
                    "confidence": 50,
                    "summary": "Analysis failed",
                    "entry_price": current_price,
                    "stop_loss": current_price * 0.95,
                    "take_profit": current_price * 1.05,
                    "position_size_pct": 10,
                    "timeframe": "medium",
                    "key_reasons": ["Unable to analyze"],
                    "risks": ["Analysis error"],
                    "technical_score": 50,
                    "fundamental_score": 50,
                    "sentiment_score": 50,
                },
                model=model
            )
            
            llm_time = int((time.time() - llm_start) * 1000)
            logger.info(f"LLM call completed in {llm_time}ms")
            
            # Phase 4: Calculate objective score and determine decision based on score
            objective_score = self._calculate_objective_score(data, current_price)
            logger.info(f"Objective score calculated: {objective_score['overall_score']:.1f} (Technical: {objective_score['technical_score']:.1f}, Fundamental: {objective_score['fundamental_score']:.1f}, Sentiment: {objective_score['sentiment_score']:.1f}, Macro: {objective_score['macro_score']:.1f})")
            
            # Determine decision based on objective score thresholds
            score_based_decision = self._score_to_decision(objective_score['overall_score'])
            logger.info(f"Score-based decision: {score_based_decision} (score: {objective_score['overall_score']:.1f})")
            
            # Check if technical indicators conflict with score-based BUY (e.g. RSI overbought)
            indicators = data.get("indicators") or {}
            rsi_value = float(indicators.get("rsi", {}).get("value", 50))
            score_conflicts_with_indicators = (
                score_based_decision == "BUY" and rsi_value > 70
            ) or (
                score_based_decision == "SELL" and rsi_value < 30
            )
            if score_conflicts_with_indicators:
                logger.warning(f"Score suggests {score_based_decision} but indicators conflict (RSI={rsi_value:.1f}). Will keep/use HOLD after validation.")
            
            # Override LLM decision with score-based decision if they differ significantly
            # Do NOT override to BUY when RSI > 70 (overbought) or to SELL when RSI < 30 (oversold)
            llm_decision = analysis.get("decision", "HOLD")
            if llm_decision != score_based_decision and not score_conflicts_with_indicators:
                score_abs = abs(objective_score['overall_score'])
                # Override when score is outside ±20 HOLD band (e.g. ±15+)
                if score_abs >= 15:
                    logger.warning(f"LLM decision '{llm_decision}' conflicts with score-based decision '{score_based_decision}' (score: {objective_score['overall_score']:.1f}). Overriding to score-based decision.")
                    analysis["decision"] = score_based_decision
                    # Confidence scales with score strength (max 95, min 60)
                    analysis["confidence"] = min(95, max(60, int(50 + score_abs * 0.45)))
                    original_summary = analysis.get("summary", "")
                    score_level = "strong" if score_abs >= 70 else "moderate" if score_abs >= 40 else "mild"
                    analysis["summary"] = f"{original_summary} [Objective score: {objective_score['overall_score']:.1f} ({score_level} {'bullish' if objective_score['overall_score'] > 0 else 'bearish'}), recommendation: {score_based_decision}]"
                else:
                    logger.info(f"LLM decision '{llm_decision}' differs from score-based '{score_based_decision}' but score is close to neutral ({objective_score['overall_score']:.1f}), keeping LLM decision")
            elif score_conflicts_with_indicators:
                # Force HOLD when score says BUY/SELL but indicators conflict
                analysis["decision"] = "HOLD"
                analysis["confidence"] = max(40, min(55, analysis.get("confidence", 50) - 15))
                original_summary = analysis.get("summary", "")
                if "HOLD" not in original_summary and "BUY" in original_summary and rsi_value > 70:
                    analysis["summary"] = f"{original_summary} [Objective score: {objective_score['overall_score']:.1f}; RSI {rsi_value:.1f}>70 (overbought), recommend HOLD]"
                # Replace placeholder reasons/risks so UI does not show "Unable to analyze" / "Analysis error"
                key_reasons = analysis.get("key_reasons") or []
                risks = analysis.get("risks") or []
                if key_reasons == ["Unable to analyze"] or (len(key_reasons) == 1 and "Unable to analyze" in str(key_reasons[0])):
                    analysis["key_reasons"] = ["Objective score suggests direction but technical indicators conflict (e.g. RSI overbought).", "Recommend HOLD until clearer setup."]
                if risks == ["Analysis error"] or (len(risks) == 1 and "Analysis error" in str(risks[0])):
                    analysis["risks"] = [f"RSI {rsi_value:.1f} > 70 (overbought). Wait for pullback before considering long."]
            
            # Add objective scores to analysis
            analysis["objective_score"] = objective_score
            analysis["score_based_decision"] = score_based_decision
            
            # Phase 5: Validate and constrain output (pass indicators for decision validation)
            # Check for major news or macro events that could override technical indicators
            news_data = data.get("news") or []
            macro_data = data.get("macro") or {}
            has_major_news = self._has_major_news(news_data)
            has_macro_event = self._has_macro_event(macro_data, data.get("market", ""))
            
            analysis = self._validate_and_constrain(
                analysis, 
                current_price, 
                indicators=data.get("indicators"),
                has_major_news=has_major_news,
                has_macro_event=has_macro_event
            )
            
            # Build final result
            total_time = int((time.time() - start_time) * 1000)
            
            # Extract detailed analysis sections
            detailed_analysis = analysis.get("analysis", {})
            if isinstance(detailed_analysis, str):
                # If AI returned a string instead of dict, use it as technical analysis
                detailed_analysis = {"technical": detailed_analysis, "fundamental": "", "sentiment": ""}
            
            result.update({
                "decision": analysis.get("decision", "HOLD"),
                "confidence": analysis.get("confidence", 50),
                "summary": analysis.get("summary", ""),
                "model": model,  # Model is already set in result initialization
                "language": language,  # Ensure language is included for task record
                "detailed_analysis": {
                    "technical": detailed_analysis.get("technical", ""),
                    "fundamental": detailed_analysis.get("fundamental", ""),
                    "sentiment": detailed_analysis.get("sentiment", ""),
                },
                "trading_plan": {
                    "entry_price": analysis.get("entry_price"),
                    "stop_loss": analysis.get("stop_loss"),
                    "take_profit": analysis.get("take_profit"),
                    "position_size_pct": analysis.get("position_size_pct", 10),
                    "timeframe": analysis.get("timeframe", "medium"),
                },
                "reasons": analysis.get("key_reasons", []),
                "risks": analysis.get("risks", []),
                "scores": {
                    "technical": analysis.get("technical_score", 50),
                    "fundamental": analysis.get("fundamental_score", 50),
                    "sentiment": analysis.get("sentiment_score", 50),
                    "overall": self._calculate_overall_score(analysis),
                },
                "objective_score": analysis.get("objective_score", {}),
                "score_based_decision": analysis.get("score_based_decision", "HOLD"),
                "market_data": {
                    "current_price": current_price,
                    "change_24h": data["price"].get("changePercent", 0),
                    "support": data["indicators"].get("levels", {}).get("support"),
                    "resistance": data["indicators"].get("levels", {}).get("resistance"),
                },
                "indicators": data.get("indicators", {}),
                "analysis_time_ms": total_time,
                "llm_time_ms": llm_time,
                "data_collection_time_ms": data.get("collection_time_ms", 0),
            })
            
            # Store in memory for future retrieval and get memory_id for feedback
            memory_id = self._store_analysis_memory(result, user_id=user_id)
            if memory_id:
                result["memory_id"] = memory_id
            
            logger.info(f"Fast analysis completed in {total_time}ms: {market}:{symbol} -> {result['decision']} (memory_id={memory_id}, user_id={user_id})")
            
        except Exception as e:
            logger.error(f"Fast analysis failed: {e}", exc_info=True)
            result["error"] = str(e)
        
        return result
    
    def _build_decision_guidance(self, rsi_value: float, macd_signal: str, ma_trend: str, change_24h: float, language: str = 'en-US') -> str:
        """
        Build decision guidance based on technical indicators to help AI make better decisions.
        Emphasizes SELL signals as valid shorting opportunities.
        """
        labels = {
            'en-US': {
                'rsi_overbought': '🔴 RSI > 70 (Overbought): Strongly suggest SELL short, avoid BUY',
                'rsi_high': '🟠 RSI > 60 (Slightly Overbought): Suggest SELL short, cautious BUY',
                'rsi_oversold': '🟢 RSI < 30 (Oversold): Suggest BUY long, avoid SELL',
                'rsi_low': '🟡 RSI < 40 (Slightly Oversold): Consider BUY long',
                'rsi_neutral': '⚪ RSI 40-60 (Neutral): Technical neutral, combine with other indicators',
                'macd_bullish': '🟢 MACD Bullish: Supports BUY long',
                'macd_bearish': '🔴 MACD Bearish: Supports SELL short, valid shorting opportunity',
                'macd_neutral': '⚪ MACD Neutral: No clear direction',
                'ma_up_overbought': '⚠️ MA uptrend but RSI overbought: May be near top, consider SELL short',
                'ma_uptrend': '🟢 MA Uptrend: Supports BUY long',
                'ma_downtrend': '🔴 MA Downtrend: Good SELL short opportunity, avoid BUY',
                'ma_sideways': '⚪ MA Sideways: Trend unclear',
                'gain_excessive': '🔴 24h gain > 5%: May be overextended, suggest SELL short or take profit',
                'loss_excessive': '🟢 24h loss > 5%: May be oversold, consider BUY long',
                'summary_sell': '📊 Overall: {count} short signals, consider SELL',
                'summary_buy': '📊 Overall: {count} long signals, consider BUY',
                'summary_mixed': '📊 Overall: Mixed signals, combine with macro and news',
                'insufficient': 'Insufficient technical data, trade with caution'
            },
            'zh-CN': {
                'rsi_overbought': '🔴 RSI > 70 (overbought): Prefer SELL short, avoid BUY',
                'rsi_high': '🟠 RSI > 60: Prefer SELL short, cautious BUY',
                'rsi_oversold': '🟢 RSI < 30 (oversold): Prefer BUY long, avoid SELL',
                'rsi_low': '🟡 RSI < 40: Consider BUY long',
                'rsi_neutral': '⚪ RSI 40-60: Neutral, use other indicators',
                'macd_bullish': '🟢 MACD bullish: Supports BUY long',
                'macd_bearish': '🔴 MACD bearish: Supports SELL short',
                'macd_neutral': '⚪ MACD neutral: No clear direction',
                'ma_up_overbought': '⚠️ MA up but RSI overbought: Near top, consider SELL',
                'ma_uptrend': '🟢 MA uptrend: Supports BUY long',
                'ma_downtrend': '🔴 MA downtrend: Good SELL short opportunity',
                'ma_sideways': '⚪ MA sideways: Trend unclear',
                'gain_excessive': '🔴 24h gain > 5%: May be overbought, consider SELL or take profit',
                'loss_excessive': '🟢 24h loss > 5%: May be oversold, consider BUY',
                'summary_sell': '📊 Overall: {count} short signals, consider SELL',
                'summary_buy': '📊 Overall: {count} long signals, consider BUY',
                'summary_mixed': '📊 Overall: Mixed signals, combine with macro and news',
                'insufficient': 'Insufficient technical data, trade with caution'
            }
        }
        
        lang = labels.get(language, labels['en-US'])
        guidance_parts = []
        
        if rsi_value > 70:
            guidance_parts.append(lang['rsi_overbought'])
        elif rsi_value > 60:
            guidance_parts.append(lang['rsi_high'])
        elif rsi_value < 30:
            guidance_parts.append(lang['rsi_oversold'])
        elif rsi_value < 40:
            guidance_parts.append(lang['rsi_low'])
        else:
            guidance_parts.append(lang['rsi_neutral'])
        
        if macd_signal == "bullish":
            guidance_parts.append(lang['macd_bullish'])
        elif macd_signal == "bearish":
            guidance_parts.append(lang['macd_bearish'])
        else:
            guidance_parts.append(lang['macd_neutral'])
        
        if "uptrend" in ma_trend.lower() or "strong_uptrend" in ma_trend.lower():
            if rsi_value > 60:
                guidance_parts.append(lang['ma_up_overbought'])
            else:
                guidance_parts.append(lang['ma_uptrend'])
        elif "downtrend" in ma_trend.lower() or "strong_downtrend" in ma_trend.lower():
            guidance_parts.append(lang['ma_downtrend'])
        else:
            guidance_parts.append(lang['ma_sideways'])
        
        if change_24h > 5:
            guidance_parts.append(lang['gain_excessive'])
        elif change_24h < -5:
            guidance_parts.append(lang['loss_excessive'])
        
        sell_signals = sum([
            rsi_value > 60,
            macd_signal == "bearish",
            "downtrend" in ma_trend.lower(),
            change_24h > 5
        ])
        buy_signals = sum([
            rsi_value < 40,
            macd_signal == "bullish",
            "uptrend" in ma_trend.lower(),
            change_24h < -5
        ])
        
        if sell_signals >= 2:
            guidance_parts.append(lang['summary_sell'].format(count=sell_signals))
        elif buy_signals >= 2:
            guidance_parts.append(lang['summary_buy'].format(count=buy_signals))
        else:
            guidance_parts.append(lang['summary_mixed'])
        
        return "\n".join(guidance_parts) if guidance_parts else lang['insufficient']
    
    def _has_major_news(self, news_data: List[Dict]) -> bool:
        """
        Check for major news events (regulation, partnerships, scandal, policy, geopolitical).
        """
        if not news_data:
            return False

        major_keywords = [
            "regulation", "regulatory", "ban", "approval", "policy", "government", "central bank",
            "partnership", "merger", "acquisition", "scandal", "lawsuit", "investigation",
            "war", "conflict", "military", "attack", "strike", "sanctions", "tension", "crisis",
            "geopolitical", "iran", "israel", "russia", "ukraine", "china", "taiwan", "north korea",
            "middle east", "gulf", "nato", "united states", "us", "usa", "america",
        ]

        for news in news_data[:10]:
            title = (news.get("title") or news.get("headline") or "").lower()
            summary = (news.get("summary") or "").lower()
            sentiment = news.get("sentiment", "neutral")

            text_to_check = f"{title} {summary}"

            geopolitical_keywords = [
                "war", "conflict", "military", "attack", "strike", "geopolitical",
            ]

            if any(keyword in text_to_check for keyword in geopolitical_keywords):
                logger.info(f"Detected major geopolitical event in news: {title[:60]}")
                return True

            if any(keyword in text_to_check for keyword in major_keywords) and sentiment != "neutral":
                logger.info(f"Detected major news event: {title[:60]}")
                return True
        
        return False
    
    def _has_macro_event(self, macro_data: Dict, market: str) -> bool:
        """
        Check for major macro events (VIX spike, DXY move >1%, rate change >2%).
        """
        if not macro_data:
            return False

        if "VIX" in macro_data:
            vix = macro_data["VIX"]
            vix_value = vix.get("price", 0)
            if vix_value > 30:
                return True

        if "DXY" in macro_data:
            dxy = macro_data["DXY"]
            change_pct = abs(dxy.get("changePercent", 0))
            if change_pct > 1.0:
                return True

        if "TNX" in macro_data and market in ["USStock", "Crypto"]:
            tnx = macro_data["TNX"]
            change_pct = abs(tnx.get("changePercent", 0))
            if change_pct > 2.0:
                return True
        
        return False
    
    def _validate_and_constrain(self, analysis: Dict, current_price: float, indicators: Dict = None,
                                 has_major_news: bool = False, has_macro_event: bool = False) -> Dict:
        """
        Validate LLM output and constrain prices to reasonable ranges.
        Also validate decision against technical indicators to prevent absurd recommendations.
        """
        if not current_price or current_price <= 0:
            return analysis
        
        # Price bounds
        min_price = current_price * 0.90
        max_price = current_price * 1.10
        
        # Constrain entry price
        entry = analysis.get("entry_price", current_price)
        if entry and (entry < min_price or entry > max_price):
            logger.warning(f"Entry price {entry} out of bounds, constraining to current price {current_price}")
            analysis["entry_price"] = round(current_price, 6)
        
        # Constrain stop loss
        stop_loss = analysis.get("stop_loss", current_price * 0.95)
        if stop_loss and (stop_loss < min_price or stop_loss > current_price):
            analysis["stop_loss"] = round(current_price * 0.95, 6)
        
        # Constrain take profit
        take_profit = analysis.get("take_profit", current_price * 1.05)
        if take_profit and (take_profit < current_price or take_profit > max_price):
            analysis["take_profit"] = round(current_price * 1.05, 6)
        
        # Constrain confidence
        confidence = analysis.get("confidence", 50)
        analysis["confidence"] = max(0, min(100, int(confidence)))
        
        # Constrain scores
        for score_key in ["technical_score", "fundamental_score", "sentiment_score"]:
            score = analysis.get(score_key, 50)
            analysis[score_key] = max(0, min(100, int(score)))
        
        # Validate decision
        decision = str(analysis.get("decision", "HOLD")).upper()
        if decision not in ["BUY", "SELL", "HOLD"]:
            analysis["decision"] = "HOLD"
        else:
            analysis["decision"] = decision
        
        # Validate decision against technical indicators (macro/news can override)
        if indicators:
            analysis = self._validate_decision_against_indicators(
                analysis, indicators, confidence, 
                has_major_news=has_major_news, 
                has_macro_event=has_macro_event
            )
        
        return analysis
    
    def _validate_decision_against_indicators(self, analysis: Dict, indicators: Dict, confidence: int,
                                               has_major_news: bool = False, has_macro_event: bool = False) -> Dict:
        """
        Validate decision against technical indicators; allow macro/news to override.

        Args:
            analysis: AI analysis result
            indicators: Technical indicator data
            confidence: Confidence level
            has_major_news: Whether there is major news
            has_macro_event: Whether there is major macro event
        """
        decision = analysis.get("decision", "HOLD")
        rsi_data = indicators.get("rsi", {})
        macd_data = indicators.get("macd", {})
        ma_data = indicators.get("moving_averages", {})
        
        rsi_value = rsi_data.get("value", 50)
        macd_signal = macd_data.get("signal", "neutral")
        ma_trend = ma_data.get("trend", "sideways")
        
        # Force HOLD if confidence too low
        if confidence < 60:
            if decision != "HOLD":
                logger.warning(f"Decision {decision} with low confidence {confidence}, forcing to HOLD")
                analysis["decision"] = "HOLD"
                analysis["confidence"] = max(confidence, 45)
            return analysis

        allow_override = has_major_news or has_macro_event

        if decision == "BUY":
            conflicts = []

            if rsi_value > 70:
                conflicts.append(f"RSI {rsi_value:.1f} > 70 (overbought)")

            if macd_signal == "bearish":
                conflicts.append("MACD bearish")

            if "strong_downtrend" in ma_trend.lower() or ("downtrend" in ma_trend.lower() and rsi_value > 50):
                conflicts.append(f"MA trend: {ma_trend}")

            if conflicts:
                if allow_override:
                    logger.info(f"BUY decision conflicts with indicators but major news/macro event allows override: {', '.join(conflicts)}")
                    analysis["confidence"] = max(confidence - 15, 50)
                    original_summary = analysis.get("summary", "")
                    analysis["summary"] = f"{original_summary} [Note: indicators show {', '.join(conflicts)}; major event may change trend]"
                else:
                    logger.warning(f"BUY decision conflicts with indicators and no major event: {', '.join(conflicts)}. Forcing to HOLD")
                    analysis["decision"] = "HOLD"
                    analysis["confidence"] = max(confidence - 20, 40)
                    original_summary = analysis.get("summary", "")
                    analysis["summary"] = f"{original_summary} [Note: indicators show {', '.join(conflicts)}; recommend HOLD]"
                    # Replace placeholder reasons/risks so UI does not show "Unable to analyze" / "Analysis error"
                    _replace_placeholder_reasons_risks(analysis, conflicts, is_buy_conflict=True)
        
        elif decision == "SELL":
            conflicts = []

            if rsi_value < 30 and macd_signal == "bullish" and "uptrend" in ma_trend.lower():
                conflicts.append(f"Strong bullish signals (RSI {rsi_value:.1f} < 30, MACD bullish, uptrend)")
            elif rsi_value < 30 and "strong_uptrend" in ma_trend.lower():
                conflicts.append(f"Very strong uptrend with oversold RSI {rsi_value:.1f}")

            if conflicts:
                if allow_override:
                    logger.info(f"SELL decision conflicts with strong bullish indicators but major news/macro event allows override: {', '.join(conflicts)}")
                    analysis["confidence"] = max(confidence - 15, 50)
                    original_summary = analysis.get("summary", "")
                    analysis["summary"] = f"{original_summary} [Note: indicators show {', '.join(conflicts)}; major event may change trend]"
                else:
                    logger.warning(f"SELL decision conflicts with very strong bullish indicators: {', '.join(conflicts)}. Forcing to HOLD")
                    analysis["decision"] = "HOLD"
                    analysis["confidence"] = max(confidence - 20, 40)
                    original_summary = analysis.get("summary", "")
                    analysis["summary"] = f"{original_summary} [Note: indicators show {', '.join(conflicts)}; recommend HOLD]"
                    _replace_placeholder_reasons_risks(analysis, conflicts, is_buy_conflict=False)
        
        return analysis
    
    def _calculate_objective_score(self, data: Dict[str, Any], current_price: float) -> Dict[str, float]:
        """
        Compute quantitative score from objective data. Returns -100 to +100:
        +70 to +100: Strong bullish (BUY); +40 to +70: Bullish (BUY);
        -40 to +40: Neutral (HOLD); -70 to -40: Bearish (SELL); -100 to -70: Strong bearish (SELL).
        """
        indicators = data.get("indicators") or {}
        fundamental = data.get("fundamental") or {}
        news = data.get("news") or []
        macro = data.get("macro") or {}
        price_data = data.get("price") or {}
        
        # 1. Technical score (-100 to +100)
        technical_score = self._calculate_technical_score(indicators, price_data)

        # 2. Fundamental score (-100 to +100)
        fundamental_score = self._calculate_fundamental_score(fundamental, data.get("market", ""))

        # 3. Sentiment score (-100 to +100)
        sentiment_score = self._calculate_sentiment_score(news)

        # 4. Macro score (-100 to +100)
        macro_score = self._calculate_macro_score(macro, data.get("market", ""))

        # 5. Weighted overall (tech 35%, fundamental 20%, sentiment 25%, macro 20%)
        overall_score = (
            technical_score * 0.35 +
            fundamental_score * 0.20 +
            sentiment_score * 0.25 +
            macro_score * 0.20
        )
        
        return {
            "technical_score": technical_score,
            "fundamental_score": fundamental_score,
            "sentiment_score": sentiment_score,
            "macro_score": macro_score,
            "overall_score": overall_score
        }
    
    def _calculate_technical_score(self, indicators: Dict, price_data: Dict) -> float:
        """Compute technical indicator score (-100 to +100)."""
        score = 0.0
        weight_sum = 0.0
        
        # RSI score (-50 to +50)
        rsi_data = indicators.get("rsi", {})
        rsi_value = rsi_data.get("value", 50)
        if rsi_value > 0:
            if rsi_value > 70:
                rsi_score = -50  # overbought, bearish
            elif rsi_value > 60:
                rsi_score = -30  # high RSI, bearish
            elif rsi_value < 30:
                rsi_score = +50  # oversold, bullish
            elif rsi_value < 40:
                rsi_score = +30  # low RSI, bullish
            else:
                rsi_score = (50 - rsi_value) * 0.6  # 40-60 linear
            score += rsi_score * 0.30
            weight_sum += 0.30
        
        # MACD score (-40 to +40)
        macd_data = indicators.get("macd", {})
        macd_signal = macd_data.get("signal", "neutral")
        if macd_signal == "bullish":
            macd_score = +40
        elif macd_signal == "bearish":
            macd_score = -40
        else:
            macd_score = 0
        score += macd_score * 0.25
        weight_sum += 0.25
        
        # MA trend score (-40 to +40)
        ma_data = indicators.get("moving_averages", {})
        ma_trend = ma_data.get("trend", "sideways")
        if "strong_uptrend" in ma_trend.lower():
            ma_score = +40
        elif "uptrend" in ma_trend.lower():
            ma_score = +25
        elif "strong_downtrend" in ma_trend.lower():
            ma_score = -40
        elif "downtrend" in ma_trend.lower():
            ma_score = -25
        else:
            ma_score = 0
        score += ma_score * 0.25
        weight_sum += 0.25
        
        # 24h change score (-20 to +20)
        change_24h = price_data.get("changePercent", 0)
        if change_24h > 10:
            change_score = -20  # excessive gain, bearish
        elif change_24h > 5:
            change_score = -10
        elif change_24h < -10:
            change_score = +20  # excessive loss, bullish
        elif change_24h < -5:
            change_score = +10
        else:
            change_score = change_24h * 2  # linear
        score += change_score * 0.20
        weight_sum += 0.20

        # Normalize to -100..+100
        if weight_sum > 0:
            score = score / weight_sum * 100
        
        return max(-100, min(100, score))
    
    def _calculate_fundamental_score(self, fundamental: Dict, market: str) -> float:
        """Compute fundamental score (-100 to +100)."""
        if market != "USStock" or not fundamental:
            return 0.0  # non-US or no fundamental data -> neutral
        
        score = 0.0
        factors = 0
        
        # PE ratio score
        pe_ratio = fundamental.get("pe_ratio")
        if pe_ratio and pe_ratio > 0:
            if pe_ratio < 15:
                pe_score = +20  # low PE, bullish
            elif pe_ratio < 25:
                pe_score = +10
            elif pe_ratio > 50:
                pe_score = -20  # high PE, bearish
            elif pe_ratio > 35:
                pe_score = -10
            else:
                pe_score = 0
            score += pe_score
            factors += 1
        
        # ROE score
        roe = fundamental.get("roe")
        if roe:
            if roe > 20:
                roe_score = +20  # high ROE, bullish
            elif roe > 15:
                roe_score = +10
            elif roe < 5:
                roe_score = -20  # low ROE, bearish
            elif roe < 10:
                roe_score = -10
            else:
                roe_score = 0
            score += roe_score
            factors += 1
        
        # Revenue growth score
        revenue_growth = fundamental.get("revenue_growth")
        if revenue_growth:
            if revenue_growth > 20:
                growth_score = +20  # high growth, bullish
            elif revenue_growth > 10:
                growth_score = +10
            elif revenue_growth < -10:
                growth_score = -20  # negative growth, bearish
            elif revenue_growth < 0:
                growth_score = -10
            else:
                growth_score = 0
            score += growth_score
            factors += 1
        
        # Profit margin score
        profit_margin = fundamental.get("profit_margin")
        if profit_margin:
            if profit_margin > 20:
                margin_score = +15  # high margin, bullish
            elif profit_margin > 10:
                margin_score = +7
            elif profit_margin < 0:
                margin_score = -15  # loss, bearish
            elif profit_margin < 5:
                margin_score = -7
            else:
                margin_score = 0
            score += margin_score
            factors += 1
        
        # Debt/equity score
        debt_to_equity = fundamental.get("debt_to_equity")
        if debt_to_equity:
            if debt_to_equity < 0.5:
                debt_score = +10  # low debt, bullish
            elif debt_to_equity > 2.0:
                debt_score = -10  # high debt, bearish
            else:
                debt_score = 0
            score += debt_score
            factors += 1
        
        # Normalize when multiple factors
        if factors > 0:
            score = score / factors * 100 / 4  # max ~80 from 4 factors, normalize to 100
        
        return max(-100, min(100, score))
    
    def _calculate_sentiment_score(self, news: List[Dict]) -> float:
        """
        Compute news sentiment score (-100 to +100), with geopolitical penalty.
        """
        if not news:
            return 0.0  # no news -> neutral

        positive_count = 0
        negative_count = 0
        neutral_count = 0
        geopolitical_penalty = 0
        geopolitical_count = 0

        geopolitical_keywords = [
            "war", "conflict", "military", "attack", "strike", "sanctions",
            "geopolitical", "crisis", "tension", "iran", "israel", "russia",
            "ukraine", "middle east", "nato", "united states",
        ]

        for item in news[:15]:
            title = (item.get("headline") or item.get("title") or "").lower()
            summary = (item.get("summary") or "").lower()
            text = f"{title} {summary}"
            sentiment = item.get("sentiment", "neutral")
            is_global_event = item.get("is_global_event", False)

            is_geopolitical = is_global_event or any(keyword in text for keyword in geopolitical_keywords)

            if is_geopolitical:
                geopolitical_count += 1
                if any(kw in text for kw in ["war", "conflict", "attack", "strike"]):
                    geopolitical_penalty -= 50  # war/conflict severe bearish
                elif any(kw in text for kw in ["sanctions", "crisis", "tension"]):
                    geopolitical_penalty -= 30  # sanctions/crisis bearish
                else:
                    geopolitical_penalty -= 20  # other geopolitical bearish
                logger.info(f"Detected geopolitical event in sentiment scoring: {title[:60]}, penalty: {geopolitical_penalty}")

            if sentiment == "positive":
                positive_count += 1
            elif sentiment == "negative":
                negative_count += 1
            else:
                neutral_count += 1

        total = positive_count + negative_count + neutral_count

        if total > 0:
            net_sentiment = (positive_count - negative_count) / total
            base_score = net_sentiment * 60  # base sentiment -60..+60
        else:
            base_score = 0

        if geopolitical_count > 0:
            final_score = base_score + geopolitical_penalty
            logger.info(f"Sentiment score: base={base_score:.1f}, geopolitical_penalty={geopolitical_penalty}, final={final_score:.1f}")
        else:
            final_score = base_score
        
        return max(-100, min(100, final_score))
    
    def _calculate_macro_score(self, macro: Dict, market: str) -> float:
        """
        Compute macro score (-100 to +100) from VIX, DXY, rates, etc.
        """
        if not macro:
            return 0.0  # no macro data -> neutral

        score = 0.0
        factors = 0

        vix = macro.get("VIX", {})
        vix_value = vix.get("price", 0)
        if vix_value > 0:
            if vix_value > 35:
                vix_score = -50  # extreme fear, bearish
            elif vix_value > 30:
                vix_score = -40  # high fear, bearish
            elif vix_value > 25:
                vix_score = -30  # elevated fear, bearish
            elif vix_value > 20:
                vix_score = -15  # moderate fear
            elif vix_value < 12:
                vix_score = +20  # low fear, bullish
            elif vix_value < 15:
                vix_score = +10  # very low fear, bullish
            else:
                vix_score = 0
            score += vix_score
            factors += 1
        
        # DXY score
        dxy = macro.get("DXY", {})
        dxy_value = dxy.get("price", 0)
        dxy_change = dxy.get("changePercent", 0)
        if dxy_value > 0:
            # For crypto/commodities, strong USD is typically bearish
            if market in ["Crypto", "Forex", "Futures"]:
                if dxy_change > 2:
                    dxy_score = -30  # USD strong up, bearish
                elif dxy_change > 1:
                    dxy_score = -20  # USD up, bearish
                elif dxy_change < -2:
                    dxy_score = +30  # USD strong down, bullish
                elif dxy_change < -1:
                    dxy_score = +20  # USD down, bullish
                else:
                    dxy_score = 0
            else:
                # Also affects stocks, but smaller
                if dxy_change > 2:
                    dxy_score = -10
                elif dxy_change < -2:
                    dxy_score = +10
                else:
                    dxy_score = 0
            score += dxy_score
            factors += 1
        
        # Rate score (TNX)
        tnx = macro.get("TNX", {})
        tnx_change = tnx.get("changePercent", 0)
        tnx_value = tnx.get("price", 0)
        if tnx_change != 0 or tnx_value > 0:
            # Rate rise usually bearish for growth/crypto
            if market in ["Crypto", "USStock"]:
                if tnx_change > 3:
                    tnx_score = -30  # rate up strongly, bearish
                elif tnx_change > 2:
                    tnx_score = -20  # rate up, bearish
                elif tnx_change < -3:
                    tnx_score = +30  # rate down strongly, bullish
                elif tnx_change < -2:
                    tnx_score = +20  # rate down, bullish
                else:
                    tnx_score = 0
            else:
                tnx_score = 0
            score += tnx_score
            factors += 1
        
        # Normalize (weighted)
        if factors > 0:
            max_possible = 110
            score = score / max_possible * 100
        
        return max(-100, min(100, score))
    
    def _score_to_decision(self, score: float) -> str:
        """
        Map objective score to decision. Thresholds: >= +20 BUY, <= -20 SELL, else HOLD.
        """
        if score >= 20:
            return "BUY"
        elif score <= -20:
            return "SELL"
        else:
            return "HOLD"
    
    def _calculate_overall_score(self, analysis: Dict) -> int:
        """Calculate weighted overall score (legacy; uses objective score when available)."""
        if "objective_score" in analysis:
            objective = analysis["objective_score"]
            overall = objective.get("overall_score", 50)
            return max(0, min(100, int(50 + overall * 0.5)))

        # Fallback to LLM scores
        tech = analysis.get("technical_score", 50)
        fund = analysis.get("fundamental_score", 50)
        sent = analysis.get("sentiment_score", 50)
        
        # Weights: technical 40%, fundamental 35%, sentiment 25%
        overall = tech * 0.40 + fund * 0.35 + sent * 0.25
        
        # Adjust based on decision
        decision = analysis.get("decision", "HOLD")
        confidence = analysis.get("confidence", 50)
        
        if decision == "BUY":
            overall = overall * 0.6 + (50 + confidence * 0.5) * 0.4
        elif decision == "SELL":
            overall = overall * 0.6 + (50 - confidence * 0.5) * 0.4
        
        return max(0, min(100, int(overall)))
    
    def _store_analysis_memory(self, result: Dict, user_id: int = None) -> Optional[int]:
        """Store analysis result for future learning. Returns memory_id."""
        try:
            from app.services.analysis_memory import get_analysis_memory
            memory = get_analysis_memory()
            memory_id = memory.store(result, user_id=user_id)
            
            # Also save to qd_analysis_tasks for admin statistics
            self._save_analysis_task(result, user_id=user_id)
            
            return memory_id
        except Exception as e:
            logger.warning(f"Memory storage failed: {e}")
            return None
    
    def _save_analysis_task(self, result: Dict, user_id: int = None) -> Optional[int]:
        """
        Save analysis record to qd_analysis_tasks table for admin statistics.
        
        Args:
            result: Analysis result dictionary
            user_id: User ID who created this analysis
            
        Returns:
            Task ID or None if failed
        """
        try:
            from app.utils.db import get_db_connection
            
            market = result.get("market", "")
            symbol = result.get("symbol", "")
            model = result.get("model", "")
            # If model is empty, get default model
            if not model:
                from app.services.llm import LLMService
                llm_service = LLMService()
                model = llm_service.get_default_model()
            language = result.get("language", "en-US")
            status = "completed" if not result.get("error") else "failed"
            result_json = json.dumps(result, ensure_ascii=False)
            error_message = result.get("error", "")
            
            if not market or not symbol:
                logger.warning(f"Cannot save analysis task: missing market or symbol")
                return None
            
            with get_db_connection() as db:
                cur = db.cursor()
                # PostgreSQL: Use RETURNING to get the inserted ID
                cur.execute(
                    """
                    INSERT INTO qd_analysis_tasks
                    (user_id, market, symbol, model, language, status, result_json, error_message, created_at, completed_at)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    RETURNING id
                    """,
                    (
                        int(user_id) if user_id else 1,  # Default to user 1 if not provided
                        str(market),
                        str(symbol),
                        str(model) if model else '',
                        str(language),
                        str(status),
                        str(result_json),
                        str(error_message) if error_message else ''
                    )
                )
                row = cur.fetchone()
                task_id = row['id'] if row else None
                db.commit()
                cur.close()
                
                if task_id:
                    logger.debug(f"Saved analysis task {task_id} for user {user_id}: {market}:{symbol}")
                return task_id
                
        except Exception as e:
            logger.warning(f"Failed to save analysis task: {e}")
            return None
    
    # ==================== Backward Compatibility ====================
    
    def analyze_legacy_format(self, market: str, symbol: str, language: str = 'en-US',
                              model: str = None, timeframe: str = "1D") -> Dict[str, Any]:
        """
        Returns analysis in legacy multi-agent format for backward compatibility.
        """
        fast_result = self.analyze(market, symbol, language, model, timeframe)
        
        if fast_result.get("error"):
            return {
                "overview": {"report": f"Analysis failed: {fast_result['error']}"},
                "fundamental": {"report": "N/A"},
                "technical": {"report": "N/A"},
                "news": {"report": "N/A"},
                "sentiment": {"report": "N/A"},
                "risk": {"report": "N/A"},
                "error": fast_result["error"],
            }
        
        # Convert to legacy format
        decision = fast_result.get("decision", "HOLD")
        confidence = fast_result.get("confidence", 50)
        scores = fast_result.get("scores", {})
        
        return {
            "overview": {
                "overallScore": scores.get("overall", 50),
                "recommendation": decision,
                "confidence": confidence,
                "dimensionScores": {
                    "fundamental": scores.get("fundamental", 50),
                    "technical": scores.get("technical", 50),
                    "news": scores.get("sentiment", 50),
                    "sentiment": scores.get("sentiment", 50),
                    "risk": 100 - confidence,  # Inverse of confidence
                },
                "report": fast_result.get("summary", ""),
            },
            "fundamental": {
                "score": scores.get("fundamental", 50),
                "report": f"Fundamental score: {scores.get('fundamental', 50)}/100",
            },
            "technical": {
                "score": scores.get("technical", 50),
                "report": f"Technical score: {scores.get('technical', 50)}/100",
                "indicators": fast_result.get("indicators", {}),
            },
            "news": {
                "score": scores.get("sentiment", 50),
                "report": "See sentiment analysis",
            },
            "sentiment": {
                "score": scores.get("sentiment", 50),
                "report": f"Sentiment score: {scores.get('sentiment', 50)}/100",
            },
            "risk": {
                "score": 100 - confidence,
                "report": "\n".join(fast_result.get("risks", [])),
            },
            "debate": {
                "bull": {"confidence": confidence if decision == "BUY" else 50},
                "bear": {"confidence": confidence if decision == "SELL" else 50},
                "research_decision": fast_result.get("summary", ""),
            },
            "trader_decision": {
                "decision": decision,
                "confidence": confidence,
                "reasoning": fast_result.get("summary", ""),
                "trading_plan": fast_result.get("trading_plan", {}),
                "report": "\n".join(fast_result.get("reasons", [])),
            },
            "risk_debate": {
                "risky": {"recommendation": ""},
                "neutral": {"recommendation": fast_result.get("summary", "")},
                "safe": {"recommendation": ""},
            },
            "final_decision": {
                "decision": decision,
                "confidence": confidence,
                "reasoning": fast_result.get("summary", ""),
                "risk_summary": {
                    "risks": fast_result.get("risks", []),
                },
                "recommendation": "\n".join(fast_result.get("reasons", [])),
            },
            "fast_analysis": fast_result,  # Include new format for gradual migration
            "error": None,
        }


# Singleton instance
_fast_analysis_service = None

def get_fast_analysis_service() -> FastAnalysisService:
    """Get singleton FastAnalysisService instance."""
    global _fast_analysis_service
    if _fast_analysis_service is None:
        _fast_analysis_service = FastAnalysisService()
    return _fast_analysis_service


def fast_analyze(market: str, symbol: str, language: str = 'en-US', 
                 model: str = None, timeframe: str = "1D") -> Dict[str, Any]:
    """Convenience function for fast analysis."""
    service = get_fast_analysis_service()
    return service.analyze(market, symbol, language, model, timeframe)
