"""
MarketLabs MCP Server — Claude Desktop integration via Model Context Protocol.

Proxies requests to the running MarketLabs API.
Start with: make dev-mcp-server (or python mcp_server.py)
"""
import os
import sys
import json

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=False)
except Exception:
    pass

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MarketLabs")

API_URL = os.getenv("MARKETLABS_API_URL", "http://localhost:5000")
API_USERNAME = os.getenv("MARKETLABS_USERNAME", "marketlabs")
API_PASSWORD = os.getenv("MARKETLABS_PASSWORD", "marketlabs123")

_jwt_token: str = ""


def _get_token_sync() -> str:
    global _jwt_token
    if _jwt_token:
        return _jwt_token
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{API_URL}/api/auth/login",
            json={"username": API_USERNAME, "password": API_PASSWORD},
        )
        data = resp.json()
        if data.get("code") == 1 and data.get("data", {}).get("token"):
            _jwt_token = data["data"]["token"]
            return _jwt_token
    raise RuntimeError("Failed to authenticate with MarketLabs API")


def _api_get(path: str, params: dict = None) -> dict:
    token = _get_token_sync()
    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{API_URL}{path}",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


def _api_post(path: str, json_data: dict = None) -> dict:
    token = _get_token_sync()
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            f"{API_URL}{path}",
            json=json_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


# ─── Tools ────────────────────────────────────────────────────────────────────

@mcp.tool()
def get_price(market: str, symbol: str) -> str:
    """Get the current price for a symbol. Market can be: USStock, Crypto, IndianStock, Forex, Futures."""
    data = _api_get("/api/market/watchlist/prices", {
        "watchlist": json.dumps([{"market": market, "symbol": symbol}])
    })
    if data.get("code") == 1 and data.get("data"):
        item = data["data"][0]
        return json.dumps(item, indent=2)
    return json.dumps({"error": "Could not fetch price", "details": data.get("msg", "")})


@mcp.tool()
def search_symbols(keyword: str, market: str = "") -> str:
    """Search for symbols by keyword. Optionally filter by market type."""
    params = {"keyword": keyword}
    if market:
        params["market"] = market
    data = _api_get("/api/market/symbols/search", params)
    if data.get("code") == 1 and data.get("data"):
        return json.dumps(data["data"][:15], indent=2)
    return json.dumps({"error": "No results", "details": data.get("msg", "")})


@mcp.tool()
def get_watchlist() -> str:
    """Get the user's watchlist with all tracked symbols."""
    data = _api_get("/api/market/watchlist/get", {"userid": "1"})
    if data.get("code") == 1 and data.get("data"):
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": "Could not load watchlist"})


@mcp.tool()
def add_to_watchlist(market: str, symbol: str) -> str:
    """Add a symbol to the watchlist. Market can be: USStock, Crypto, IndianStock, Forex, Futures."""
    data = _api_post("/api/market/watchlist/add", {
        "userid": 1,
        "market": market,
        "symbol": symbol,
    })
    if data.get("code") == 1:
        return json.dumps({"status": "added", "market": market, "symbol": symbol})
    return json.dumps({"error": data.get("msg", "Failed to add")})


@mcp.tool()
def analyze_symbol(market: str, symbol: str) -> str:
    """Run AI analysis on a symbol. Returns comprehensive market analysis."""
    data = _api_post("/api/fast-analysis/analyze", {
        "market": market,
        "symbol": symbol,
    })
    if data.get("code") == 1 and data.get("data"):
        result = data["data"]
        return result.get("analysis") or result.get("summary") or json.dumps(result, indent=2)
    return json.dumps({"error": "Analysis failed", "details": data.get("msg", "")})


@mcp.tool()
def get_portfolio() -> str:
    """Get portfolio summary including total value, P/L, and positions."""
    data = _api_get("/api/portfolio/summary")
    if data.get("code") == 1 and data.get("data"):
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": "Could not load portfolio"})


@mcp.tool()
def get_chart_data(market: str, symbol: str, timeframe: str = "1D", limit: int = 100) -> str:
    """Get OHLCV candlestick data for a symbol. Timeframes: 1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W."""
    data = _api_post("/api/indicator/getIndicators", {
        "market": market,
        "symbol": symbol,
        "timeframe": timeframe,
        "limit": limit,
        "indicators": [],
    })
    if data.get("code") == 1 and data.get("data"):
        klines = data["data"].get("klines") or data["data"].get("data") or data["data"]
        if isinstance(klines, list):
            return json.dumps(klines[-20:], indent=2)  # Return last 20 candles to stay within context
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": "Could not fetch chart data"})


@mcp.tool()
def get_market_overview() -> str:
    """Get global market overview including major indices, fear/greed index, and VIX."""
    data = _api_get("/api/global-market/overview")
    if data.get("code") == 1 and data.get("data"):
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": "Could not load market overview"})


@mcp.tool()
def get_strategy_analytics(strategy_id: int = 0) -> str:
    """Get advanced performance analytics: win rate, Sharpe ratio, max drawdown, expectancy, streaks."""
    params = {}
    if strategy_id:
        params["id"] = strategy_id
    data = _api_get("/api/strategies/analytics", params)
    if data.get("code") == 1 and data.get("data"):
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": "Could not load analytics"})


@mcp.tool()
def place_basket_order(orders: str) -> str:
    """Place multiple orders at once. Orders is a JSON string: [{"market":"USStock","symbol":"AAPL","side":"buy","quantity":10}, ...]"""
    try:
        order_list = json.loads(orders)
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON for orders"})
    data = _api_post("/api/basket/execute", {"orders": order_list})
    if data.get("code") == 1:
        return json.dumps(data["data"], indent=2)
    return json.dumps({"error": data.get("msg", "Basket order failed")})


@mcp.tool()
def export_trades(strategy_id: int = 0) -> str:
    """Export trade history as JSON. Optionally filter by strategy_id."""
    params = {"format": "json"}
    if strategy_id:
        params["id"] = strategy_id
    data = _api_get("/api/strategies/trades/export", params)
    if data.get("code") == 1 and data.get("data"):
        trades = data["data"]
        return json.dumps(trades[:50], indent=2)  # Limit to 50 for context
    return json.dumps({"error": "Could not export trades"})


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
