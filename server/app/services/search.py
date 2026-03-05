"""
Search service v2.0 - multi-provider search with API key rotation and failover.

Supported providers (priority order):
1. Bocha - search optimization
2. Tavily - AI-optimized, 1000 req/month free
3. SerpAPI - Google/Bing scraping
4. Google CSE - custom search engine
5. Bing Search API
6. DuckDuckGo - free fallback
"""
import requests
import json
import time
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
from itertools import cycle
from urllib.parse import urlparse

from app.utils.logger import get_logger
from app.utils.config_loader import load_addon_config

logger = get_logger(__name__)

# Track Google API quota status
_google_quota_exhausted = False
_google_quota_reset_time = 0


@dataclass
class SearchResult:
    """Search result item."""
    title: str
    snippet: str
    url: str
    source: str
    published_date: Optional[str] = None
    sentiment: str = 'neutral'

    def to_text(self) -> str:
        """Format as text."""
        date_str = f" ({self.published_date})" if self.published_date else ""
        return f"[{self.source}] {self.title}{date_str}\n{self.snippet}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            'title': self.title,
            'link': self.url,
            'snippet': self.snippet,
            'source': self.source,
            'published': self.published_date or '',
            'sentiment': self.sentiment,
        }


@dataclass
class SearchResponse:
    """Search response."""
    query: str
    results: List[SearchResult]
    provider: str
    success: bool = True
    error_message: Optional[str] = None
    search_time: float = 0.0

    def to_context(self, max_results: int = 5) -> str:
        """Format results as context for AI analysis."""
        if not self.success or not self.results:
            return f"No results found for '{self.query}'."
        lines = [f"Search results for '{self.query}' (source: {self.provider})"]
        for i, result in enumerate(self.results[:max_results], 1):
            lines.append(f"\n{i}. {result.to_text()}")
        return "\n".join(lines)

    def to_list(self) -> List[Dict[str, Any]]:
        """Convert to list (legacy compatible)."""
        return [r.to_dict() for r in self.results]


class BaseSearchProvider(ABC):
    """Base search provider."""

    def __init__(self, api_keys: List[str], name: str):
        """
        Initialize search provider.

        Args:
            api_keys: API keys (supports rotation/load balancing)
            name: Provider name
        """
        self._api_keys = api_keys
        self._name = name
        self._key_cycle = cycle(api_keys) if api_keys else None
        self._key_usage: Dict[str, int] = {key: 0 for key in api_keys}
        self._key_errors: Dict[str, int] = {key: 0 for key in api_keys}
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def is_available(self) -> bool:
        """Whether an API key is available."""
        return bool(self._api_keys)

    def _get_next_key(self) -> Optional[str]:
        """
        Get next available API key (load balancing).
        Strategy: round-robin, skip keys with too many errors.
        """
        if not self._key_cycle:
            return None

        for _ in range(len(self._api_keys)):
            key = next(self._key_cycle)
            if self._key_errors.get(key, 0) < 3:
                return key

        logger.warning(f"[{self._name}] All API keys have errors; resetting error counts")
        self._key_errors = {key: 0 for key in self._api_keys}
        return self._api_keys[0] if self._api_keys else None
    
    def _record_success(self, key: str) -> None:
        """Record successful use."""
        self._key_usage[key] = self._key_usage.get(key, 0) + 1
        if key in self._key_errors and self._key_errors[key] > 0:
            self._key_errors[key] -= 1

    def _record_error(self, key: str) -> None:
        """Record error."""
        self._key_errors[key] = self._key_errors.get(key, 0) + 1
        logger.warning(f"[{self._name}] API Key {key[:8]}... error count: {self._key_errors[key]}")

    @abstractmethod
    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Execute search (implement in subclass)."""
        pass

    def search(self, query: str, max_results: int = 5, days: int = 7) -> SearchResponse:
        """
        Run search.

        Args:
            query: Search query
            max_results: Max results to return
            days: Time range in days (default 7)

        Returns:
            SearchResponse
        """
        api_key = self._get_next_key()
        if not api_key:
            return SearchResponse(
                query=query,
                results=[],
                provider=self._name,
                success=False,
                error_message=f"{self._name} API key not configured"
            )
        
        start_time = time.time()
        try:
            response = self._do_search(query, api_key, max_results, days=days)
            response.search_time = time.time() - start_time
            
            if response.success:
                self._record_success(api_key)
                logger.info(f"[{self._name}] search '{query}' ok, {len(response.results)} results in {response.search_time:.2f}s")
            else:
                self._record_error(api_key)

            return response

        except Exception as e:
            self._record_error(api_key)
            elapsed = time.time() - start_time
            logger.error(f"[{self._name}] search '{query}' failed: {e}")
            return SearchResponse(
                query=query,
                results=[],
                provider=self._name,
                success=False,
                error_message=str(e),
                search_time=elapsed
            )
    
    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL as source."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.replace('www.', '')
            return domain or 'unknown'
        except Exception:
            return 'unknown'


class TavilySearchProvider(BaseSearchProvider):
    """
    Tavily search provider.
    - AI/LLM-optimized search API
    - Free tier: 1000 requests/month
    - Structured results
    Docs: https://docs.tavily.com/
    """
    
    def __init__(self, api_keys: List[str]):
        super().__init__(api_keys, "Tavily")
    
    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run Tavily search."""
        try:
            from tavily import TavilyClient
        except ImportError:
            # If tavily-python not installed, use REST API
            return self._do_search_rest(query, api_key, max_results, days)

        try:
            client = TavilyClient(api_key=api_key)

            response = client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_answer=False,
                include_raw_content=False,
                days=days,
            )

            results = []
            for item in response.get('results', []):
                results.append(SearchResult(
                    title=item.get('title', ''),
                    snippet=item.get('content', '')[:500],
                    url=item.get('url', ''),
                    source=self._extract_domain(item.get('url', '')),
                    published_date=item.get('published_date'),
                ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            error_msg = str(e)
            if 'rate limit' in error_msg.lower() or 'quota' in error_msg.lower():
                error_msg = f"API quota exceeded: {error_msg}"
            
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=error_msg
            )
    
    def _do_search_rest(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Tavily search via REST API (fallback)."""
        try:
            url = "https://api.tavily.com/search"
            headers = {
                'Content-Type': 'application/json',
            }
            payload = {
                'api_key': api_key,
                'query': query,
                'search_depth': 'advanced',
                'max_results': max_results,
                'include_answer': False,
                'include_raw_content': False,
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            if response.status_code != 200:
                return SearchResponse(
                    query=query,
                    results=[],
                    provider=self.name,
                    success=False,
                    error_message=f"HTTP {response.status_code}: {response.text}"
                )
            
            data = response.json()
            results = []
            for item in data.get('results', []):
                results.append(SearchResult(
                    title=item.get('title', ''),
                    snippet=item.get('content', '')[:500],
                    url=item.get('url', ''),
                    source=self._extract_domain(item.get('url', '')),
                    published_date=item.get('published_date'),
                ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )


class BochaSearchProvider(BaseSearchProvider):
    """
    Bocha search provider.
    - AI-optimized search API
    - Time range filter and summaries
    Docs: https://bocha-ai.feishu.cn/wiki/RXEOw02rFiwzGSkd9mUcqoeAnNK
    """

    def __init__(self, api_keys: List[str]):
        super().__init__(api_keys, "Bocha")

    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run Bocha search."""
        try:
            url = "https://api.bochaai.com/v1/web-search"
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Time range
            freshness = "oneWeek"
            if days <= 1:
                freshness = "oneDay"
            elif days <= 7:
                freshness = "oneWeek"
            elif days <= 30:
                freshness = "oneMonth"
            else:
                freshness = "oneYear"

            payload = {
                "query": query,
                "freshness": freshness,
                "summary": True,
                "count": min(max_results, 50)
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            if response.status_code != 200:
                error_message = response.text
                try:
                    if response.headers.get('content-type', '').startswith('application/json'):
                        error_data = response.json()
                        error_message = error_data.get('message', response.text)
                except:
                    pass
                
                if response.status_code == 403:
                    error_msg = f"Insufficient balance: {error_message}"
                elif response.status_code == 401:
                    error_msg = f"Invalid API key: {error_message}"
                elif response.status_code == 429:
                    error_msg = f"Rate limit exceeded: {error_message}"
                else:
                    error_msg = f"HTTP {response.status_code}: {error_message}"
                
                return SearchResponse(
                    query=query,
                    results=[],
                    provider=self.name,
                    success=False,
                    error_message=error_msg
                )
            
            data = response.json()
            
            if data.get('code') != 200:
                return SearchResponse(
                    query=query,
                    results=[],
                    provider=self.name,
                    success=False,
                    error_message=data.get('msg') or f"API error code: {data.get('code')}"
                )
            
            results = []
            web_pages = data.get('data', {}).get('webPages', {})
            value_list = web_pages.get('value', [])
            
            for item in value_list[:max_results]:
                snippet = item.get('summary') or item.get('snippet', '')
                if snippet:
                    snippet = snippet[:500]
                
                results.append(SearchResult(
                    title=item.get('name', ''),
                    snippet=snippet,
                    url=item.get('url', ''),
                    source=item.get('siteName') or self._extract_domain(item.get('url', '')),
                    published_date=item.get('datePublished'),
                ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except requests.exceptions.Timeout:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message="Request timeout"
            )
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )


class SerpAPISearchProvider(BaseSearchProvider):
    """
    SerpAPI search provider.
    - Google, Bing, etc. via SerpAPI
    - Free tier: 100 requests/month
    Docs: https://serpapi.com/
    """

    def __init__(self, api_keys: List[str]):
        super().__init__(api_keys, "SerpAPI")

    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run SerpAPI search."""
        try:
            from serpapi import GoogleSearch
        except ImportError:
            return self._do_search_rest(query, api_key, max_results, days)
        
        try:
            tbs = "qdr:w"
            if days <= 1:
                tbs = "qdr:d"
            elif days <= 7:
                tbs = "qdr:w"
            elif days <= 30:
                tbs = "qdr:m"
            else:
                tbs = "qdr:y"

            params = {
                "engine": "google",
                "q": query,
                "api_key": api_key,
                "google_domain": "google.com.hk",
                "hl": "zh-cn",
                "gl": "cn",
                "tbs": tbs,
                "num": max_results
            }
            
            search = GoogleSearch(params)
            response = search.get_dict()
            
            results = []
            organic_results = response.get('organic_results', [])

            for item in organic_results[:max_results]:
                results.append(SearchResult(
                    title=item.get('title', ''),
                    snippet=item.get('snippet', '')[:500],
                    url=item.get('link', ''),
                    source=item.get('source', self._extract_domain(item.get('link', ''))),
                    published_date=item.get('date'),
                ))

            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )
    
    def _do_search_rest(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """SerpAPI search via REST (fallback)."""
        try:
            tbs = "qdr:w"
            if days <= 1:
                tbs = "qdr:d"
            elif days <= 7:
                tbs = "qdr:w"
            elif days <= 30:
                tbs = "qdr:m"
            
            url = "https://serpapi.com/search"
            params = {
                "engine": "google",
                "q": query,
                "api_key": api_key,
                "hl": "zh-cn",
                "gl": "cn",
                "tbs": tbs,
                "num": max_results
            }
            
            response = requests.get(url, params=params, timeout=15)
            
            if response.status_code != 200:
                return SearchResponse(
                    query=query,
                    results=[],
                    provider=self.name,
                    success=False,
                    error_message=f"HTTP {response.status_code}"
                )
            
            data = response.json()
            results = []
            
            for item in data.get('organic_results', [])[:max_results]:
                results.append(SearchResult(
                    title=item.get('title', ''),
                    snippet=item.get('snippet', '')[:500],
                    url=item.get('link', ''),
                    source=self._extract_domain(item.get('link', '')),
                    published_date=item.get('date'),
                ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )


class GoogleSearchProvider(BaseSearchProvider):
    """Google Custom Search (CSE) provider."""
    
    def __init__(self, api_key: str, cx: str):
        super().__init__([api_key] if api_key else [], "Google")
        self._cx = cx
    
    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run Google CSE search."""
        global _google_quota_exhausted, _google_quota_reset_time
        
        if not self._cx:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message="Google Search CX not configured"
            )
        
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': api_key,
                'cx': self._cx,
                'q': query,
                'num': min(max_results, 10),
            }
            
            # Time range
            if days <= 1:
                params['dateRestrict'] = 'd1'
            elif days <= 7:
                params['dateRestrict'] = 'w1'
            elif days <= 30:
                params['dateRestrict'] = 'm1'
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 429:
                _google_quota_exhausted = True
                import datetime
                tomorrow = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
                _google_quota_reset_time = tomorrow.timestamp()
                return SearchResponse(
                    query=query,
                    results=[],
                    provider=self.name,
                    success=False,
                    error_message="Google API quota exceeded"
                )
            
            response.raise_for_status()
            data = response.json()
            
            results = []
            if 'items' in data:
                for item in data['items']:
                    results.append(SearchResult(
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        url=item.get('link', ''),
                        source='Google',
                        published_date=item.get('pagemap', {}).get('metatags', [{}])[0].get('article:published_time', ''),
                    ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )


class BingSearchProvider(BaseSearchProvider):
    """Bing Search API provider."""
    
    def __init__(self, api_key: str):
        super().__init__([api_key] if api_key else [], "Bing")
    
    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run Bing search."""
        try:
            url = "https://api.bing.microsoft.com/v7.0/search"
            headers = {"Ocp-Apim-Subscription-Key": api_key}
            params = {
                "q": query,
                "count": max_results,
                "textDecorations": True,
                "textFormat": "HTML"
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            if 'webPages' in data and 'value' in data['webPages']:
                for item in data['webPages']['value']:
                    results.append(SearchResult(
                        title=item.get('name', ''),
                        snippet=item.get('snippet', ''),
                        url=item.get('url', ''),
                        source='Bing',
                        published_date=item.get('datePublished', ''),
                    ))
            
            return SearchResponse(
                query=query,
                results=results,
                provider=self.name,
                success=True,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )


class DuckDuckGoSearchProvider(BaseSearchProvider):
    """DuckDuckGo search (free, no API key)."""
    
    def __init__(self):
        super().__init__(['free'], "DuckDuckGo")
    
    def _do_search(self, query: str, api_key: str, max_results: int, days: int = 7) -> SearchResponse:
        """Run DuckDuckGo search."""
        try:
            # DuckDuckGo Instant Answer API
            url = "https://api.duckduckgo.com/"
            params = {
                'q': query,
                'format': 'json',
                'no_html': 1,
                'skip_disambig': 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            
            related_topics = data.get('RelatedTopics', [])
            for topic in related_topics[:max_results]:
                if isinstance(topic, dict):
                    if 'FirstURL' in topic:
                        results.append(SearchResult(
                            title=topic.get('Text', '')[:100],
                            snippet=topic.get('Text', ''),
                            url=topic.get('FirstURL', ''),
                            source='DuckDuckGo',
                        ))
                    elif 'Topics' in topic:
                        for sub_topic in topic['Topics']:
                            if len(results) >= max_results:
                                break
                            if 'FirstURL' in sub_topic:
                                results.append(SearchResult(
                                    title=sub_topic.get('Text', '')[:100],
                                    snippet=sub_topic.get('Text', ''),
                                    url=sub_topic.get('FirstURL', ''),
                                    source='DuckDuckGo',
                                ))
            
            if data.get('AbstractURL') and len(results) < max_results:
                results.insert(0, SearchResult(
                    title=data.get('Heading', query),
                    snippet=data.get('AbstractText', ''),
                    url=data.get('AbstractURL', ''),
                    source='DuckDuckGo',
                ))
            
            if not results:
                results = self._search_html(query, max_results)
            
            return SearchResponse(
                query=query,
                results=results[:max_results],
                provider=self.name,
                success=len(results) > 0,
            )
            
        except Exception as e:
            return SearchResponse(
                query=query,
                results=[],
                provider=self.name,
                success=False,
                error_message=str(e)
            )
    
    def _search_html(self, query: str, max_results: int) -> List[SearchResult]:
        """DuckDuckGo HTML search fallback."""
        try:
            url = "https://lite.duckduckgo.com/lite/"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            data = {'q': query}
            
            response = requests.post(url, headers=headers, data=data, timeout=10)
            response.raise_for_status()
            
            results = []
            html = response.text
            
            link_pattern = r'<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'
            snippet_pattern = r'<td[^>]*class="result-snippet"[^>]*>([^<]*)</td>'
            
            links = re.findall(link_pattern, html)
            snippets = re.findall(snippet_pattern, html)
            
            for i, (link, title) in enumerate(links[:max_results]):
                snippet = snippets[i] if i < len(snippets) else ''
                if link and title:
                    results.append(SearchResult(
                        title=title.strip(),
                        snippet=snippet.strip(),
                        url=link,
                        source='DuckDuckGo',
                    ))
            
            return results
            
        except Exception as e:
            logger.debug(f"DuckDuckGo HTML search failed: {e}")
            return []


class SearchService:
    """
    Search service: multiple providers, failover, result aggregation.
    """

    def __init__(self):
        self._providers: List[BaseSearchProvider] = []
        self._config = {}
        self._load_config()
        self._init_providers()

    def _load_config(self):
        """Load config."""
        config = load_addon_config()
        self._config = config.get('search', {})
        self.provider = self._config.get('provider', 'google')
        self.max_results = int(self._config.get('max_results', 10))
    
    def _init_providers(self):
        """Initialize search providers (priority order)."""
        from app.config import APIKeys

        bocha_keys = APIKeys.BOCHA_API_KEYS
        if bocha_keys:
            self._providers.append(BochaSearchProvider(bocha_keys))
            logger.info(f"Bocha search configured, {len(bocha_keys)} API key(s)")

        tavily_keys = APIKeys.TAVILY_API_KEYS
        if tavily_keys:
            self._providers.append(TavilySearchProvider(tavily_keys))
            logger.info(f"Tavily search configured, {len(tavily_keys)} API key(s)")

        # SerpAPI
        serpapi_keys = APIKeys.SERPAPI_KEYS
        if serpapi_keys:
            self._providers.append(SerpAPISearchProvider(serpapi_keys))
            logger.info(f"SerpAPI search configured, {len(serpapi_keys)} API key(s)")
        
        # 4. Google CSE
        google_api_key = self._config.get('google', {}).get('api_key')
        google_cx = self._config.get('google', {}).get('cx')
        if google_api_key and google_cx:
            self._providers.append(GoogleSearchProvider(google_api_key, google_cx))
            logger.info("Google CSE search configured")
        
        # 5. Bing
        bing_api_key = self._config.get('bing', {}).get('api_key')
        if bing_api_key:
            self._providers.append(BingSearchProvider(bing_api_key))
            logger.info("Bing search configured")
        
        # 6. DuckDuckGo（免费兜底）
        self._providers.append(DuckDuckGoSearchProvider())
        logger.info("DuckDuckGo search configured (free fallback)")

        if len(self._providers) == 1:
            logger.warning("Only DuckDuckGo available; consider configuring more search API keys")
    
    @property
    def is_available(self) -> bool:
        """Whether any search provider is available."""
        return any(p.is_available for p in self._providers)
    
    def search(self, query: str, num_results: int = None, date_restrict: str = None, days: int = 7) -> List[Dict[str, Any]]:
        """
        Run search (legacy list interface).

        Args:
            query: Search query
            num_results: Max results
            date_restrict: Time restrict (Google format e.g. 'd7')
            days: Days to search (overrides date_restrict if set)

        Returns:
            List of result dicts
        """
        limit = num_results if num_results else self.max_results

        # Parse date_restrict to days
        if date_restrict and not days:
            if date_restrict.startswith('d'):
                days = int(date_restrict[1:])
            elif date_restrict.startswith('w'):
                days = int(date_restrict[1:]) * 7
            elif date_restrict.startswith('m'):
                days = int(date_restrict[1:]) * 30
        
        response = self.search_with_fallback(query, limit, days)
        return response.to_list()
    
    def search_with_fallback(self, query: str, max_results: int = 5, days: int = 7) -> SearchResponse:
        """
        Run search with automatic failover across providers.

        Args:
            query: Search query
            max_results: Max results
            days: Days to search

        Returns:
            SearchResponse
        """
        for provider in self._providers:
            if not provider.is_available:
                continue
            
            response = provider.search(query, max_results, days)
            
            if response.success and response.results:
                return response
            else:
                logger.warning(f"{provider.name} search failed: {response.error_message}, trying next")

        return SearchResponse(
            query=query,
            results=[],
            provider="None",
            success=False,
            error_message="All search providers unavailable or failed"
        )
    
    def search_stock_news(
        self,
        stock_code: str,
        stock_name: str,
        market: str = "USStock",
        max_results: int = 5
    ) -> SearchResponse:
        """
        Search for stock-related news.

        Args:
            stock_code: Stock symbol
            stock_name: Stock name
            market: Market type
            max_results: Max results

        Returns:
            SearchResponse
        """
        today_weekday = datetime.now().weekday()
        if today_weekday == 0:  # Monday
            search_days = 3
        elif today_weekday >= 5:  # Weekend
            search_days = 2
        else:
            search_days = 1

        # Build query by market type
        if market == "USStock":
            query = f"{stock_name} {stock_code} stock news latest"
        elif market == "Crypto":
            query = f"{stock_name} crypto news price analysis"
        elif market == "Forex":
            query = f"{stock_name} {stock_code} forex news analysis"
        else:
            query = f"{stock_name} {stock_code} latest news"
        
        logger.info(f"Stock news search: {stock_name}({stock_code}), market={market}, days={search_days}")
        
        return self.search_with_fallback(query, max_results, search_days)
    
    def search_stock_events(
        self,
        stock_code: str,
        stock_name: str,
        event_types: Optional[List[str]] = None
    ) -> SearchResponse:
        """
        Search for stock-specific events (earnings, announcements, etc.).
        """
        if event_types is None:
            event_types = ["earnings forecast", "insider selling", "earnings report"]
        
        event_query = " OR ".join(event_types)
        query = f"{stock_name} ({event_query})"
        
        return self.search_with_fallback(query, max_results=5, days=30)


_search_service: Optional[SearchService] = None


def get_search_service() -> SearchService:
    """Get search service singleton."""
    global _search_service
    if _search_service is None:
        _search_service = SearchService()
    return _search_service


def reset_search_service() -> None:
    """Reset search service (e.g. after config change or in tests)."""
    global _search_service
    _search_service = None
