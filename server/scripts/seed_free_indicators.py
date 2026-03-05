"""
Seed free, public indicators into the Indicator Market.

Creates default indicators that are visible to everyone (publish_to_community=1,
pricing_type='free', price=0, review_status='approved'). Run once after deploy
or when the DB has at least one user.

Usage (from repo root):
  cd server && python scripts/seed_free_indicators.py

Requires: DATABASE_URL in server/.env (or environment).
"""

from __future__ import annotations

import os
import sys

# Load .env and ensure app is importable
_server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _server_dir not in sys.path:
    sys.path.insert(0, _server_dir)
os.chdir(_server_dir)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_server_dir, ".env"), override=False)
except Exception:
    pass

from app.utils.db import get_db_connection

# ---------------------------------------------------------------------------
# Free indicator definitions: (name, description, code)
# Code must be valid Python that uses df (DataFrame), params (dict), and sets output.
# ---------------------------------------------------------------------------

DUAL_MA_CODE = r'''
# @param sma_short int 14 Short SMA period
# @param sma_long int 28 Long SMA period
sma_short_period = params.get('sma_short', 14)
sma_long_period = params.get('sma_long', 28)
my_indicator_name = "Dual Moving Average"
my_indicator_description = "EMA crossover: buy when short crosses above long, sell on cross below"
df = df.copy()
sma_short = df["close"].rolling(sma_short_period).mean()
sma_long = df["close"].rolling(sma_long_period).mean()
buy = (sma_short > sma_long) & (sma_short.shift(1) <= sma_long.shift(1))
sell = (sma_short < sma_long) & (sma_short.shift(1) >= sma_long.shift(1))
df["buy"] = buy.fillna(False).astype(bool)
df["sell"] = sell.fillna(False).astype(bool)
buy_marks = [df["low"].iloc[i] * 0.995 if df["buy"].iloc[i] else None for i in range(len(df))]
sell_marks = [df["high"].iloc[i] * 1.005 if df["sell"].iloc[i] else None for i in range(len(df))]
output = {
    "name": my_indicator_name,
    "plots": [
        {"name": "SMA_short", "data": sma_short.tolist(), "color": "#FF9800", "overlay": True},
        {"name": "SMA_long", "data": sma_long.tolist(), "color": "#3F51B5", "overlay": True}
    ],
    "signals": [
        {"type": "buy", "text": "B", "data": buy_marks, "color": "#00E676"},
        {"type": "sell", "text": "S", "data": sell_marks, "color": "#FF5252"}
    ]
}
'''

BOLLINGER_CODE = r'''
# @param period int 20 SMA period
# @param std_dev float 2.0 Standard deviations for bands
period = int(params.get('period', 20))
std_dev = float(params.get('std_dev', 2.0))
my_indicator_name = "Bollinger Bands Strategy"
my_indicator_description = "Middle = SMA(close), upper/lower = middle ± k*std. Buy near lower band, sell near upper."
df = df.copy()
middle = df["close"].rolling(period).mean()
std = df["close"].rolling(period).std().fillna(0)
upper = middle + std_dev * std
lower = middle - std_dev * std
buy = (df["close"] <= lower * 1.001) & (df["close"].shift(1) > lower.shift(1))
sell = (df["close"] >= upper * 0.999) & (df["close"].shift(1) < upper.shift(1))
df["buy"] = buy.fillna(False).astype(bool)
df["sell"] = sell.fillna(False).astype(bool)
buy_marks = [df["low"].iloc[i] * 0.995 if df["buy"].iloc[i] else None for i in range(len(df))]
sell_marks = [df["high"].iloc[i] * 1.005 if df["sell"].iloc[i] else None for i in range(len(df))]
output = {
    "name": my_indicator_name,
    "plots": [
        {"name": "Middle", "data": middle.tolist(), "color": "#9E9E9E", "overlay": True},
        {"name": "Upper", "data": upper.tolist(), "color": "#2196F3", "overlay": True},
        {"name": "Lower", "data": lower.tolist(), "color": "#2196F3", "overlay": True}
    ],
    "signals": [
        {"type": "buy", "text": "B", "data": buy_marks, "color": "#00E676"},
        {"type": "sell", "text": "S", "data": sell_marks, "color": "#FF5252"}
    ]
}
'''

RSI_CODE = r'''
# @param period int 14 RSI period
# @param oversold int 30 RSI oversold threshold
# @param overbought int 70 RSI overbought threshold
period = int(params.get('period', 14))
oversold = int(params.get('oversold', 30))
overbought = int(params.get('overbought', 70))
my_indicator_name = "RSI Strategy"
my_indicator_description = "RSI oversold (buy) and overbought (sell) signals"
df = df.copy()
delta = df["close"].diff()
gain = delta.where(delta > 0, 0.0).rolling(period).mean()
loss = (-delta.where(delta < 0, 0.0)).rolling(period).mean()
rs = gain / loss.replace(0, 1e-10)
rsi = (100 - (100 / (1 + rs))).fillna(50)
buy = (rsi < oversold) & (rsi.shift(1) >= oversold)
sell = (rsi > overbought) & (rsi.shift(1) <= overbought)
df["buy"] = buy.fillna(False).astype(bool)
df["sell"] = sell.fillna(False).astype(bool)
buy_marks = [df["low"].iloc[i] * 0.995 if df["buy"].iloc[i] else None for i in range(len(df))]
sell_marks = [df["high"].iloc[i] * 1.005 if df["sell"].iloc[i] else None for i in range(len(df))]
output = {
    "name": my_indicator_name,
    "plots": [
        {"name": "RSI", "data": rsi.tolist(), "color": "#9C27B0", "overlay": False}
    ],
    "signals": [
        {"type": "buy", "text": "B", "data": buy_marks, "color": "#00E676"},
        {"type": "sell", "text": "S", "data": sell_marks, "color": "#FF5252"}
    ]
}
'''

INDICATORS = [
    ("Dual Moving Average", "EMA crossover: buy when short crosses above long, sell on cross below. Free for everyone.", DUAL_MA_CODE),
    ("Bollinger Bands Strategy", "Middle band = SMA, upper/lower = middle ± 2*std. Buy near lower band, sell near upper. Free for everyone.", BOLLINGER_CODE),
    ("RSI Strategy", "RSI oversold (buy) and overbought (sell) signals. Free for everyone.", RSI_CODE),
]


def get_owner_id(cursor) -> int:
    """Return user_id to own the seeded indicators (first user or 1)."""
    cursor.execute("SELECT id FROM qd_users ORDER BY id ASC LIMIT 1")
    row = cursor.fetchone()
    if row:
        return int(row['id'] if isinstance(row, dict) else row[0])
    return 1


def seed():
    with get_db_connection() as db:
        cur = db.cursor()
        owner_id = get_owner_id(cur)
        now = str(int(__import__('time').time()))
        inserted = 0
        for name, description, code in INDICATORS:
            cur.execute(
                "SELECT id FROM qd_indicator_codes WHERE name = ? AND user_id = ? LIMIT 1",
                (name, owner_id),
            )
            if cur.fetchone():
                print(f"  Skip (exists): {name}")
                continue
            cur.execute(
                """
                INSERT INTO qd_indicator_codes
                  (user_id, is_buy, end_time, name, code, description,
                   publish_to_community, pricing_type, price, preview_image, vip_free, review_status,
                   createtime, updatetime, created_at, updated_at)
                VALUES (?, 0, 1, ?, ?, ?, 1, 'free', 0, '', true, 'approved', ?, ?, NOW(), NOW())
                """,
                (owner_id, name, code.strip(), description, now, now),
            )
            inserted += 1
            print(f"  Inserted: {name}")
        db.commit()
    return inserted


def main():
    print("Seeding free public indicators...")
    try:
        n = seed()
        print(f"Done. Inserted {n} indicator(s). They appear in Indicator Market as free and public.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
