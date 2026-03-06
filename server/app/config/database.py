"""
Database and cache configuration.
"""
import os

class MetaRedisConfig(type):
    """Redis configuration"""
    
    @property
    def HOST(cls):
        return os.getenv('REDIS_HOST', 'localhost')
    
    @property
    def PORT(cls):
        return int(os.getenv('REDIS_PORT', 6379))
    
    @property
    def PASSWORD(cls):
        return os.getenv('REDIS_PASSWORD', None)
    
    @property
    def DB(cls):
        return int(os.getenv('REDIS_DB', 0))
    
    @property
    def CONNECT_TIMEOUT(cls):
        return int(os.getenv('REDIS_CONNECT_TIMEOUT', 5))
    
    @property
    def SOCKET_TIMEOUT(cls):
        return int(os.getenv('REDIS_SOCKET_TIMEOUT', 5))
    
    @property
    def MAX_CONNECTIONS(cls):
        return int(os.getenv('REDIS_MAX_CONNECTIONS', 10))


class RedisConfig(metaclass=MetaRedisConfig):
    """Redis cache configuration"""
    
    @classmethod
    def get_url(cls) -> str:
        """Get Redis connection URL"""
        if cls.PASSWORD:
            return f"redis://:{cls.PASSWORD}@{cls.HOST}:{cls.PORT}/{cls.DB}"
        return f"redis://{cls.HOST}:{cls.PORT}/{cls.DB}"


class MetaSQLiteConfig(type):
    """SQLite configuration"""
    
    @property
    def DATABASE_FILE(cls):
        # Default placed in backend_api_python/data directory (cleaner and consistent with docker-compose mount)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        default_path = os.path.join(base_dir, 'data', 'marketlabs.db')
        return os.getenv('SQLITE_DATABASE_FILE', default_path)


class SQLiteConfig(metaclass=MetaSQLiteConfig):
    """SQLite database configuration"""
    
    @classmethod
    def get_path(cls) -> str:
        """Get database file path"""
        return cls.DATABASE_FILE


class MetaCacheConfig(type):
    """Cache business configuration"""
    
    @property
    def ENABLED(cls):
        # Force default off unless environment variable explicitly enabled
        return os.getenv('CACHE_ENABLED', 'False').lower() == 'true'

    @property
    def DEFAULT_EXPIRE(cls):
        return int(os.getenv('CACHE_EXPIRE', 300))

    @property
    def KLINE_CACHE_TTL(cls):
        return {
            '1m': 5,       # 1 minute K-line cache 5 seconds
            '3m': 30,      # 3 minute K-line cache 30 seconds
            '5m': 60,      # 5 minute K-line cache 1 minute
            '15m': 300,    # 15 minute K-line cache 5 minutes
            '30m': 300,    # 30 minute K-line cache 5 minutes
            '1H': 300,     # 1 hour K-line cache 5 minutes
            '4H': 300,     # 4 hour K-line cache 5 minutes
            '1D': 300,     # 1 day K-line cache 5 minutes
            # Compatibility for lowercase
            '1h': 300,
            '4h': 300,
            '1d': 300,
        }

    @property
    def ANALYSIS_CACHE_TTL(cls):
        return 3600

    @property
    def PRICE_CACHE_TTL(cls):
        return 10


class CacheConfig(metaclass=MetaCacheConfig):
    """Cache configuration"""
    pass
