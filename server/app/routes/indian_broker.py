"""
Indian Broker API routes — instrument search, Zerodha auth flow, historical data.

Endpoints:
- GET  /api/indian-broker/instruments/download   - Download master contract from Zerodha
- GET  /api/indian-broker/instruments/search      - Search instruments (equity, F&O, indices)
- GET  /api/indian-broker/zerodha/login-url       - Get Zerodha Kite login URL
- POST /api/indian-broker/zerodha/callback        - Exchange request_token for access_token
- POST /api/indian-broker/history                 - Fetch OHLCV candle data
"""

from __future__ import annotations

import hashlib
import io
import os
import time
from typing import Any, Dict, List, Optional

import pandas as pd
from flask import Blueprint, jsonify, request

from app.utils.logger import get_logger

logger = get_logger(__name__)

indian_broker_bp = Blueprint("indian_broker", __name__, url_prefix="/api/indian-broker")

# ---------------------------------------------------------------------------
# In-memory instrument cache (refreshed on download)
# ---------------------------------------------------------------------------
_instrument_cache: Dict[str, Any] = {
    "df": None,          # pd.DataFrame of all instruments
    "updated_at": 0,     # timestamp
}

CACHE_TTL = 86400  # 24 hours — instruments change daily


def _get_instruments_df() -> Optional[pd.DataFrame]:
    """Return cached instrument DataFrame, or None if not yet downloaded."""
    if _instrument_cache["df"] is not None:
        age = time.time() - _instrument_cache["updated_at"]
        if age < CACHE_TTL:
            return _instrument_cache["df"]
    return None


def _download_zerodha_instruments(api_key: str, access_token: str) -> pd.DataFrame:
    """
    Download the full instrument list from Zerodha Kite API.
    Returns a processed DataFrame with standardised columns.
    """
    import requests as req

    headers = {
        "X-Kite-Version": "3",
        "Authorization": f"token {api_key}:{access_token}",
    }

    resp = req.get("https://api.kite.trade/instruments", headers=headers, timeout=30)
    resp.raise_for_status()

    df = pd.read_csv(io.StringIO(resp.text))
    logger.info(f"Downloaded {len(df)} instruments from Zerodha")

    # Process — same logic as OpenAlgo's process_zerodha_csv
    # Map exchange names for indices
    df.loc[(df["segment"] == "INDICES") & (df["exchange"] == "NSE"), "exchange"] = "NSE_INDEX"
    df.loc[(df["segment"] == "INDICES") & (df["exchange"] == "BSE"), "exchange"] = "BSE_INDEX"

    # Format expiry
    df["expiry"] = pd.to_datetime(df["expiry"], errors="coerce").dt.strftime("%d-%b-%y").str.upper()
    df["expiry"] = df["expiry"].fillna("")

    # Standardise columns
    df = df.rename(columns={
        "instrument_token": "instrument_token",
        "exchange_token": "exchange_token",
        "tradingsymbol": "tradingsymbol",
        "name": "name",
        "expiry": "expiry",
        "strike": "strike",
        "lot_size": "lot_size",
        "instrument_type": "instrument_type",
        "exchange": "exchange",
        "tick_size": "tick_size",
        "segment": "segment",
    })

    # Cache it
    _instrument_cache["df"] = df
    _instrument_cache["updated_at"] = time.time()

    return df


# ---------------------------------------------------------------------------
# Instrument Download & Search
# ---------------------------------------------------------------------------

@indian_broker_bp.route("/instruments/download", methods=["POST"])
def instruments_download():
    """
    Download master contract from Zerodha.
    Body: { api_key, access_token }
    """
    try:
        data = request.get_json() or {}
        api_key = data.get("api_key") or os.getenv("ZERODHA_API_KEY", "")
        access_token = data.get("access_token") or os.getenv("ZERODHA_ACCESS_TOKEN", "")

        if not api_key or not access_token:
            return jsonify({"code": 0, "msg": "api_key and access_token required", "data": None})

        df = _download_zerodha_instruments(api_key, access_token)

        # Summary stats
        exchanges = df["exchange"].value_counts().to_dict()
        return jsonify({
            "code": 1,
            "msg": f"Downloaded {len(df)} instruments",
            "data": {
                "total": len(df),
                "exchanges": exchanges,
            }
        })

    except Exception as e:
        logger.error(f"instruments_download failed: {e}")
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@indian_broker_bp.route("/instruments/search", methods=["GET"])
def instruments_search():
    """
    Search instruments.
    Query params:
      q        - search keyword (e.g., NIFTY, RELIANCE, BANKNIFTY)
      exchange - filter by exchange (NSE, NFO, BSE, BFO, NSE_INDEX, MCX)
      type     - filter by instrument_type (EQ, FUT, CE, PE)
      limit    - max results (default 50)
    """
    try:
        df = _get_instruments_df()
        if df is None:
            return jsonify({
                "code": 0,
                "msg": "Instruments not loaded. Call /instruments/download first.",
                "data": None
            })

        q = (request.args.get("q") or "").strip().upper()
        exchange = (request.args.get("exchange") or "").strip().upper()
        inst_type = (request.args.get("type") or "").strip().upper()
        limit = int(request.args.get("limit", 50))

        result = df.copy()

        if q:
            mask = (
                result["tradingsymbol"].str.upper().str.contains(q, na=False)
                | result["name"].str.upper().str.contains(q, na=False)
            )
            result = result[mask]

        if exchange:
            result = result[result["exchange"].str.upper() == exchange]

        if inst_type:
            result = result[result["instrument_type"].str.upper() == inst_type]

        # Sort by name relevance — exact prefix match first
        if q:
            result = result.copy()
            result["_sort"] = result["tradingsymbol"].str.upper().str.startswith(q).astype(int) * -1
            result = result.sort_values("_sort")
            result = result.drop(columns=["_sort"])

        result = result.head(limit)

        items = []
        for _, row in result.iterrows():
            items.append({
                "tradingsymbol": row.get("tradingsymbol", ""),
                "name": row.get("name", ""),
                "exchange": row.get("exchange", ""),
                "instrument_type": row.get("instrument_type", ""),
                "instrument_token": int(row.get("instrument_token", 0)),
                "exchange_token": int(row.get("exchange_token", 0)) if pd.notna(row.get("exchange_token")) else 0,
                "strike": float(row.get("strike", 0)) if pd.notna(row.get("strike")) else 0,
                "lot_size": int(row.get("lot_size", 0)) if pd.notna(row.get("lot_size")) else 0,
                "expiry": row.get("expiry", ""),
                "tick_size": float(row.get("tick_size", 0)) if pd.notna(row.get("tick_size")) else 0,
                "segment": row.get("segment", ""),
            })

        return jsonify({"code": 1, "msg": "success", "data": items})

    except Exception as e:
        logger.error(f"instruments_search failed: {e}")
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Zerodha Auth Flow (request_token → access_token)
# ---------------------------------------------------------------------------

@indian_broker_bp.route("/zerodha/login-url", methods=["GET"])
def zerodha_login_url():
    """
    Return the Kite login URL for the user to authorize.
    Uses ZERODHA_API_KEY from .env.
    """
    api_key = os.getenv("ZERODHA_API_KEY", "")
    if not api_key:
        return jsonify({"code": 0, "msg": "ZERODHA_API_KEY not configured in .env", "data": None})

    redirect_url = os.getenv("ZERODHA_REDIRECT_URL", "")
    login_url = f"https://kite.trade/connect/login?v=3&api_key={api_key}"
    if redirect_url:
        login_url += f"&redirect_url={redirect_url}"

    return jsonify({"code": 1, "msg": "success", "data": {"login_url": login_url}})


@indian_broker_bp.route("/zerodha/callback", methods=["POST"])
def zerodha_callback():
    """
    Exchange Zerodha request_token for access_token.
    Body: { request_token } (or { request_token, api_key, api_secret })

    This implements the Kite Connect OAuth flow:
    1. User logs in via Kite login URL → gets request_token
    2. This endpoint exchanges it for an access_token using SHA256(api_key + request_token + api_secret)
    """
    try:
        data = request.get_json() or {}
        request_token = data.get("request_token", "").strip()
        api_key = data.get("api_key") or os.getenv("ZERODHA_API_KEY", "")
        api_secret = data.get("api_secret") or os.getenv("ZERODHA_API_SECRET", "")

        if not request_token:
            return jsonify({"code": 0, "msg": "request_token is required", "data": None})
        if not api_key or not api_secret:
            return jsonify({"code": 0, "msg": "ZERODHA_API_KEY and ZERODHA_API_SECRET must be set", "data": None})

        # Generate checksum: SHA256(api_key + request_token + api_secret)
        checksum = hashlib.sha256(f"{api_key}{request_token}{api_secret}".encode()).hexdigest()

        import requests as req
        resp = req.post(
            "https://api.kite.trade/session/token",
            data={
                "api_key": api_key,
                "request_token": request_token,
                "checksum": checksum,
            },
            headers={"X-Kite-Version": "3"},
            timeout=15,
        )

        body = resp.json()
        if resp.status_code != 200 or body.get("status") == "error":
            error_msg = body.get("message", body.get("error", "Unknown error"))
            return jsonify({"code": 0, "msg": f"Kite auth failed: {error_msg}", "data": None})

        access_token = body.get("data", {}).get("access_token", "")
        if not access_token:
            return jsonify({"code": 0, "msg": "No access_token in response", "data": None})

        return jsonify({
            "code": 1,
            "msg": "Access token obtained successfully",
            "data": {
                "access_token": access_token,
                "user_id": body.get("data", {}).get("user_id", ""),
                "user_name": body.get("data", {}).get("user_name", ""),
                "login_time": body.get("data", {}).get("login_time", ""),
            }
        })

    except Exception as e:
        logger.error(f"zerodha_callback failed: {e}")
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Historical Data
# ---------------------------------------------------------------------------

@indian_broker_bp.route("/history", methods=["POST"])
def historical_data():
    """
    Fetch OHLCV candle data from Zerodha.
    Body: {
        api_key, access_token,
        instrument_token,   # numeric token from instrument search
        interval,           # minute, 3minute, 5minute, 15minute, 30minute, 60minute, day
        from_date,          # YYYY-MM-DD
        to_date,            # YYYY-MM-DD
    }
    """
    try:
        data = request.get_json() or {}
        api_key = data.get("api_key") or os.getenv("ZERODHA_API_KEY", "")
        access_token = data.get("access_token") or os.getenv("ZERODHA_ACCESS_TOKEN", "")
        instrument_token = data.get("instrument_token")
        interval = data.get("interval", "day")
        from_date = data.get("from_date", "")
        to_date = data.get("to_date", "")

        if not api_key or not access_token:
            return jsonify({"code": 0, "msg": "api_key and access_token required", "data": None})
        if not instrument_token:
            return jsonify({"code": 0, "msg": "instrument_token required", "data": None})
        if not from_date or not to_date:
            return jsonify({"code": 0, "msg": "from_date and to_date required (YYYY-MM-DD)", "data": None})

        import requests as req

        headers = {
            "X-Kite-Version": "3",
            "Authorization": f"token {api_key}:{access_token}",
        }

        # Zerodha historical API — fetch in 60-day chunks for intraday
        from_str = f"{from_date}+00:00:00"
        to_str = f"{to_date}+23:59:59"

        url = f"https://api.kite.trade/instruments/historical/{instrument_token}/{interval}?from={from_str}&to={to_str}&oi=1"
        resp = req.get(url, headers=headers, timeout=30)
        body = resp.json()

        if resp.status_code != 200 or body.get("status") != "success":
            error_msg = body.get("message", body.get("error", "Unknown error"))
            return jsonify({"code": 0, "msg": f"History fetch failed: {error_msg}", "data": None})

        candles = body.get("data", {}).get("candles", [])

        # Format: [[timestamp, open, high, low, close, volume, oi], ...]
        formatted = []
        for c in candles:
            formatted.append({
                "timestamp": c[0] if len(c) > 0 else "",
                "open": c[1] if len(c) > 1 else 0,
                "high": c[2] if len(c) > 2 else 0,
                "low": c[3] if len(c) > 3 else 0,
                "close": c[4] if len(c) > 4 else 0,
                "volume": c[5] if len(c) > 5 else 0,
                "oi": c[6] if len(c) > 6 else 0,
            })

        return jsonify({
            "code": 1,
            "msg": f"{len(formatted)} candles",
            "data": formatted
        })

    except Exception as e:
        logger.error(f"historical_data failed: {e}")
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500
