"""
Data source module.
K-line and quote data for multiple markets.

Features: circuit breaker, cache, rate limiter.
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
    'DataSourceFactory',
    'CircuitBreaker',
    'get_realtime_circuit_breaker',
    'DataCache',
    'get_realtime_cache',
    'get_kline_cache',
    'get_stock_info_cache',
    'RateLimiter',
    'get_random_user_agent',
    'random_sleep',
    'retry_with_backoff',
]
