"""
HTTP utility module
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def get_retry_session(
    retries: int = 3,
    backoff_factor: float = 0.5,
    status_forcelist: tuple = (500, 502, 503, 504)
) -> requests.Session:
    """
    Get an HTTP Session with retry mechanism

    Args:
        retries: Number of retries
        backoff_factor: Retry backoff factor
        status_forcelist: HTTP status codes that trigger a retry

    Returns:
        Configured Session instance
    """
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session


# Global shared Session
global_session = get_retry_session()

