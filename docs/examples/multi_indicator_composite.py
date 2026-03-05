# ============================================================
# Multi-Indicator Composite Strategy (SMA + RSI + MACD)
# ============================================================
#
# Usage:
# 1. Configurable SMA periods, RSI thresholds, etc.
# 2. Buy: RSI oversold + MACD golden cross + volume surge
# 3. Sell: RSI overbought or MACD death cross
#
# ============================================================

# === Parameter declarations ===
# @param sma_short int 10 Short SMA period
# @param sma_long int 30 Long SMA period
# @param rsi_period int 14 RSI period
# @param rsi_oversold int 30 RSI oversold threshold
# @param rsi_overbought int 70 RSI overbought threshold
# @param use_macd bool True Whether to use MACD filter
# @param use_volume bool False Whether to use volume filter
# @param volume_mult float 1.5 Volume surge multiplier

# === Get parameters ===
sma_short_period = params.get('sma_short', 10)
sma_long_period = params.get('sma_long', 30)
rsi_period = params.get('rsi_period', 14)
rsi_oversold = params.get('rsi_oversold', 30)
rsi_overbought = params.get('rsi_overbought', 70)
use_macd = params.get('use_macd', True)
use_volume = params.get('use_volume', False)
volume_mult = params.get('volume_mult', 1.5)

# === Indicator info ===
my_indicator_name = "Multi-Indicator Composite"
my_indicator_description = f"SMA{sma_short_period}/{sma_long_period} + RSI{rsi_period}"

df = df.copy()

# === Compute SMAs ===
sma_short = df["close"].rolling(sma_short_period).mean()
sma_long = df["close"].rolling(sma_long_period).mean()

# === Compute RSI ===
delta = df["close"].diff()
gain = delta.where(delta > 0, 0).rolling(window=rsi_period).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
rs = gain / loss
rsi = 100 - (100 / (1 + rs))

# === Compute MACD ===
exp1 = df["close"].ewm(span=12, adjust=False).mean()
exp2 = df["close"].ewm(span=26, adjust=False).mean()
macd = exp1 - exp2
macd_signal = macd.ewm(span=9, adjust=False).mean()
macd_hist = macd - macd_signal

# === Volume moving average ===
volume_ma = df["volume"].rolling(20).mean()

# === Signal conditions ===
# SMA golden cross
ma_golden = (sma_short > sma_long) & (sma_short.shift(1) <= sma_long.shift(1))
# SMA death cross
ma_death = (sma_short < sma_long) & (sma_short.shift(1) >= sma_long.shift(1))
# RSI oversold
rsi_buy = rsi < rsi_oversold
# RSI overbought
rsi_sell = rsi > rsi_overbought
# MACD golden cross
macd_golden = (macd > macd_signal) & (macd.shift(1) <= macd_signal.shift(1))
# MACD death cross
macd_death = (macd < macd_signal) & (macd.shift(1) >= macd_signal.shift(1))
# Volume surge
volume_up = df["volume"] > volume_ma * volume_mult

# === Combined buy/sell signals ===
buy = ma_golden | rsi_buy  # SMA golden cross or RSI oversold

if use_macd:
    buy = buy & (macd > macd_signal)  # Require MACD bullish

if use_volume:
    buy = buy & volume_up  # Require volume surge

sell = ma_death | rsi_sell  # SMA death cross or RSI overbought

if use_macd:
    sell = sell | macd_death  # Also sell on MACD death cross

df["buy"] = buy.fillna(False).astype(bool)
df["sell"] = sell.fillna(False).astype(bool)

# === Buy/sell mark points ===
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
