"""
Application main configuration.
"""
import os

class MetaConfig(type):
    # ==================== Service configuration ====================
    # Service startup parameters are usually determined by environment variables or command line arguments, not recommended to read from database
    
    @property
    def HOST(cls):
        return os.getenv('PYTHON_API_HOST', '0.0.0.0')

    @property
    def PORT(cls):
        return int(os.getenv('PYTHON_API_PORT', 5000))

    @property
    def DEBUG(cls):
        return os.getenv('PYTHON_API_DEBUG', 'False').lower() == 'true'

    @property
    def APP_NAME(cls):
        return 'MarketLabs Python API'

    @property
    def VERSION(cls):
        return '2.0.0'

    # ==================== Authentication configuration ====================
    @property
    def SECRET_KEY(cls):
        return os.getenv('SECRET_KEY', 'marketlabs-secret-key-change-me')

    @property
    def ADMIN_USER(cls):
        return os.getenv('ADMIN_USER', 'marketlabs')

    @property
    def ADMIN_PASSWORD(cls):
        return os.getenv('ADMIN_PASSWORD', '123456')

    # ==================== Logging configuration ====================
    # Logging configuration is usually required at the earliest stage of application startup, it is recommended to keep environment variables
    
    @property
    def LOG_LEVEL(cls):
        return os.getenv('LOG_LEVEL', 'INFO')

    @property
    def LOG_DIR(cls):
        return os.getenv('LOG_DIR', 'logs')

    @property
    def LOG_FILE(cls):
        return os.getenv('LOG_FILE', 'app.log')

    @property
    def LOG_MAX_BYTES(cls):
        return int(os.getenv('LOG_MAX_BYTES', 10 * 1024 * 1024))

    @property
    def LOG_BACKUP_COUNT(cls):
        return int(os.getenv('LOG_BACKUP_COUNT', 5))

    # ==================== Security configuration ====================

    @property
    def CORS_ORIGINS(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('app', {}).get('cors_origins')
        return val if val else os.getenv('CORS_ORIGINS', '*')

    @property
    def RATE_LIMIT(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('app', {}).get('rate_limit')
        return int(val) if val is not None else int(os.getenv('RATE_LIMIT', 100))

    # ==================== Feature switches ====================

    @property
    def ENABLE_CACHE(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('app', {}).get('enable_cache')
        if val is not None:
            return bool(val)
        return os.getenv('ENABLE_CACHE', 'False').lower() == 'true'

    @property
    def ENABLE_REQUEST_LOG(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('app', {}).get('enable_request_log')
        if val is not None:
            return bool(val)
        return os.getenv('ENABLE_REQUEST_LOG', 'True').lower() == 'true'

    @property
    def ENABLE_AI_ANALYSIS(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('app', {}).get('enable_ai_analysis')
        if val is not None:
            return bool(val)
        return os.getenv('ENABLE_AI_ANALYSIS', 'True').lower() == 'true'


class Config(metaclass=MetaConfig):
    """Application configuration class"""
    
    @classmethod
    def get_log_path(cls) -> str:
        """Get full path to log file"""
        return os.path.join(cls.LOG_DIR, cls.LOG_FILE)
