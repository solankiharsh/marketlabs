"""
Dhan trading client stub for Indian stock market.

Auth: API key + API secret.
Docs: https://dhanhq.co/docs/v2/

Full order execution to be implemented later.
"""

from __future__ import annotations

from typing import Any, Dict

from app.services.live_trading.base import BaseRestClient, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DhanClient(BaseRestClient):
    """
    Dhan REST client stub.

    Config fields:
    - api_key: Dhan client ID
    - secret_key: Dhan access token
    """

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://api.dhan.co/v2",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not secret_key:
            raise LiveTradingError("Dhan requires api_key and secret_key")
        self.api_key = api_key
        self.secret_key = secret_key

    def _headers(self) -> Dict[str, str]:
        return {
            "access-token": self.secret_key,
            "client-id": self.api_key,
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
        """Get fund limits as profile/connection test."""
        import requests as req
        resp = req.get(
            self._url("/fundlimit"),
            headers=self._headers(),
            timeout=self.timeout_sec,
        )
        body = resp.json() if resp.text else {}
        if resp.status_code != 200:
            raise LiveTradingError(f"Dhan API error ({resp.status_code}): {body.get('remarks', resp.text[:500])}")
        return body.get("data", body)
