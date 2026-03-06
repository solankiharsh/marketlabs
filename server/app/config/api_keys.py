"""
API key configuration.
All third-party keys should be provided via environment variables (recommended: backend_api_python/.env).
"""
import os

class MetaAPIKeys(type):
    """Meta class for API Keys to support dynamic attribute access"""
    
    @property
    def FINNHUB_API_KEY(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('finnhub', {}).get('api_key')
        return val if val else os.getenv('FINNHUB_API_KEY', '')
    
    @property
    def TIINGO_API_KEY(cls):
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('tiingo', {}).get('api_key')
        return val if val else os.getenv('TIINGO_API_KEY', '')
    
    @property
    def OPENROUTER_API_KEY(cls):
        # Always check env var first to avoid stale cache issues
        env_val = os.getenv('OPENROUTER_API_KEY', '').strip()
        if env_val:
            return env_val
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('openrouter', {}).get('api_key')
        return val if val else ''
    
    @property
    def OPENAI_API_KEY(cls):
        """OpenAI direct API key"""
        env_val = os.getenv('OPENAI_API_KEY', '').strip()
        if env_val:
            return env_val
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('openai', {}).get('api_key')
        return val if val else ''
    
    @property
    def GOOGLE_API_KEY(cls):
        """Google Gemini API key"""
        env_val = os.getenv('GOOGLE_API_KEY', '').strip()
        if env_val:
            return env_val
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('google', {}).get('api_key')
        return val if val else ''
    
    @property
    def DEEPSEEK_API_KEY(cls):
        """DeepSeek API key"""
        env_val = os.getenv('DEEPSEEK_API_KEY', '').strip()
        if env_val:
            return env_val
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('deepseek', {}).get('api_key')
        return val if val else ''
    
    @property
    def GROK_API_KEY(cls):
        """xAI Grok API key"""
        env_val = os.getenv('GROK_API_KEY', '').strip()
        if env_val:
            return env_val
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('grok', {}).get('api_key')
        return val if val else ''
    
    @property
    def TAVILY_API_KEYS(cls):
        """Tavily Search API keys (comma-separated for rotation)"""
        env_val = os.getenv('TAVILY_API_KEYS', '').strip()
        if env_val:
            return [k.strip() for k in env_val.split(',') if k.strip()]
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('tavily', {}).get('api_keys', '')
        if val:
            return [k.strip() for k in val.split(',') if k.strip()]
        return []
    
    @property
    def BOCHA_API_KEYS(cls):
        """Bocha Search API keys (comma-separated for rotation)"""
        env_val = os.getenv('BOCHA_API_KEYS', '').strip()
        if env_val:
            return [k.strip() for k in env_val.split(',') if k.strip()]
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('bocha', {}).get('api_keys', '')
        if val:
            return [k.strip() for k in val.split(',') if k.strip()]
        return []
    
    @property
    def SERPAPI_KEYS(cls):
        """SerpAPI keys (comma-separated for rotation)"""
        env_val = os.getenv('SERPAPI_KEYS', '').strip()
        if env_val:
            return [k.strip() for k in env_val.split(',') if k.strip()]
        from app.utils.config_loader import load_addon_config
        val = load_addon_config().get('serpapi', {}).get('api_keys', '')
        if val:
            return [k.strip() for k in val.split(',') if k.strip()]
        return []


class APIKeys(metaclass=MetaAPIKeys):
    """API keys configuration class"""
    
    @classmethod
    def get(cls, key_name: str, default: str = '') -> str:
        """Get API key"""
        # Try to get from class attributes first
        if hasattr(cls, key_name):
            return getattr(cls, key_name)
        return default
    
    @classmethod
    def is_configured(cls, key_name: str) -> bool:
        """Check if API key is configured"""
        value = cls.get(key_name)
        return bool(value and value.strip())
