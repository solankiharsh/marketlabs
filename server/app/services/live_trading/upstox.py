"""
Upstox trading client stub for Indian stock market.

Auth: API key + API secret (OAuth2 flow).
Docs: https://upstox.com/developer/api-documentation/

Full order execution to be implemented later.
"""

from __future__ import annotations

from typing import Any, Dict

from app.services.live_trading.base import BaseRestClient, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UpstoxClient(BaseRestClient):
    """
    Upstox REST client stub.

    Config fields:
    - api_key: Upstox API key
    - secret_key: Upstox API secret
    """

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://api.upstox.com/v2",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not secret_key:
            raise LiveTradingError("Upstox requires api_key and secret_key")
        self.api_key = api_key
        self.secret_key = secret_key

    def _headers(self) -> Dict[str, str]:
        return {
            "Api-Version": "2.0",
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def ping(self) -> bool:
        """Connectivity check."""
        try:
            profile = self.get_profile()
            return bool(profile)
        except Exception:
            return False

    def get_profile(self) -> Dict[str, Any]:
        """Get user profile (connection test)."""
        import requests as req
        resp = req.get(
            self._url("/user/profile"),
            headers=self._headers(),
            timeout=self.timeout_sec,
        )
        body = resp.json() if resp.text else {}
        if resp.status_code != 200:
            raise LiveTradingError(f"Upstox API error ({resp.status_code}): {body.get('message', resp.text[:500])}")
        return body.get("data", body)
