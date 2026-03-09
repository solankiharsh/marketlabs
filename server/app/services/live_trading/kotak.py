"""
Kotak Neo trading client stub for Indian stock market.

Auth: API key + access token + optional TOTP/MPIN.
Docs: https://neotradeapi.kotaksecurities.com/

Full order execution to be implemented later.
"""

from __future__ import annotations

from typing import Any, Dict

from app.services.live_trading.base import BaseRestClient, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class KotakClient(BaseRestClient):
    """
    Kotak Neo REST client stub.

    Config fields:
    - api_key: Kotak Neo consumer key
    - access_token: Session token
    - totp_key: TOTP (optional)
    - mpin: MPIN (optional)
    """

    def __init__(
        self,
        api_key: str,
        access_token: str,
        totp_key: str = "",
        mpin: str = "",
        base_url: str = "https://napi.kotaksecurities.com/oauth2/token",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not access_token:
            raise LiveTradingError("Kotak Neo requires api_key and access_token")
        self.api_key = api_key
        self.access_token = access_token
        self.totp_key = totp_key
        self.mpin = mpin

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
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
            self._url("/profile"),
            headers=self._headers(),
            timeout=self.timeout_sec,
        )
        body = resp.json() if resp.text else {}
        if resp.status_code != 200:
            raise LiveTradingError(f"Kotak API error ({resp.status_code}): {body.get('message', resp.text[:500])}")
        return body.get("data", body)
