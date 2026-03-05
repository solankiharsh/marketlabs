"""
Polymarket prediction market data source. Fetches data from Polymarket APIs.
"""
import time
import requests
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from app.utils.logger import get_logger
from app.utils.db import get_db_connection, is_postgres_available

logger = get_logger(__name__)


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Parse a value to float without raising; use default on failure."""
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


class PolymarketDataSource:
    """Polymarket prediction market data source."""

    def __init__(self):
        # Polymarket API endpoints (Gamma: markets/events; Data: positions/trades; CLOB: orderbook/trading)
        self.gamma_api = "https://gamma-api.polymarket.com"
        self.data_api = "https://data-api.polymarket.com"
        self.clob_api = "https://clob.polymarket.com"
        self.cache_ttl = 300  # 5 min cache
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        })
        
    def get_trending_markets(self, category: str = None, limit: int = 50) -> List[Dict]:
        """
        Get trending prediction markets.

        Args:
            category: Filter (crypto, politics, economics, sports, all)
            limit: Max number to return

        Returns:
            List of markets
        """
        try:
            cached = self._get_cached_markets(category, limit)
            if cached:
                return cached

            all_markets = []

            if category and category != "all":
                markets = self._fetch_markets_from_api(category, limit * 2)
                all_markets.extend(markets)
            else:
                categories_to_fetch = ["crypto", "politics", "economics", "sports"]
                for cat in categories_to_fetch:
                    markets = self._fetch_markets_from_api(cat, limit // len(categories_to_fetch) + 10)
                    all_markets.extend(markets)

            seen = set()
            unique_markets = []
            for market in all_markets:
                market_id = market.get("market_id")
                if market_id and market_id not in seen:
                    seen.add(market_id)
                    unique_markets.append(market)

            unique_markets.sort(key=lambda x: x.get('volume_24h', 0), reverse=True)

            if unique_markets:
                self._save_markets_to_db(unique_markets)
                return unique_markets[:limit]
            logger.warning("Polymarket API unavailable, returning empty list")
            return []
            
        except Exception as e:
            logger.error(f"Failed to get trending markets: {e}", exc_info=True)
            return []
    
    def get_market_details(self, market_id: str) -> Optional[Dict]:
        """Get single market details."""
        try:
            market_id = str(market_id).strip()
            if not market_id:
                logger.warning("Empty market_id provided")
                return None

            # Try DB first
            try:
                with get_db_connection() as db:
                    cur = db.cursor()
                    cur.execute("""
                        SELECT market_id, question, category, current_probability, 
                               volume_24h, liquidity, end_date_iso, status, outcome_tokens
                        FROM qd_polymarket_markets
                        WHERE market_id = %s
                    """, (market_id,))
                    row = cur.fetchone()
                    cur.close()
                    
                    if row:
                        db_market_id = str(row.get('market_id') or market_id)
                        # Parse outcome_tokens (may be JSON string)
                        outcome_tokens = {}
                        outcome_tokens_raw = row.get('outcome_tokens')
                        if outcome_tokens_raw:
                            try:
                                if isinstance(outcome_tokens_raw, str):
                                    outcome_tokens = json.loads(outcome_tokens_raw)
                                else:
                                    outcome_tokens = outcome_tokens_raw if isinstance(outcome_tokens_raw, dict) else {}
                            except:
                                outcome_tokens = {}
                        
                        return {
                            "market_id": db_market_id,
                            "question": row.get('question') or '',
                            "category": row.get('category') or 'other',
                            "current_probability": float(row.get('current_probability') or 0),
                            "volume_24h": float(row.get('volume_24h') or 0),
                            "liquidity": float(row.get('liquidity') or 0),
                            "end_date_iso": row.get('end_date_iso'),
                            "status": row.get('status') or 'active',
                            "outcome_tokens": outcome_tokens,
                            "polymarket_url": self._build_polymarket_url(row.get('slug'), db_market_id),
                            "slug": row.get('slug') if row.get('slug') and not str(row.get('slug', '')).isdigit() else None
                        }
            except Exception as db_error:
                logger.warning(f"Database query failed for market {market_id}: {db_error}")
                # Fall back to API
            
            # If not in DB, fetch from API
            logger.info(f"Market {market_id} not in database, fetching from API")
            market = self._fetch_market_from_api(market_id)
            if market:
                try:
                    self._save_markets_to_db([market])
                except Exception as save_error:
                    logger.warning(f"Failed to save market to DB: {save_error}")
                return market
            
            logger.warning(f"Market {market_id} not found in API")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get market details for {market_id}: {e}", exc_info=True)
            return None
    
    def get_market_history(self, market_id: str, days: int = 30) -> List[Dict]:
        """Get market historical prices. Placeholder: returns empty list."""
        return []
    
    def search_markets(self, keyword: str, limit: int = 20, use_cache: bool = True) -> List[Dict]:
        """
Search for related prediction markets. Prefer API for fresh data; DB is optional cache.

        Args:
            keyword: Search keyword
            limit: Max results
            use_cache: Use DB cache (set False for AI analysis to get latest)
        """
        try:
            logger.info(f"Searching Polymarket markets for keyword: '{keyword}' (limit={limit}, use_cache={use_cache})")
            
            # If cache allowed, try DB search first
            if use_cache:
                with get_db_connection() as db:
                    cur = db.cursor()
                    # Search question and slug; support market_id exact match
                    keyword_lower = keyword.lower()
                    is_numeric = keyword_lower.isdigit()
                    has_hyphens = '-' in keyword_lower
                    
                    if is_numeric:
                        # If numeric, treat as market_id exact match
                        cur.execute("""
                            SELECT market_id, question, category, current_probability, 
                                   volume_24h, liquidity, end_date_iso, status, slug
                            FROM qd_polymarket_markets
                            WHERE market_id = %s AND status = 'active'
                            ORDER BY volume_24h DESC
                            LIMIT %s
                        """, (keyword, limit))
                    elif has_hyphens:
                        # If contains hyphen, may be slug; match slug first
                        cur.execute("""
                            SELECT market_id, question, category, current_probability, 
                                   volume_24h, liquidity, end_date_iso, status, slug
                            FROM qd_polymarket_markets
                            WHERE (slug ILIKE %s OR question ILIKE %s) AND status = 'active'
                            ORDER BY 
                                CASE WHEN slug ILIKE %s THEN 1 ELSE 2 END,
                                volume_24h DESC
                            LIMIT %s
                        """, (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%", limit))
                    else:
                        # Plain text search
                        cur.execute("""
                            SELECT market_id, question, category, current_probability, 
                                   volume_24h, liquidity, end_date_iso, status, slug
                            FROM qd_polymarket_markets
                            WHERE (question ILIKE %s OR slug ILIKE %s) AND status = 'active'
                            ORDER BY volume_24h DESC
                            LIMIT %s
                        """, (f"%{keyword}%", f"%{keyword}%", limit))
                    
                    rows = cur.fetchall()
                    cur.close()
                    
                    if rows:
                        logger.info(f"Found {len(rows)} markets in database for keyword '{keyword}'")
                        return [{
                            "market_id": str(row.get('market_id') or ''),
                            "question": row.get('question') or '',
                            "category": row.get('category') or 'other',
                            "current_probability": float(row.get('current_probability') or 0),
                            "volume_24h": float(row.get('volume_24h') or 0),
                            "liquidity": float(row.get('liquidity') or 0),
                            "end_date_iso": row.get('end_date_iso'),
                            "status": row.get('status') or 'active',
                            "polymarket_url": self._build_polymarket_url(row.get('slug'), row.get('market_id') or ''),
                            "slug": row.get('slug') if row.get('slug') and not str(row.get('slug', '')).isdigit() else None
                        } for row in rows]
            
            # Fetch from Gamma API and filter (for AI analysis)
            logger.info(f"Fetching from API for keyword '{keyword}' (use_cache={use_cache})...")
            
            # If keyword looks like slug, try direct query first
            import re
            keyword_lower = keyword.lower().strip()
            is_slug_like = '-' in keyword_lower and not keyword_lower.isdigit()
            
            if is_slug_like:
                # Try direct slug query (per Polymarket API docs)
                direct_market = self._fetch_market_by_slug(keyword_lower)
                if direct_market:
                    logger.info(f"Found market directly by slug (no need to fetch all markets): {keyword_lower}")
                    return [direct_market]
            
            # If direct query failed, fetch more (multiple requests, ~100 events each)
            all_markets = []
            max_requests = 3  # up to 3 requests, ~300 events
            for page in range(max_requests):
                page_markets = self._fetch_from_gamma_api(category=None, limit=100)
                if not page_markets:
                    break
                all_markets.extend(page_markets)
                # Stop early if we have enough
                if len(all_markets) >= 3000:
                    break
                logger.info(f"Fetched page {page + 1}/{max_requests}, total markets: {len(all_markets)}")
                # Short delay to avoid rate limit
                if page < max_requests - 1:
                    time.sleep(0.5)
            logger.info(f"Fetched {len(all_markets)} markets from API, filtering for keyword '{keyword}'...")
            
            # Filter by keywords (and slug if keyword looks like slug)
            keyword_is_slug = '-' in keyword_lower
            # Extract keywords: strip punctuation, keep alnum and hyphen
            keyword_words = re.findall(r'\b\w+\b', keyword_lower)
            # Drop very short and stopwords
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'must'}
            keyword_words = [w for w in keyword_words if len(w) >= 3 and w not in stop_words]
            
            # If no keywords extracted, use raw keyword
            if not keyword_words:
                keyword_words = [keyword_lower]
            
            logger.info(f"Extracted keywords: {keyword_words} from '{keyword}'")
            
            filtered = []
            scored_markets = []
            top_candidates = []  # near-matches for debugging
            
            for market in all_markets:
                question = market.get("question", "").lower()
                slug = (market.get("slug") or "").lower()
                market_id = str(market.get("market_id") or "")
                
                score = 0
                match_reason = ""
                
                # 1. Exact match (score 100)
                if keyword_lower in question:
                    score = 100
                    match_reason = "exact_match_question"
                elif keyword_lower == slug:
                    score = 100
                    match_reason = "exact_match_slug"
                
                # 2. If keyword looks like slug, check slug
                if score < 100 and keyword_is_slug:
                    if keyword_lower == slug:
                        score = 100
                        match_reason = "exact_slug_match"
                    elif keyword_lower in slug or slug in keyword_lower:
                        score = 90
                        match_reason = "partial_slug_match"
                
                # 3. If keyword is numeric, check market_id
                if score < 90 and keyword_lower.isdigit():
                    if keyword_lower == market_id:
                        score = 100
                        match_reason = "market_id_match"
                
                # 4. Keyword match: all keywords in question
                if score < 90 and keyword_words:
                    # Count matching keywords
                    matched_words = sum(1 for word in keyword_words if word in question or word in slug)
                    if matched_words > 0:
                        # Match ratio
                        match_ratio = matched_words / len(keyword_words)
                        # Lower threshold 60% -> 40% for better match rate
                        if match_ratio >= 0.4:
                            score = int(60 + match_ratio * 30)  # 60-90
                            match_reason = f"keyword_match_{matched_words}/{len(keyword_words)}"
                        else:
                            # Log near-match for debugging
                            if matched_words >= 1 and len(top_candidates) < 5:
                                top_candidates.append((match_ratio, market.get('question', '')[:80], matched_words, len(keyword_words)))
                
                # 5. Partial match: main part of keyword in question
                if score < 60 and keyword_words:
                    # If multi-word keyword, match main part
                    if len(keyword_words) > 1:
                        # First 3 significant words
                        important_words = keyword_words[:3]
                        matched_important = sum(1 for word in important_words if word in question or word in slug)
                        # Require at least 1 significant word match
                        if matched_important >= 1:
                            score = 50
                            match_reason = f"important_words_match_{matched_important}/{len(important_words)}"
                
                if score >= 50:  # min score 50
                    scored_markets.append((score, market, match_reason))
                    logger.debug(f"Matched (score={score}, reason={match_reason}): {market.get('question', '')[:60]}")
            
            # Sort by score, take top limit
            scored_markets.sort(key=lambda x: x[0], reverse=True)
            filtered = [market for score, market, reason in scored_markets[:limit]]
            
            # Debug output
            if len(scored_markets) == 0 and top_candidates:
                logger.warning(f"No exact matches found. Top candidates (partial matches):")
                for ratio, question, matched, total in top_candidates:
                    logger.warning(f"  - {question} (matched {matched}/{total} keywords, ratio={ratio:.2f})")
            
            logger.info(f"Filtered {len(filtered)} markets matching keyword '{keyword}' from API (from {len(all_markets)} total markets, {len(scored_markets)} scored matches)")
            if len(scored_markets) > 0:
                logger.info(f"Top match: {filtered[0].get('question', '')[:80]} (score={scored_markets[0][0]})")
            return filtered
            
        except Exception as e:
            logger.error(f"Failed to search markets: {e}", exc_info=True)
            return []
    
    def _get_cached_markets(self, category: str = None, limit: int = 50) -> Optional[List[Dict]]:
        """Read market data from DB cache."""
        try:
            with get_db_connection() as db:
                cur = db.cursor()
                
                # Check cache is fresh (5 min)
                cutoff_time = datetime.now() - timedelta(seconds=self.cache_ttl)
                
                query = """
                    SELECT market_id, question, category, current_probability, 
                           volume_24h, liquidity, end_date_iso, status, outcome_tokens
                    FROM qd_polymarket_markets
                    WHERE status = 'active' AND updated_at > %s
                """
                params = [cutoff_time]
                
                if category:
                    query += " AND category = %s"
                    params.append(category)
                
                query += " ORDER BY volume_24h DESC LIMIT %s"
                params.append(limit)
                
                cur.execute(query, params)
                rows = cur.fetchall()
                cur.close()
                
                if rows:
                    result = []
                    for row in rows:
                        market_id = str(row.get('market_id') or '')
                        slug = row.get('slug')
                        # Ensure correct URL build
                        polymarket_url = self._build_polymarket_url(slug, market_id)
                        result.append({
                            "market_id": market_id,
                            "question": row.get('question') or '',
                            "category": row.get('category') or 'other',
                            "current_probability": float(row.get('current_probability') or 0),
                            "volume_24h": float(row.get('volume_24h') or 0),
                            "liquidity": float(row.get('liquidity') or 0),
                            "end_date_iso": row.get('end_date_iso'),
                            "status": row.get('status') or 'active',
                            "outcome_tokens": row.get('outcome_tokens') if row.get('outcome_tokens') else {},
                            "polymarket_url": polymarket_url,
                            "slug": slug if slug and not str(slug).isdigit() else None
                        })
                    return result
            
            return None
        except Exception as e:
            logger.debug(f"Failed to get cached markets: {e}")
            return None
    
    def _fetch_markets_from_api(self, category: str = None, limit: int = 50) -> List[Dict]:
        """
        Fetch market data from Polymarket Gamma API (/events endpoint).
        """
        try:
            # Use Gamma /events endpoint (recommended). Parser returns all markets; we filter by category here.
            markets = self._fetch_from_gamma_api(category, limit)
            if markets and category:
                markets = [m for m in markets if (m.get("category") or "").lower() == category.lower()]
            if markets:
                # Sort by volume_24h desc (API has no order param)
                markets.sort(key=lambda x: x.get('volume_24h', 0), reverse=True)
                return markets[:limit]
            
            if not markets:
                logger.warning(f"Gamma API failed to fetch markets for category '{category}' (API down, network, rate limit, or empty)")
            return []
            
        except Exception as e:
            logger.error(f"Failed to fetch markets from API: {e}", exc_info=True)
            return []
    
    def _fetch_from_gamma_api(self, category: str = None, limit: int = 50) -> List[Dict]:
        """
        Fetch markets via Gamma /events endpoint. See Polymarket docs.
        """
        try:
            # Use /events for active markets (docs: Polymarket market-data)
            url = f"{self.gamma_api}/events"
            params = {
                "active": "true",
                "closed": "false",
                "limit": min(limit * 2, 100)
            }
            
            # Optional order param (volume_24hr, etc.); remove if 422
            
            # Category filter would need tag_id; for now fetch all and filter
            if category:
                # Fetch all, filter on parse
                pass
            
            logger.info(f"Fetching from Gamma API: {url} with params: {params}")
            response = self.session.get(url, params=params, timeout=15)
            
            logger.info(f"Gamma API response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.debug(f"Gamma API returned data type: {type(data)}, keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
                    
                    # Response may be list or { data: [...] }
                    # Parse all events without category filter; caller filters by category
                    if isinstance(data, list):
                        logger.info(f"Gamma API returned list with {len(data)} items")
                        markets = self._parse_gamma_events(data, category_filter=None)
                        logger.info(f"Parsed {len(markets)} markets from Gamma API")
                        return markets
                    elif isinstance(data, dict):
                        # May be {"data": [...]}
                        if "data" in data:
                            events_list = data["data"]
                            logger.info(f"Gamma API returned dict with 'data' field containing {len(events_list) if isinstance(events_list, list) else 'non-list'} items")
                            markets = self._parse_gamma_events(events_list, category_filter=None)
                            logger.info(f"Parsed {len(markets)} markets from Gamma API")
                            return markets
                        # Or raw event objects
                        elif "id" in data or "slug" in data:
                            logger.info("Gamma API returned single event object")
                            markets = self._parse_gamma_events([data], category_filter=None)
                            logger.info(f"Parsed {len(markets)} markets from Gamma API")
                            return markets
                        else:
                            logger.warning(f"Gamma API returned dict with unexpected keys: {list(data.keys())}")
                            logger.debug(f"Full response: {str(data)[:500]}")
                    
                    logger.warning(f"Gamma API returned unexpected format: {type(data)}")
                    return []
                except json.JSONDecodeError as je:
                    logger.error(f"Gamma API returned invalid JSON: {je}")
                    logger.error(f"Response text (first 500 chars): {response.text[:500]}")
                    return []
            
            # Non-200
            status_code = response.status_code
            if status_code == 429:
                logger.warning("Gamma API rate limited (429). Retry later or reduce request frequency.")
            elif status_code == 503:
                logger.warning("Gamma API service unavailable (503). Polymarket API may be under maintenance.")
            elif status_code >= 500:
                logger.warning(f"Gamma API server error ({status_code}). Polymarket server may be temporarily unavailable.")
            else:
                logger.warning(f"Gamma API returned status {status_code}")
            logger.debug(f"Response headers: {dict(response.headers)}")
            logger.debug(f"Response text (first 500 chars): {response.text[:500]}")
            return []
            
        except requests.exceptions.Timeout:
            logger.warning("Gamma API request timeout after 15s (network or slow API).")
            return []
        except requests.exceptions.ConnectionError as ce:
            logger.warning(f"Gamma API connection error: {ce} (possible cause: network or Polymarket API unreachable)")
            return []
        except Exception as e:
            logger.warning(f"Gamma API failed: {e} (possible cause: API change, network, or service error)")
            return []
    
    def _parse_gamma_events(self, events_data: List[Dict], category_filter: str = None) -> List[Dict]:
        """
        Parse event data returned by the Gamma API.
        The /events endpoint returns event objects; each event contains associated market data.
        Per docs: event has a markets array; each market has clobTokenIds, outcomePrices, etc.
        """
        parsed = []
        if not events_data:
            logger.warning("_parse_gamma_events received empty events_data")
            return parsed
            
        logger.info(f"Parsing {len(events_data)} events from Gamma API")
        
        # Log first event keys for debugging
        if events_data:
            first_event_keys = list(events_data[0].keys())[:10]
            logger.info(f"First event keys: {first_event_keys}")
            logger.debug(f"First event sample: {str(events_data[0])[:500]}")
        
        for idx, event in enumerate(events_data):
            try:
                # Gamma API event structure: event may have multiple markets or be market data itself
                markets = event.get("markets", [])
                
                if not markets:
                    # Check if event is directly a market (has question/title)
                    if "question" in event or "title" in event or "slug" in event:
                        markets = [event]
                    else:
                        if idx < 3:
                            logger.debug(f"Event {idx} has no markets and doesn't look like a market. Keys: {list(event.keys())[:10]}")
                        continue
                
                if idx < 3:
                    logger.debug(f"Processing event {idx} with {len(markets)} markets")
                
                for market_idx, market in enumerate(markets):
                    try:
                        # Extract basic market info
                        market_id = market.get("id") or market.get("slug") or event.get("id") or event.get("slug", "")
                        question = market.get("question") or event.get("question") or market.get("title") or event.get("title", "")
                        
                        if idx < 3 and market_idx < 2:
                            logger.info(f"Event {idx}, Market {market_idx}: id={market_id}, question={question[:50] if question else 'None'}, event_slug={event.get('slug')}, market_slug={market.get('slug')}, keys={list(market.keys())[:10]}")
                        
                        if not question:
                            if idx < 3:
                                logger.warning(f"Event {idx}, Market {market_idx}: No question found, skipping. Market keys: {list(market.keys())[:10]}")
                            continue
                        
                        # Infer category (caller filters by category after parsing)
                        inferred_category = self._infer_category(question)
                        
                        # Get probability and outcome data
                        current_probability = 50.0
                        outcome_tokens = {}
                        
                        # Method 1: get live price from CLOB API (most accurate)
                        try:
                            condition_id = market.get("conditionId") or event.get("conditionId")
                            if condition_id:
                                prices = self._get_market_prices_from_clob(condition_id)
                                if prices:
                                    yes_price = prices.get("YES", 0)
                                    no_price = prices.get("NO", 0)
                                    if yes_price > 0:
                                        current_probability = yes_price * 100 if yes_price <= 1 else yes_price
                                        outcome_tokens["YES"] = {"price": yes_price if yes_price <= 1 else yes_price / 100, "volume": 0}
                                    if no_price > 0:
                                        outcome_tokens["NO"] = {"price": no_price if no_price <= 1 else no_price / 100, "volume": 0}
                        except Exception as e:
                            logger.debug(f"Failed to get prices from CLOB API: {e}")
                        
                        # Method 2: parse outcomePrices (may be JSON string)
                        if current_probability == 50.0:
                            outcome_prices_str = market.get("outcomePrices") or event.get("outcomePrices")
                            if outcome_prices_str:
                                try:
                                    if isinstance(outcome_prices_str, str):
                                        outcome_prices = json.loads(outcome_prices_str)
                                    else:
                                        outcome_prices = outcome_prices_str
                                    
                                    # outcomePrices typically ["0.65", "0.35"] for YES and NO
                                    if isinstance(outcome_prices, list) and len(outcome_prices) >= 2:
                                        yes_price = _safe_float(outcome_prices[0], 0)
                                        no_price = _safe_float(outcome_prices[1], 0)
                                        current_probability = yes_price * 100 if yes_price <= 1 else yes_price
                                        outcome_tokens["YES"] = {"price": yes_price if yes_price <= 1 else yes_price / 100, "volume": 0}
                                        outcome_tokens["NO"] = {"price": no_price if no_price <= 1 else no_price / 100, "volume": 0}
                                except Exception as e:
                                    logger.debug(f"Failed to parse outcomePrices: {e}")
                        
                        outcomes = market.get("outcomes") or market.get("tokens") or event.get("outcomes") or []
                        for outcome in outcomes:
                            try:
                                if isinstance(outcome, str):
                                    outcome_upper = outcome.upper()
                                    if "YES" in outcome_upper:
                                        if "YES" not in outcome_tokens:
                                            outcome_tokens["YES"] = {"price": 0.5, "volume": 0}
                                    elif "NO" in outcome_upper:
                                        if "NO" not in outcome_tokens:
                                            outcome_tokens["NO"] = {"price": 0.5, "volume": 0}
                                    continue
                                
                                if not isinstance(outcome, dict):
                                    continue
                                
                                title = str(outcome.get("title") or outcome.get("name", "")).upper()
                                price = _safe_float(outcome.get("price") or outcome.get("probability") or outcome.get("currentPrice"), 0)
                                
                                if "YES" in title or title == "YES" or outcome.get("outcome") == "Yes":
                                    current_probability = price * 100 if price <= 1 else price
                                    outcome_tokens["YES"] = {
                                        "price": price if price <= 1 else price / 100,
                                        "volume": _safe_float(outcome.get("volume") or outcome.get("volume24hr"), 0)
                                    }
                                elif "NO" in title or title == "NO" or outcome.get("outcome") == "No":
                                    outcome_tokens["NO"] = {
                                        "price": price if price <= 1 else price / 100,
                                        "volume": _safe_float(outcome.get("volume") or outcome.get("volume24hr"), 0)
                                    }
                            except Exception as e:
                                logger.debug(f"Failed to parse outcome: {e}")
                                continue
                        
                        if current_probability == 50.0:
                            prob = market.get("probability") or market.get("yesProbability") or event.get("probability")
                            if prob is not None:
                                p = _safe_float(prob, 0.5)
                                current_probability = p * 100 if p <= 1 else p
                        
                        # Volume and liquidity (safe parse to avoid ValueError on bad API data)
                        volume_24h = _safe_float(
                            market.get("volume_24hr") or market.get("volume24hr") or market.get("volume_24h")
                            or event.get("volume_24hr") or event.get("volume24hr"),
                            0
                        )
                        liquidity = _safe_float(
                            market.get("liquidity") or market.get("totalLiquidity") or event.get("liquidity"),
                            0
                        )
                        
                        # Parse end date
                        end_date_iso = None
                        end_date = market.get("endDate") or market.get("end_date") or event.get("endDate") or event.get("end_date")
                        if end_date:
                            try:
                                if isinstance(end_date, (int, float)):
                                    end_date_iso = datetime.fromtimestamp(end_date).isoformat() + "Z"
                                elif isinstance(end_date, str):
                                    end_date_iso = end_date
                            except Exception:
                                pass
                        
                        slug = None
                        if event.get("slug"):
                            slug_str = str(event.get("slug", "")).strip()
                            if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                                slug = slug_str
                        
                        if not slug and market.get("slug"):
                            slug_str = str(market.get("slug", "")).strip()
                            if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                                slug = slug_str
                        
                        if not slug and market_id:
                            try:
                                detail_market = self._fetch_market_detail_by_id(market_id)
                                if detail_market and detail_market.get("slug"):
                                    slug_str = str(detail_market.get("slug", "")).strip()
                                    if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                                        slug = slug_str
                            except Exception as e:
                                logger.debug(f"Failed to fetch slug for market {market_id}: {e}")
                        
                        polymarket_url = self._build_polymarket_url(slug, market_id)
                        if not slug:
                            logger.warning(f"Market {market_id} has no valid slug, using markets endpoint as fallback")
                        
                        market_data = {
                            "market_id": market_id,
                            "question": question,
                            "category": inferred_category,
                            "current_probability": round(current_probability, 2),
                            "volume_24h": volume_24h,
                            "liquidity": liquidity,
                            "end_date_iso": end_date_iso,
                            "status": "active" if market.get("active", event.get("active", True)) else "closed",
                            "outcome_tokens": outcome_tokens,
                            "polymarket_url": polymarket_url,
                            "slug": slug if slug else None
                        }
                    
                        parsed.append(market_data)
                        
                        if idx < 3 and market_idx < 2:
                            logger.info(f"Successfully parsed market: {question[:50]}, prob={current_probability:.1f}%, volume={volume_24h}")
                    except Exception as e:
                        logger.debug(f"Failed to parse market {market_idx} in event {idx}: {e}")
                        continue
                    
            except Exception as e:
                logger.warning(f"Failed to parse event {idx} (id={event.get('id', event.get('slug', 'unknown'))}): {e}", exc_info=True)
                continue
        
        logger.info(f"Successfully parsed {len(parsed)} markets from {len(events_data)} events")
        return parsed
    
    def _parse_rest_markets(self, markets_data: List[Dict]) -> List[Dict]:
        """Parse market data returned by the REST API."""
        parsed = []
        for market in markets_data:
            try:
                # Extract basic info
                market_id = market.get("id") or market.get("slug") or market.get("market_id", "")
                question = market.get("question") or market.get("title", "")
                
                # Calculate probability
                current_probability = 50.0
                outcome_tokens = {}
                
                if "outcomes" in market:
                    for outcome in market["outcomes"]:
                        title = str(outcome.get("title", "")).upper()
                        price = float(outcome.get("price", outcome.get("probability", 0)) or 0)
                        if "YES" in title or title == "YES":
                            current_probability = price * 100
                            outcome_tokens["YES"] = {
                                "price": price,
                                "volume": float(outcome.get("volume", 0) or 0)
                            }
                        elif "NO" in title or title == "NO":
                            outcome_tokens["NO"] = {
                                "price": price,
                                "volume": float(outcome.get("volume", 0) or 0)
                            }
                
                volume_24h = float(market.get("volume_24h", market.get("volume", 0)) or 0)
                liquidity = float(market.get("liquidity", 0) or 0)
                
                # Infer category
                category = self._infer_category(question)
                
                # Parse end date
                end_date_iso = market.get("end_date") or market.get("endDate")
                if isinstance(end_date_iso, (int, float)):
                    try:
                        end_date_iso = datetime.fromtimestamp(end_date_iso).isoformat() + "Z"
                    except:
                        end_date_iso = None
                
                # Get slug for URL build
                slug = None
                slug_str = str(market.get('slug', '')).strip() if market.get('slug') else ''
                
                # Check slug is valid (not number, contains letters or dashes)
                if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                    slug = slug_str
                else:
                    # If slug is invalid, try to fetch from API
                    try:
                        detail_market = self._fetch_market_detail_by_id(market_id)
                        if detail_market and detail_market.get("slug"):
                            slug_str = str(detail_market.get("slug", "")).strip()
                            if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                                slug = slug_str
                    except Exception as e:
                        logger.debug(f"Failed to fetch slug for market {market_id}: {e}")
                polymarket_url = self._build_polymarket_url(slug, market_id)
                if not slug:
                    logger.warning(f"Market {market_id} has no valid slug, using markets endpoint as fallback")
                
                parsed.append({
                    "market_id": market_id,
                    "question": question,
                    "category": category,
                    "current_probability": round(current_probability, 2),
                    "volume_24h": volume_24h,
                    "liquidity": liquidity,
                    "end_date_iso": end_date_iso,
                    "status": "active" if market.get("active", True) else "closed",
                    "outcome_tokens": outcome_tokens,
                    "polymarket_url": polymarket_url,
                    "slug": slug if slug else None
                })
            except Exception as e:
                logger.debug(f"Failed to parse market {market.get('id')}: {e}")
                continue
        
        return parsed
    
    def _infer_category(self, question: str) -> str:
        """Infer category from question."""
        question_lower = question.lower()
        
        # Crypto keywords
        crypto_keywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'crypto', 'token', 'coin', 'defi', 'nft']
        if any(kw in question_lower for kw in crypto_keywords):
            return "crypto"
        
        # Politics keywords
        politics_keywords = ['election', 'president', 'trump', 'biden', 'senate', 'congress', 'vote', 'political', 'democrat', 'republican']
        if any(kw in question_lower for kw in politics_keywords):
            return "politics"
        
        # Economics keywords
        economics_keywords = ['gdp', 'inflation', 'unemployment', 'fed', 'federal reserve', 'interest rate', 'economic', 'economy', 'recession', 'gdp growth', 'cpi', 'ppi']
        if any(kw in question_lower for kw in economics_keywords):
            return "economics"
        
        # Sports keywords
        sports_keywords = ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'baseball', 'championship', 'world cup', 'olympics', 'super bowl', 'stanley cup', 'world series']
        if any(kw in question_lower for kw in sports_keywords):
            return "sports"
        
        # Tech keywords
        tech_keywords = ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'tech', 'technology', 'apple', 'google', 'microsoft', 'meta', 'tesla', 'ipo', 'startup']
        if any(kw in question_lower for kw in tech_keywords):
            return "tech"
        
        # Finance keywords
        finance_keywords = ['stock', 's&p', 'dow', 'nasdaq', 'market cap', 'earnings', 'revenue', 'profit', 'bank', 'banking', 'financial', 'trading']
        if any(kw in question_lower for kw in finance_keywords):
            return "finance"
        
        # Geopolitics keywords
        geopolitics_keywords = ['war', 'conflict', 'russia', 'ukraine', 'china', 'taiwan', 'north korea', 'iran', 'israel', 'palestine', 'middle east', 'nato', 'sanctions']
        if any(kw in question_lower for kw in geopolitics_keywords):
            return "geopolitics"
        
        # Culture keywords
        culture_keywords = ['movie', 'film', 'oscar', 'grammy', 'award', 'celebrity', 'music', 'album', 'tv show', 'series', 'netflix', 'disney']
        if any(kw in question_lower for kw in culture_keywords):
            return "culture"
        
        # Climate keywords
        climate_keywords = ['climate', 'global warming', 'temperature', 'carbon', 'emission', 'renewable', 'solar', 'wind energy', 'paris agreement', 'cop']
        if any(kw in question_lower for kw in climate_keywords):
            return "climate"
        
        # Entertainment keywords
        entertainment_keywords = ['game', 'gaming', 'esports', 'tournament', 'streaming', 'youtube', 'twitch', 'podcast', 'comic', 'anime', 'manga']
        if any(kw in question_lower for kw in entertainment_keywords):
            return "entertainment"
        
        return "other"
    
    def _build_polymarket_url(self, slug: Optional[str], market_id: str) -> str:
        """
        Build Polymarket URL from slug.
        See: https://docs.polymarket.com/market-data/fetching-markets
        
        Args:
            slug: slug fetched from API or database (may be None or number string)
            market_id: market ID (as fallback)
        
        Returns:
            Polymarket URL string
        """
        if slug:
            slug_str = str(slug).strip()
            # Check slug is valid (not number, contains letters or dashes)
            if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                import re
                slug_clean = re.sub(r'[^a-zA-Z0-9\-]', '-', slug_str)
                slug_clean = slug_clean.strip('-')
                if slug_clean:
                    return f"https://polymarket.com/event/{slug_clean}"
        
        # If no valid slug, try to fetch from API
        if market_id:
            try:
                detail_market = self._fetch_market_detail_by_id(market_id)
                if detail_market:
                    # Try to get slug from detail
                    event_slug = detail_market.get('slug')
                    if event_slug:
                        slug_str = str(event_slug).strip()
                        if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                            import re
                            slug_clean = re.sub(r'[^a-zA-Z0-9\-]', '-', slug_str)
                            slug_clean = slug_clean.strip('-')
                            if slug_clean:
                                return f"https://polymarket.com/event/{slug_clean}"
                    
                    # If event has no slug, try to get from markets
                    markets = detail_market.get('markets', [])
                    if markets:
                        for m in markets:
                            market_slug = m.get('slug')
                            if market_slug:
                                slug_str = str(market_slug).strip()
                                if slug_str and not slug_str.isdigit() and ('-' in slug_str or any(c.isalpha() for c in slug_str)):
                                    import re
                                    slug_clean = re.sub(r'[^a-zA-Z0-9\-]', '-', slug_str)
                                    slug_clean = slug_clean.strip('-')
                                    if slug_clean:
                                        return f"https://polymarket.com/event/{slug_clean}"
            except Exception as e:
                logger.debug(f"Failed to fetch slug for market {market_id}: {e}")
        
        # If all methods fail, return search page (more reliable)
        return f"https://polymarket.com/search?q={market_id}"
    
    def _fetch_market_detail_by_id(self, market_id: str) -> Optional[Dict]:
        """
        Fetch market detail by market ID from API (for slug retrieval).
        See: https://docs.polymarket.com/market-data/fetching-markets
        """
        try:
            # Method 1: try to query via events endpoint (recommended, because events contain markets)
            url = f"{self.gamma_api}/events"
            params = {"active": "true", "closed": "false", "limit": 100}
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                events = response.json()
                if isinstance(events, list):
                    for event in events:
                        markets = event.get("markets", [])
                        if not markets and ("question" in event or "slug" in event):
                            markets = [event]
                        
                        for market in markets:
                            m_id = market.get("id") or market.get("slug") or ""
                            e_id = event.get("id") or event.get("slug") or ""
                            # Match market_id or event_id
                            if str(m_id) == str(market_id) or str(e_id) == str(market_id):
                                # Return event (because event contains slug)
                                return event
                elif isinstance(events, dict):
                    if "data" in events:
                        events_list = events["data"]
                        for event in events_list:
                            markets = event.get("markets", [])
                            if not markets and ("question" in event or "slug" in event):
                                markets = [event]
                            
                            for market in markets:
                                m_id = market.get("id") or market.get("slug") or ""
                                e_id = event.get("id") or event.get("slug") or ""
                                if str(m_id) == str(market_id) or str(e_id) == str(market_id):
                                    return event
            
            # Method 2: try markets endpoint
            url = f"{self.gamma_api}/markets"
            params = {"id": market_id, "limit": 1}
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                elif isinstance(data, dict) and "id" in data:
                    return data
            
            return None
        except Exception as e:
            logger.debug(f"Failed to fetch market detail by ID {market_id}: {e}")
            return None
    
    def _fetch_market_by_slug(self, slug: str) -> Optional[Dict]:
        """
        Fetch market by slug (most efficient). Use /markets?slug=xxx per Polymarket API docs.
        """
        try:
            # Method 1: query markets endpoint by slug
            url = f"{self.gamma_api}/markets"
            params = {"slug": slug, "limit": 10}
            logger.info(f"Fetching market by slug from Gamma API: {url} with params: {params}")
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    markets = self._parse_gamma_events(data)
                    for market in markets:
                        market_slug = market.get("slug", "").lower()
                        if market_slug == slug.lower() or slug.lower() in market_slug:
                            logger.info(f"Found market by slug: {slug}")
                            return market
                    if markets:
                        logger.info(f"Found market by slug (fuzzy match): {slug}")
                        return markets[0]
                elif isinstance(data, dict):
                    markets = self._parse_gamma_events([data])
                    if markets:
                        logger.info(f"Found market by slug: {slug}")
                        return markets[0]
            
            # Method 2: try events endpoint (events may contain slug)
            url = f"{self.gamma_api}/events"
            params = {"active": "true", "closed": "false", "limit": 100}
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                events = data if isinstance(data, list) else (data.get("data", []) if isinstance(data, dict) else [])
                for event in events:
                    event_slug = (event.get("slug") or "").lower()
                    if event_slug == slug.lower() or slug.lower() in event_slug:
                        parsed = self._parse_gamma_events([event])
                        if parsed:
                            logger.info(f"Found market by slug via events: {slug}")
                            return parsed[0]
            
            logger.warning(f"Market with slug '{slug}' not found via direct query")
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch market by slug {slug}: {e}", exc_info=True)
            return None
    
    def _fetch_market_from_api(self, market_id: str) -> Optional[Dict]:
        """Fetch a single market from Gamma API by slug or id."""
        try:
            is_slug = not market_id.isdigit() and ('-' in market_id or any(c.isalpha() for c in market_id))
            if is_slug:
                market = self._fetch_market_by_slug(market_id)
                if market:
                    return market
            url = f"{self.gamma_api}/markets"
            params = {"id": market_id, "limit": 10} if not is_slug else {"slug": market_id, "limit": 10}
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    markets = self._parse_gamma_events(data)
                    if markets:
                        return markets[0]
                elif isinstance(data, dict):
                    markets = self._parse_gamma_events([data])
                    if markets:
                        return markets[0]
            url = f"{self.gamma_api}/events"
            params = {
                "active": "true",
                "closed": "false",
                "limit": 100
            }
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                events = data if isinstance(data, list) else (data.get("data", []) if isinstance(data, dict) else [])
                for event in events:
                    markets = event.get("markets", [])
                    if not markets:
                        markets = [event]
                    
                    for market in markets:
                        m_id = market.get("id") or market.get("slug") or event.get("id") or event.get("slug", "")
                        if str(m_id) == str(market_id) or market.get("slug") == market_id:
                            parsed = self._parse_gamma_events([event])
                            if parsed:
                                return parsed[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch market {market_id}: {e}", exc_info=True)
            return None
    
    def _save_markets_to_db(self, markets: List[Dict]):
        """Save market data to the database."""
        if not is_postgres_available():
            return
        try:
            with get_db_connection() as db:
                cur = db.cursor()
                for market in markets:
                    slug = market.get('slug') or None
                    if slug and str(slug).isdigit():
                        slug = None
                    import re
                    if slug:
                        slug = re.sub(r'[^a-zA-Z0-9\-]', '-', str(slug))
                        slug = slug.strip('-')
                        if not slug or slug.isdigit():
                            slug = None
                    
                    cur.execute("""
                        INSERT INTO qd_polymarket_markets
                        (market_id, question, category, current_probability, volume_24h,
                         liquidity, end_date_iso, status, outcome_tokens, slug, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (market_id) DO UPDATE SET
                            question = EXCLUDED.question,
                            category = EXCLUDED.category,
                            current_probability = EXCLUDED.current_probability,
                            volume_24h = EXCLUDED.volume_24h,
                            liquidity = EXCLUDED.liquidity,
                            end_date_iso = EXCLUDED.end_date_iso,
                            status = EXCLUDED.status,
                            outcome_tokens = EXCLUDED.outcome_tokens,
                            slug = EXCLUDED.slug,
                            updated_at = NOW()
                    """, (
                        market.get('market_id'),
                        market.get('question'),
                        market.get('category', 'other'),
                        market.get('current_probability', 50.0),
                        market.get('volume_24h', 0),
                        market.get('liquidity', 0),
                        market.get('end_date_iso'),
                        market.get('status', 'active'),
                        json.dumps(market.get('outcome_tokens', {})),
                        slug
                    ))
                db.commit()
                cur.close()
        except Exception as e:
            err_msg = str(e).lower()
            if "psycopg2" in err_msg or "postgresql" in err_msg or "cannot use postgres" in err_msg:
                logger.debug("Skipped saving markets to DB (PostgreSQL unavailable): %s", e)
            else:
                logger.error("Failed to save markets to DB: %s", e, exc_info=True)
    
    def _get_sample_markets(self, category: str = None, limit: int = 50) -> List[Dict]:
        """Get sample market data (deprecated). Use real API data instead."""
        logger.warning("Sample data method called, but real API should be used instead")
        return []
