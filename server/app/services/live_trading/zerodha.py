"""
Zerodha (Kite Connect) trading client for Indian stock market.

Auth: API key + access token (generated daily via Kite login flow).
Docs: https://kite.trade/docs/connect/v3/

Requires: pip install kiteconnect>=5.0.0
"""

from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional

from app.services.live_trading.base import BaseRestClient, LiveOrderResult, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Product types
PRODUCT_CNC = "CNC"        # Cash & Carry (delivery)
PRODUCT_MIS = "MIS"        # Margin Intraday Settlement
PRODUCT_NRML = "NRML"      # Normal (F&O carry forward)

# Order types
ORDER_TYPE_MARKET = "MARKET"
ORDER_TYPE_LIMIT = "LIMIT"
ORDER_TYPE_SL = "SL"        # Stop-loss limit
ORDER_TYPE_SLM = "SL-M"     # Stop-loss market

# Transaction types
TRANSACTION_BUY = "BUY"
TRANSACTION_SELL = "SELL"

# Exchanges
EXCHANGE_NSE = "NSE"
EXCHANGE_BSE = "BSE"
EXCHANGE_NFO = "NFO"  # NSE F&O


class ZerodhaClient(BaseRestClient):
    """
    Zerodha Kite Connect REST client.

    Config fields:
    - api_key: Kite Connect API key
    - access_token: Short-lived access token (refreshed daily via login URL)
    """

    def __init__(
        self,
        api_key: str,
        access_token: str,
        base_url: str = "https://api.kite.trade",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not access_token:
            raise LiveTradingError("Zerodha requires api_key and access_token")
        self.api_key = api_key
        self.access_token = access_token

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Kite-Version": "3",
            "Authorization": f"token {self.api_key}:{self.access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        }

    def _kite_request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated Kite API request."""
        url = self._url(path)

        import requests as req
        resp = req.request(
            method=method.upper(),
            url=url,
            params=params,
            data=data,
            headers=self._headers(),
            timeout=self.timeout_sec,
        )

        body = resp.json() if resp.text else {}

        if resp.status_code != 200:
            error_msg = body.get("message", body.get("error", resp.text[:500]))
            raise LiveTradingError(f"Zerodha API error ({resp.status_code}): {error_msg}")

        if body.get("status") == "error":
            raise LiveTradingError(f"Zerodha: {body.get('message', 'Unknown error')}")

        return body.get("data", body)

    # ========== Order Management ==========

    def place_order(
        self,
        symbol: str,
        side: str,
        qty: float,
        order_type: str = "MARKET",
        price: float = 0,
        trigger_price: float = 0,
        product: str = PRODUCT_CNC,
        exchange: str = EXCHANGE_NSE,
        validity: str = "DAY",
        variety: str = "regular",
    ) -> LiveOrderResult:
        """
        Place an order on Zerodha.

        Args:
            symbol: Trading symbol (e.g., RELIANCE, INFY)
            side: BUY or SELL
            qty: Quantity
            order_type: MARKET, LIMIT, SL, SL-M
            price: Limit price (for LIMIT/SL orders)
            trigger_price: Trigger price (for SL/SL-M orders)
            product: CNC (delivery), MIS (intraday), NRML (F&O)
            exchange: NSE, BSE, NFO
            validity: DAY, IOC
            variety: regular, amo (after market order), iceberg, auction
        """
        side = side.upper()
        if side not in (TRANSACTION_BUY, TRANSACTION_SELL):
            raise LiveTradingError(f"Invalid side: {side}. Must be BUY or SELL")

        order_params = {
            "tradingsymbol": symbol.upper(),
            "exchange": exchange,
            "transaction_type": side,
            "order_type": order_type.upper(),
            "quantity": int(qty),
            "product": product,
            "validity": validity,
        }

        if order_type.upper() in ("LIMIT", "SL") and price > 0:
            order_params["price"] = price
        if order_type.upper() in ("SL", "SL-M") and trigger_price > 0:
            order_params["trigger_price"] = trigger_price

        data = self._kite_request("POST", f"/orders/{variety}", data=order_params)

        order_id = data.get("order_id", "") if isinstance(data, dict) else str(data)

        return LiveOrderResult(
            exchange_id="zerodha",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw={"order_id": order_id},
        )

    def cancel_order(self, order_id: str, variety: str = "regular") -> LiveOrderResult:
        """Cancel an open order."""
        data = self._kite_request("DELETE", f"/orders/{variety}/{order_id}")
        return LiveOrderResult(
            exchange_id="zerodha",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw=data if isinstance(data, dict) else {"order_id": order_id},
        )

    def modify_order(
        self,
        order_id: str,
        qty: Optional[int] = None,
        price: Optional[float] = None,
        order_type: Optional[str] = None,
        trigger_price: Optional[float] = None,
        variety: str = "regular",
    ) -> LiveOrderResult:
        """Modify an open order."""
        params: Dict[str, Any] = {}
        if qty is not None:
            params["quantity"] = int(qty)
        if price is not None:
            params["price"] = price
        if order_type is not None:
            params["order_type"] = order_type
        if trigger_price is not None:
            params["trigger_price"] = trigger_price

        data = self._kite_request("PUT", f"/orders/{variety}/{order_id}", data=params)
        return LiveOrderResult(
            exchange_id="zerodha",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw=data if isinstance(data, dict) else {"order_id": order_id},
        )

    # ========== Position & Order Queries ==========

    def get_positions(self) -> List[Dict[str, Any]]:
        """Get current positions."""
        data = self._kite_request("GET", "/portfolio/positions")
        if isinstance(data, dict):
            net = data.get("net", [])
            day = data.get("day", [])
            return net or day
        return data if isinstance(data, list) else []

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Get holdings (delivery stocks)."""
        data = self._kite_request("GET", "/portfolio/holdings")
        return data if isinstance(data, list) else []

    def get_orders(self) -> List[Dict[str, Any]]:
        """Get all orders for the day."""
        data = self._kite_request("GET", "/orders")
        return data if isinstance(data, list) else []

    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order."""
        data = self._kite_request("GET", f"/orders/{order_id}")
        if isinstance(data, list) and data:
            return data[-1]  # Latest update
        return data if isinstance(data, dict) else {}

    def get_order_trades(self, order_id: str) -> List[Dict[str, Any]]:
        """Get trades for a specific order."""
        data = self._kite_request("GET", f"/orders/{order_id}/trades")
        return data if isinstance(data, list) else []

    # ========== Market Data ==========

    def get_ltp(self, exchange: str, symbol: str) -> float:
        """Get last traded price."""
        instrument = f"{exchange}:{symbol}"
        data = self._kite_request("GET", "/quote/ltp", params={"i": instrument})
        if isinstance(data, dict) and instrument in data:
            return float(data[instrument].get("last_price", 0))
        return 0

    def get_quote(self, exchange: str, symbol: str) -> Dict[str, Any]:
        """Get full quote for a symbol."""
        instrument = f"{exchange}:{symbol}"
        data = self._kite_request("GET", "/quote", params={"i": instrument})
        if isinstance(data, dict) and instrument in data:
            return data[instrument]
        return {}

    # ========== Account ==========

    def ping(self) -> bool:
        """Connectivity check — fetches profile to verify token validity."""
        try:
            profile = self.get_profile()
            return bool(profile)
        except Exception:
            return False

    def get_margins(self) -> Dict[str, Any]:
        """Get account margins."""
        return self._kite_request("GET", "/user/margins")

    def get_profile(self) -> Dict[str, Any]:
        """Get user profile."""
        return self._kite_request("GET", "/user/profile")
