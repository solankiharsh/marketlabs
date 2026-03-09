"""
Flattrade trading client stub for Indian stock market.

Auth: API key + API secret (similar to Shoonya/NorenOMS).
Docs: https://flattrade.in/api-documentation

Full order execution to be implemented later.
"""

from __future__ import annotations

from typing import Any, Dict

from app.services.live_trading.base import BaseRestClient, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class FlattradeClient(BaseRestClient):
    """
    Flattrade REST client stub.

    Config fields:
    - api_key: Flattrade API key (user_key)
    - secret_key: Flattrade API secret (request_token)
    """

    def __init__(
        self,
        api_key: str,
        secret_key: str,
        base_url: str = "https://piconnect.flattrade.in/PiConnectTP",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not secret_key:
            raise LiveTradingError("Flattrade requires api_key and secret_key")
        self.api_key = api_key
        self.secret_key = secret_key
        self.susertoken = ""

    def ping(self) -> bool:
        """Connectivity check."""
        try:
            profile = self.get_profile()
            return bool(profile)
        except Exception:
            return False

    def get_profile(self) -> Dict[str, Any]:
        """Get session token and user details as connection test."""
        import hashlib
        import requests as req

        api_secret_hash = hashlib.sha256(
            f"{self.api_key}{self.secret_key}".encode()
        ).hexdigest()

        payload = {
            "uid": self.api_key,
            "actid": self.api_key,
            "source": "API",
            "apkversion": "1.0.0",
            "appkey": api_secret_hash,
            "imei": "api",
        }

        resp = req.post(
            self._url("/QuickAuth"),
            data="jData=" + str(payload).replace("'", '"'),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=self.timeout_sec,
        )

        body = resp.json() if resp.text else {}
        if body.get("stat") != "Ok":
            raise LiveTradingError(f"Flattrade login failed: {body.get('emsg', 'Unknown error')}")

        self.susertoken = body.get("susertoken", "")
        return body
