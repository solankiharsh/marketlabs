# -*- coding: utf-8 -*-
"""
===================================
Rate limiter / anti-ban module
===================================

Reference: daily_stock_analysis project.
Anti-scraping: 1) random sleep (jitter), 2) random User-Agent, 3) exponential backoff retry, 4) request rate limit.
"""

import time
import random
import logging
from typing import Optional, Callable, Any, Type, Tuple
from functools import wraps

logger = logging.getLogger(__name__)


# ============================================
# User-Agent pool
# ============================================

USER_AGENTS = [
    # Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    # Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    # Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    # Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    # Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    # Linux Chrome
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]


def get_random_user_agent() -> str:
    """Return a random User-Agent."""
    return random.choice(USER_AGENTS)


def get_request_headers(referer: Optional[str] = None) -> dict:
    """
    Request headers with random User-Agent.

    Args:
        referer: Optional Referer header.

    Returns:
        Headers dict.
    """
    headers = {
        'User-Agent': get_random_user_agent(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }

    if referer:
        headers['Referer'] = referer

    return headers


# ============================================
# Random sleep (jitter)
# ============================================

def random_sleep(
    min_seconds: float = 1.0,
    max_seconds: float = 3.0,
    log: bool = False
) -> None:
    """
    Random sleep (jitter) to mimic human behavior between requests.

    Args:
        min_seconds: Min sleep (seconds)
        max_seconds: Max sleep (seconds)
        log: Whether to log
    """
    sleep_time = random.uniform(min_seconds, max_seconds)
    if log:
        logger.debug(f"Random sleep {sleep_time:.2f}s...")
    time.sleep(sleep_time)


# ============================================
# Request rate limiter
# ============================================

class RateLimiter:
    """
    Request rate limiter - enforces minimum interval between requests.
    """

    def __init__(
        self,
        min_interval: float = 1.0,
        jitter_min: float = 0.5,
        jitter_max: float = 1.5
    ):
        """
        Args:
            min_interval: Min interval between requests (seconds)
            jitter_min: Jitter min (seconds)
            jitter_max: Jitter max (seconds)
        """
        self.min_interval = min_interval
        self.jitter_min = jitter_min
        self.jitter_max = jitter_max
        self._last_request_time: Optional[float] = None

    def wait(self) -> float:
        """
        Wait until next request is allowed.

        Returns:
            Actual wait time (seconds).
        """
        wait_time = 0.0

        if self._last_request_time is not None:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.min_interval:
                wait_time = self.min_interval - elapsed
                time.sleep(wait_time)

        jitter = random.uniform(self.jitter_min, self.jitter_max)
        time.sleep(jitter)
        wait_time += jitter

        self._last_request_time = time.time()

        return wait_time

    def reset(self) -> None:
        """Reset limiter."""
        self._last_request_time = None


# ============================================
# Exponential backoff retry decorator
# ============================================

def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 2.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception], None]] = None
):
    """
    Exponential backoff retry decorator.

    Args:
        max_attempts: Max retries
        base_delay: Base delay (seconds)
        max_delay: Max delay (seconds)
        exponential_base: Exponent base
        exceptions: Exception types to retry
        on_retry: Callback on retry (attempt, exception)

    Example:
        @retry_with_backoff(max_attempts=3, exceptions=(ConnectionError, TimeoutError))
        def fetch_data(): ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e

                    if attempt == max_attempts:
                        logger.error(f"[retry] {func.__name__} max attempts ({max_attempts}) reached, giving up")
                        raise

                    delay = min(
                        base_delay * (exponential_base ** (attempt - 1)),
                        max_delay
                    )
                    delay *= random.uniform(0.8, 1.2)

                    logger.warning(
                        f"[retry] {func.__name__} attempt {attempt}/{max_attempts} failed: {e}, "
                        f"retrying in {delay:.1f}s..."
                    )

                    if on_retry:
                        on_retry(attempt, e)

                    time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator


# ============================================
# Global limiter instances
# ============================================

_eastmoney_limiter = RateLimiter(
    min_interval=2.0,
    jitter_min=1.0,
    jitter_max=3.0
)

_tencent_limiter = RateLimiter(
    min_interval=1.0,
    jitter_min=0.5,
    jitter_max=1.5
)

_akshare_limiter = RateLimiter(
    min_interval=2.0,
    jitter_min=1.5,
    jitter_max=3.5
)


def get_eastmoney_limiter() -> RateLimiter:
    """Get Eastmoney rate limiter."""
    return _eastmoney_limiter


def get_tencent_limiter() -> RateLimiter:
    """Get Tencent finance rate limiter."""
    return _tencent_limiter


def get_akshare_limiter() -> RateLimiter:
    """Get Akshare rate limiter."""
    return _akshare_limiter
