"""
Shoonya (Finvasia) trading client stub for Indian stock market.

Auth: API key + user_id + password + TOTP + API secret.
Docs: https://www.shoonya.com/api-documentation

Full order execution to be implemented later.
"""

from __future__ import annotations

from typing import Any, Dict

from app.services.live_trading.base import BaseRestClient, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ShoonyaClient(BaseRestClient):
    """
    Shoonya (Finvasia) REST client stub.

    Config fields:
    - api_key: Shoonya API key (vendor code)
    - client_id: User ID
    - password: Trading password
    - secret_key: API secret (SHA-256 of app key)
    - totp_key: TOTP code
    """

    def __init__(
        self,
        api_key: str,
        client_id: str,
        password: str,
        secret_key: str = "",
        totp_key: str = "",
        base_url: str = "https://api.shoonya.com/NorenWClientTP",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not client_id or not password:
            raise LiveTradingError("Shoonya requires api_key, client_id, and password")
        self.api_key = api_key
        self.client_id = client_id
        self.password = password
        self.secret_key = secret_key
        self.totp_key = totp_key
        self.susertoken = ""

    def ping(self) -> bool:
        """Connectivity check."""
        try:
            profile = self.get_profile()
            return bool(profile)
        except Exception:
            return False

    def get_profile(self) -> Dict[str, Any]:
        """Login and get user details as connection test."""
        import hashlib
        import requests as req

        pwd_hash = hashlib.sha256(self.password.encode()).hexdigest()
        app_hash = hashlib.sha256(f"{self.client_id}|{self.api_key}".encode()).hexdigest()

        payload = {
            "source": "API",
            "apkversion": "1.0.0",
            "uid": self.client_id,
            "pwd": pwd_hash,
            "factor2": self.totp_key,
            "vc": self.api_key,
            "appkey": app_hash,
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
            raise LiveTradingError(f"Shoonya login failed: {body.get('emsg', 'Unknown error')}")

        self.susertoken = body.get("susertoken", "")
        return body
