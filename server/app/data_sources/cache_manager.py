# -*- coding: utf-8 -*-
"""
===================================
Data Cache Module
===================================

Caches realtime quotes and K-line data to reduce duplicate requests.

Features:
- TTL (Time To Live) expiration
- LRU (Least Recently Used) eviction
- Partitioned by data type
"""

import time
import logging
from typing import Dict, Any, Optional, List
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime
import threading

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry."""
    data: Any
    timestamp: float
    ttl: float
    hit_count: int = 0

    def is_expired(self) -> bool:
        """Check if entry is expired."""
        return time.time() - self.timestamp > self.ttl

    def age(self) -> float:
        """Return age in seconds."""
        return time.time() - self.timestamp


class DataCache:
    """
    Data cache manager.

    Features:
    - TTL expiration
    - Max capacity
    - LRU eviction
    - Thread-safe
    """

    def __init__(
        self,
        name: str = "default",
        default_ttl: float = 600.0,
        max_size: int = 1000
    ):
        self.name = name
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()

        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """
        Get cached data. Returns None if missing or expired.
        """
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            entry = self._cache[key]

            if entry.is_expired():
                del self._cache[key]
                self._misses += 1
                logger.debug(f"[Cache] {self.name}:{key} expired, removed")
                return None

            self._cache.move_to_end(key)
            entry.hit_count += 1
            self._hits += 1

            logger.debug(f"[Cache hit] {self.name}:{key} (age: {entry.age():.0f}s/{entry.ttl:.0f}s)")
            return entry.data

    def set(
        self,
        key: str,
        data: Any,
        ttl: Optional[float] = None
    ) -> None:
        """
        Set cache entry.

        Args:
            key: Cache key
            data: Data to cache
            ttl: TTL in seconds; None uses default
        """
        with self._lock:
            while len(self._cache) >= self.max_size:
                oldest_key, _ = self._cache.popitem(last=False)
                logger.debug(f"[Cache] {self.name} full, evicted: {oldest_key}")

            actual_ttl = ttl if ttl is not None else self.default_ttl
            self._cache[key] = CacheEntry(
                data=data,
                timestamp=time.time(),
                ttl=actual_ttl
            )

            logger.debug(f"[Cache set] {self.name}:{key} TTL={actual_ttl}s")

    def delete(self, key: str) -> bool:
        """Delete a cache entry."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug(f"[Cache] {self.name}:{key} deleted")
                return True
            return False

    def clear(self) -> int:
        """Clear all entries. Returns count cleared."""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"[Cache] {self.name} cleared ({count} entries)")
            return count

    def cleanup_expired(self) -> int:
        """Remove expired entries. Returns count removed."""
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                del self._cache[key]

            if expired_keys:
                logger.debug(f"[Cache] {self.name} cleaned {len(expired_keys)} expired")
            return len(expired_keys)

    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = self._hits / total_requests if total_requests > 0 else 0

            return {
                'name': self.name,
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self._hits,
                'misses': self._misses,
                'hit_rate': f"{hit_rate:.1%}",
                'default_ttl': self.default_ttl
            }


# Global cache instances
_realtime_cache = DataCache(
    name="realtime",
    default_ttl=1200.0,
    max_size=6000
)

_kline_cache = DataCache(
    name="kline",
    default_ttl=300.0,
    max_size=500
)

_stock_info_cache = DataCache(
    name="stock_info",
    default_ttl=86400.0,
    max_size=6000
)


def get_realtime_cache() -> DataCache:
    """Get realtime quote cache."""
    return _realtime_cache


def get_kline_cache() -> DataCache:
    """Get K-line cache."""
    return _kline_cache


def get_stock_info_cache() -> DataCache:
    """Get stock info cache."""
    return _stock_info_cache


def generate_kline_cache_key(
    symbol: str,
    timeframe: str,
    limit: int,
    before_time: Optional[int] = None
) -> str:
    """
    Generate K-line cache key.
    Format: symbol:timeframe:limit[:before_time]
    """
    key = f"{symbol}:{timeframe}:{limit}"
    if before_time:
        key += f":{before_time}"
    return key
