# ============================================================
# Dual Moving Average Strategy (with external parameter config)
# ============================================================
#
# Usage:
# 1. Select this indicator in the trading assistant
# 2. Configure different parameters per symbol, e.g.:
#    - BTC/USDT: sma_short=5, sma_long=10
#    - ETH/USDT: sma_short=5, sma_long=20
#
# ============================================================

# === Parameter declarations (shown in frontend form) ===
# @param sma_short int 14 Short SMA period
# @param sma_long int 28 Long SMA period

# === Get parameters (with defaults as fallback) ===
sma_short_period = params.get('sma_short', 14)
sma_long_period = params.get('sma_long', 28)

# === Indicator info ===
my_indicator_name = "Dual Moving Average"
my_indicator_description = f"Short {sma_short_period} / Long {sma_long_period} SMA cross strategy"

# === Compute SMAs ===
df = df.copy()
sma_short = df["close"].rolling(sma_short_period).mean()
sma_long = df["close"].rolling(sma_long_period).mean()

# === Generate buy/sell signals ===
# Golden cross: short SMA crosses above long SMA
buy = (sma_short > sma_long) & (sma_short.shift(1) <= sma_long.shift(1))
# Death cross: short SMA crosses below long SMA
sell = (sma_short < sma_long) & (sma_short.shift(1) >= sma_long.shift(1))

df["buy"] = buy.fillna(False).astype(bool)
df["sell"] = sell.fillna(False).astype(bool)

# === Buy/sell mark points (for chart display) ===
buy_marks = [df["low"].iloc[i] * 0.995 if df["buy"].iloc[i] else None for i in range(len(df))]
sell_marks = [df["high"].iloc[i] * 1.005 if df["sell"].iloc[i] else None for i in range(len(df))]

# === Chart output config ===
output = {
    "name": my_indicator_name,
    "plots": [
        {"name": f"SMA{sma_short_period}", "data": sma_short.tolist(), "color": "#FF9800", "overlay": True},
        {"name": f"SMA{sma_long_period}", "data": sma_long.tolist(), "color": "#3F51B5", "overlay": True}
    ],
    "signals": [
        {"type": "buy", "text": "B", "data": buy_marks, "color": "#00E676"},
        {"type": "sell", "text": "S", "data": sell_marks, "color": "#FF5252"}
    ]
}
