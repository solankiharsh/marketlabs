"""
Polymarket batch analyzer: analyze many markets and let AI filter for trading opportunities.
"""
import json
from typing import List, Dict, Optional
from app.utils.logger import get_logger
from app.utils.db import get_db_connection, is_postgres_available
from app.services.llm import LLMService
from app.data_sources.polymarket import PolymarketDataSource

logger = get_logger(__name__)


class PolymarketBatchAnalyzer:
    """Batch-analyze prediction markets and filter for opportunities via AI."""

    def __init__(self):
        self.llm_service = LLMService()
        self.polymarket_source = PolymarketDataSource()

    def batch_analyze_markets(self, markets: List[Dict], max_opportunities: int = 20) -> List[Dict]:
        """
        Batch-analyze markets; AI filters for trading opportunities.

        Args:
            markets: List of markets
            max_opportunities: Max number of opportunities to return

        Returns:
            Filtered list with AI analysis attached
        """
        if not markets:
            return []

        try:
            markets_summary = self._build_markets_summary(markets)

            prompt = f"""You are a professional prediction market analyst. Analyze the following list and pick the best trading opportunities.

Market list:
{markets_summary}

Evaluate each market on:
1. **Liquidity**: volume and depth
2. **Probability edge**: deviation from 50% (larger deviation = more edge)
3. **Event importance**: impact of the event
4. **Time horizon**: not too close or too far to resolution
5. **Information edge**: clear mispricing or asymmetry

Return JSON with selected market IDs and brief analysis:
{{
    "opportunities": [
        {{
            "market_id": "market ID",
            "opportunity_score": 85,
            "reason": "brief reason this is an opportunity",
            "recommendation": "YES/NO/HOLD",
            "confidence": 75,
            "key_factors": ["factor1", "factor2"]
        }}
    ]
}}

Requirements:
- Return at most {max_opportunities} opportunities
- opportunity_score >= 60 only
- Prefer: high volume + clear probability edge + high confidence
- Keep reasons brief."""

            messages = [
                {
                    "role": "system",
                    "content": "You are a prediction market analyst. Identify valuable trading opportunities from many markets. Be objective and only recommend real edges."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
            
            logger.info(f"Batch analyzing {len(markets)} markets, requesting {max_opportunities} opportunities")
            try:
                result = self.llm_service.call_llm_api(
                    messages=messages,
                    use_json_mode=True,
                    temperature=0.3
                )
            except ValueError as e:
                if "API key not configured" in str(e):
                    logger.warning(
                        "Polymarket batch analysis skipped: no LLM API key. "
                        "Set OPENROUTER_API_KEY (or another LLM provider key) in .env"
                    )
                    return self._fallback_analysis(markets, max_opportunities)
                raise

            # Parse result
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except:
                    logger.error(f"Failed to parse LLM result as JSON: {result[:200]}")
                    return self._fallback_analysis(markets, max_opportunities)
            
            opportunities = result.get('opportunities', [])
            if not opportunities:
                logger.warning("LLM returned no opportunities, using fallback")
                return self._fallback_analysis(markets, max_opportunities)
            
            # Merge AI analysis into market data
            opportunities_map = {opp.get('market_id'): opp for opp in opportunities}
            analyzed_markets = []

            for market in markets:
                market_id = market.get('market_id')
                if not market_id:
                    continue

                opp = opportunities_map.get(market_id)
                if opp:
                    predicted_prob = float(opp.get('predicted_probability', market.get('current_probability', 50.0)))
                    market_prob = market.get('current_probability', 50.0)
                    divergence = predicted_prob - market_prob

                    market['ai_analysis'] = {
                        'predicted_probability': predicted_prob,
                        'recommendation': opp.get('recommendation', 'HOLD'),
                        'confidence_score': float(opp.get('confidence', 0)),
                        'opportunity_score': float(opp.get('opportunity_score', 0)),
                        'divergence': divergence,
                        'reasoning': opp.get('reason', ''),
                        'key_factors': opp.get('key_factors', [])
                    }
                    analyzed_markets.append(market)

            # Sort by opportunity score
            analyzed_markets.sort(
                key=lambda x: x.get('ai_analysis', {}).get('opportunity_score', 0),
                reverse=True
            )
            
            logger.info(f"Batch analysis completed: {len(analyzed_markets)} opportunities identified")
            return analyzed_markets
            
        except Exception as e:
            logger.error(f"Batch analysis failed: {e}", exc_info=True)
            return self._fallback_analysis(markets, max_opportunities)
    
    def _build_markets_summary(self, markets: List[Dict]) -> str:
        """Build market summary for batch analysis."""
        summary_lines = []

        for i, market in enumerate(markets[:50], 1):
            market_id = market.get('market_id', '')
            question = market.get('question', '')[:100]
            prob = market.get('current_probability', 50.0)
            volume = market.get('volume_24h', 0)
            category = market.get('category', 'other')

            summary_lines.append(
                f"{i}. ID: {market_id}\n"
                f"   Question: {question}\n"
                f"   Current prob: {prob:.1f}%\n"
                f"   24h volume: ${volume:,.0f}\n"
                f"   Category: {category}"
            )

        return "\n\n".join(summary_lines)

    def _fallback_analysis(self, markets: List[Dict], max_opportunities: int) -> List[Dict]:
        """Fallback: filter by simple rules (volume + probability deviation)."""
        opportunities = []

        for market in markets:
            prob = market.get('current_probability', 50.0)
            volume = market.get('volume_24h', 0)

            if volume > 10000 and abs(prob - 50.0) > 10:
                opportunity_score = min(60 + abs(prob - 50.0) * 0.5, 90)

                market['ai_analysis'] = {
                    'predicted_probability': prob,
                    'recommendation': 'YES' if prob > 50 else 'NO',
                    'confidence_score': 60.0,
                    'opportunity_score': opportunity_score,
                    'divergence': 0,
                    'reasoning': f'High volume (${volume:,.0f}) + probability deviation ({prob:.1f}%)',
                    'key_factors': ['High volume', 'Probability deviation']
                }
                opportunities.append(market)

        # Sort by opportunity score
        opportunities.sort(
            key=lambda x: x.get('ai_analysis', {}).get('opportunity_score', 0),
            reverse=True
        )
        
        return opportunities[:max_opportunities]
    
    def save_batch_analysis(self, markets: List[Dict]):
        """Save batch analysis results to database."""
        if not is_postgres_available():
            return
        try:
            with get_db_connection() as db:
                cur = db.cursor()

                for market in markets:
                    market_id = market.get('market_id')
                    ai_analysis = market.get('ai_analysis')

                    if not market_id or not ai_analysis:
                        continue
                    
                    try:
                        # Delete existing shared analysis (user_id IS NULL) for this market
                        cur.execute("""
                            DELETE FROM qd_polymarket_ai_analysis
                            WHERE market_id = %s AND user_id IS NULL
                        """, (market_id,))

                        cur.execute("""
                            INSERT INTO qd_polymarket_ai_analysis
                            (market_id, user_id, ai_predicted_probability, market_probability,
                             divergence, recommendation, confidence_score, opportunity_score,
                             reasoning, key_factors, related_assets, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        """, (
                            market_id,
                            None,  # shared analysis
                            float(ai_analysis.get('predicted_probability', market.get('current_probability', 50.0))),
                            market.get('current_probability', 50.0),
                            float(ai_analysis.get('divergence', 0)),
                            ai_analysis.get('recommendation', 'HOLD'),
                            ai_analysis.get('confidence_score', 0),
                            ai_analysis.get('opportunity_score', 0),
                            ai_analysis.get('reasoning', ''),
                            json.dumps(ai_analysis.get('key_factors', [])),
                            []
                        ))
                    except Exception as e:
                        logger.warning(f"Failed to save analysis for market {market_id}: {e}")
                        continue
                
                db.commit()
                cur.close()
                logger.info(f"Saved batch analysis for {len(markets)} markets")
                
        except Exception as e:
            err_msg = str(e).lower()
            if "psycopg2" in err_msg or "postgresql" in err_msg or "cannot use postgres" in err_msg:
                logger.debug("Skipped saving batch analysis (PostgreSQL unavailable): %s", e)
            else:
                logger.error("Failed to save batch analysis: %s", e, exc_info=True)
