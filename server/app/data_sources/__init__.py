"""
Data source module.
Supports multiple market K-line data retrieval

Improved version (reference: daily_stock_analysis project):
- Circuit breaker protection (circuit_breaker)
- Data caching (cache_manager)
- Anti-ban strategy (rate_limiter)
"""
from app.data_sources.factory import DataSourceFactory
from app.data_sources.circuit_breaker import (
    CircuitBreaker,
    get_realtime_circuit_breaker
)
from app.data_sources.cache_manager import (
    DataCache,
    get_realtime_cache,
    get_kline_cache,
    get_stock_info_cache
)
from app.data_sources.rate_limiter import (
    RateLimiter,
    get_random_user_agent,
    random_sleep,
    retry_with_backoff
)

__all__ = [
    # Factory
    'DataSourceFactory',
    # Circuit breaker
    'CircuitBreaker',
    'get_realtime_circuit_breaker',
    # Cache
    'DataCache',
    'get_realtime_cache',
    'get_kline_cache',
    'get_stock_info_cache',
    # Rate limiter
    'RateLimiter',
    'get_random_user_agent',
    'random_sleep',
    'retry_with_backoff',
]
