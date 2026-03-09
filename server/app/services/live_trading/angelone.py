"""
Angel One (SmartAPI) trading client for Indian stock market.

Auth: API key + client ID + password + TOTP key.
Docs: https://smartapi.angelone.in/docs

Requires: pip install smartapi-python>=1.3
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.services.live_trading.base import BaseRestClient, LiveOrderResult, LiveTradingError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Product types
PRODUCT_DELIVERY = "DELIVERY"
PRODUCT_INTRADAY = "INTRADAY"
PRODUCT_CARRYFORWARD = "CARRYFORWARD"  # F&O

# Order types
ORDER_TYPE_MARKET = "MARKET"
ORDER_TYPE_LIMIT = "LIMIT"
ORDER_TYPE_STOPLOSS_LIMIT = "STOPLOSS_LIMIT"
ORDER_TYPE_STOPLOSS_MARKET = "STOPLOSS_MARKET"

# Transaction types
TRANSACTION_BUY = "BUY"
TRANSACTION_SELL = "SELL"

# Exchanges
EXCHANGE_NSE = "NSE"
EXCHANGE_BSE = "BSE"
EXCHANGE_NFO = "NFO"

# Variety
VARIETY_NORMAL = "NORMAL"
VARIETY_AMO = "AMO"
VARIETY_STOPLOSS = "STOPLOSS"


class AngelOneClient(BaseRestClient):
    """
    Angel One SmartAPI REST client.

    Config fields:
    - api_key: SmartAPI key
    - client_id: Angel One client ID (e.g., D12345)
    - password: Trading password
    - totp_key: TOTP secret for 2FA (used to generate OTP)
    """

    def __init__(
        self,
        api_key: str,
        client_id: str,
        password: str,
        totp_key: str = "",
        base_url: str = "https://apiconnect.angelone.in",
    ):
        super().__init__(base_url=base_url)
        if not api_key or not client_id or not password:
            raise LiveTradingError("AngelOne requires api_key, client_id, and password")
        self.api_key = api_key
        self.client_id = client_id
        self.password = password
        self.totp_key = totp_key
        self._jwt_token: str = ""
        self._refresh_token: str = ""
        self._feed_token: str = ""

    def _generate_totp(self) -> str:
        """Generate TOTP from secret key."""
        if not self.totp_key:
            raise LiveTradingError("AngelOne TOTP key is required for login")
        try:
            import pyotp
            totp = pyotp.TOTP(self.totp_key)
            return totp.now()
        except ImportError:
            raise LiveTradingError("pyotp is required for AngelOne TOTP. Run: pip install pyotp")

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "127.0.0.1",
            "X-MACAddress": "00:00:00:00:00:00",
            "X-PrivateKey": self.api_key,
        }
        if self._jwt_token:
            headers["Authorization"] = f"Bearer {self._jwt_token}"
        return headers

    def _smart_request(
        self,
        method: str,
        path: str,
        json_body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated SmartAPI request."""
        url = self._url(path)

        import requests as req
        resp = req.request(
            method=method.upper(),
            url=url,
            json=json_body,
            params=params,
            headers=self._headers(),
            timeout=self.timeout_sec,
        )

        body = resp.json() if resp.text else {}

        if resp.status_code != 200 or not body.get("status"):
            error_msg = body.get("message", body.get("errorcode", resp.text[:500]))
            raise LiveTradingError(f"AngelOne API error ({resp.status_code}): {error_msg}")

        return body.get("data", body)

    # ========== Authentication ==========

    def login(self) -> Dict[str, Any]:
        """
        Login to AngelOne SmartAPI.
        Must be called before any trading operations.
        """
        totp = self._generate_totp()

        data = self._smart_request("POST", "/rest/auth/angelbroking/user/v1/loginByPassword", json_body={
            "clientcode": self.client_id,
            "password": self.password,
            "totp": totp,
        })

        self._jwt_token = data.get("jwtToken", "")
        self._refresh_token = data.get("refreshToken", "")
        self._feed_token = data.get("feedToken", "")

        if not self._jwt_token:
            raise LiveTradingError("AngelOne login failed: no JWT token received")

        logger.info(f"AngelOne login successful for client {self.client_id}")
        return data

    def logout(self) -> Dict[str, Any]:
        """Logout from SmartAPI."""
        data = self._smart_request("POST", "/rest/secure/angelbroking/user/v1/logout", json_body={
            "clientcode": self.client_id,
        })
        self._jwt_token = ""
        self._refresh_token = ""
        self._feed_token = ""
        return data

    # ========== Order Management ==========

    def place_order(
        self,
        symbol: str,
        side: str,
        qty: float,
        order_type: str = "MARKET",
        price: float = 0,
        trigger_price: float = 0,
        product: str = PRODUCT_DELIVERY,
        exchange: str = EXCHANGE_NSE,
        symbol_token: str = "",
        variety: str = VARIETY_NORMAL,
        duration: str = "DAY",
    ) -> LiveOrderResult:
        """
        Place an order on Angel One.

        Args:
            symbol: Trading symbol (e.g., RELIANCE-EQ, INFY-EQ)
            side: BUY or SELL
            qty: Quantity
            order_type: MARKET, LIMIT, STOPLOSS_LIMIT, STOPLOSS_MARKET
            price: Limit price
            trigger_price: Trigger price for stop-loss
            product: DELIVERY, INTRADAY, CARRYFORWARD
            exchange: NSE, BSE, NFO
            symbol_token: Instrument token (required by SmartAPI)
            variety: NORMAL, AMO, STOPLOSS
            duration: DAY, IOC
        """
        side = side.upper()
        if side not in (TRANSACTION_BUY, TRANSACTION_SELL):
            raise LiveTradingError(f"Invalid side: {side}. Must be BUY or SELL")

        order_params = {
            "variety": variety,
            "tradingsymbol": symbol.upper(),
            "symboltoken": symbol_token,
            "transactiontype": side,
            "exchange": exchange,
            "ordertype": order_type.upper(),
            "producttype": product,
            "duration": duration,
            "quantity": str(int(qty)),
        }

        if order_type.upper() in ("LIMIT", "STOPLOSS_LIMIT") and price > 0:
            order_params["price"] = str(price)
        else:
            order_params["price"] = "0"

        if order_type.upper() in ("STOPLOSS_LIMIT", "STOPLOSS_MARKET") and trigger_price > 0:
            order_params["triggerprice"] = str(trigger_price)
        else:
            order_params["triggerprice"] = "0"

        data = self._smart_request("POST", "/rest/secure/angelbroking/order/v1/placeOrder", json_body=order_params)

        order_id = data.get("orderid", data.get("uniqueorderid", "")) if isinstance(data, dict) else str(data)

        return LiveOrderResult(
            exchange_id="angelone",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw=data if isinstance(data, dict) else {"orderid": order_id},
        )

    def cancel_order(self, order_id: str, variety: str = VARIETY_NORMAL) -> LiveOrderResult:
        """Cancel an open order."""
        data = self._smart_request("POST", "/rest/secure/angelbroking/order/v1/cancelOrder", json_body={
            "variety": variety,
            "orderid": order_id,
        })
        return LiveOrderResult(
            exchange_id="angelone",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw=data if isinstance(data, dict) else {"orderid": order_id},
        )

    def modify_order(
        self,
        order_id: str,
        qty: Optional[int] = None,
        price: Optional[float] = None,
        order_type: Optional[str] = None,
        trigger_price: Optional[float] = None,
        variety: str = VARIETY_NORMAL,
    ) -> LiveOrderResult:
        """Modify an open order."""
        params: Dict[str, Any] = {
            "variety": variety,
            "orderid": order_id,
        }
        if qty is not None:
            params["quantity"] = str(int(qty))
        if price is not None:
            params["price"] = str(price)
        if order_type is not None:
            params["ordertype"] = order_type
        if trigger_price is not None:
            params["triggerprice"] = str(trigger_price)

        data = self._smart_request("POST", "/rest/secure/angelbroking/order/v1/modifyOrder", json_body=params)
        return LiveOrderResult(
            exchange_id="angelone",
            exchange_order_id=str(order_id),
            filled=0,
            avg_price=0,
            raw=data if isinstance(data, dict) else {"orderid": order_id},
        )

    # ========== Position & Order Queries ==========

    def get_positions(self) -> List[Dict[str, Any]]:
        """Get current positions."""
        data = self._smart_request("GET", "/rest/secure/angelbroking/order/v1/getPosition")
        return data if isinstance(data, list) else []

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Get holdings."""
        data = self._smart_request("GET", "/rest/secure/angelbroking/portfolio/v1/getHolding")
        return data if isinstance(data, list) else []

    def get_orders(self) -> List[Dict[str, Any]]:
        """Get order book."""
        data = self._smart_request("GET", "/rest/secure/angelbroking/order/v1/getOrderBook")
        return data if isinstance(data, list) else []

    def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order by searching order book."""
        orders = self.get_orders()
        for order in orders:
            if order.get("orderid") == order_id:
                return order
        return {}

    def get_trades(self) -> List[Dict[str, Any]]:
        """Get trade book."""
        data = self._smart_request("GET", "/rest/secure/angelbroking/order/v1/getTradeBook")
        return data if isinstance(data, list) else []

    # ========== Market Data ==========

    def get_ltp(self, exchange: str, symbol: str, symbol_token: str) -> float:
        """Get last traded price."""
        data = self._smart_request("POST", "/rest/secure/angelbroking/order/v1/getLtpData", json_body={
            "exchange": exchange,
            "tradingsymbol": symbol,
            "symboltoken": symbol_token,
        })
        if isinstance(data, dict):
            return float(data.get("ltp", 0))
        return 0

    # ========== Account ==========

    def ping(self) -> bool:
        """Connectivity check — logs in and fetches profile to verify credentials."""
        try:
            self.login()
            profile = self.get_profile()
            return bool(profile)
        except Exception:
            return False

    def get_rms(self) -> Dict[str, Any]:
        """Get risk management system (margin) data."""
        return self._smart_request("GET", "/rest/secure/angelbroking/user/v1/getRMS")

    def get_profile(self) -> Dict[str, Any]:
        """Get user profile."""
        return self._smart_request("GET", "/rest/secure/angelbroking/user/v1/getProfile")
