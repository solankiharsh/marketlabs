# ============================================================
# Cross-Sectional Strategy Indicator Example
# Momentum + RSI Composite Score
# ============================================================
#
# Usage:
# 1. Create a cross-sectional strategy in the trading assistant
# 2. Select this indicator as the strategy indicator
# 3. Configure symbol list, portfolio size, long ratio, etc.
#
# Scoring logic:
# - Momentum factor (20-period): price change rate, higher is better
# - RSI (14-period): inverted RSI (100 - RSI), lower RSI = higher score
# - Composite: 70% momentum + 30% inverted RSI
#
# ============================================================

# Cross-sectional strategy indicator
# Input: data = {symbol1: df1, symbol2: df2, ...}
# Output: scores = {symbol1: score1, symbol2: score2, ...}

scores = {}

# Iterate through all symbols
for symbol, df in data.items():
    # Ensure we have enough data
    if len(df) < 20:
        scores[symbol] = 0
        continue

    # === 1. Momentum factor (20-period) ===
    # Momentum = (current price / price 20 bars ago - 1) * 100
    momentum = (df['close'].iloc[-1] / df['close'].iloc[-20] - 1) * 100

    # === 2. RSI (14-period) ===
    def calculate_rsi(prices, period=14):
        """Compute RSI."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]

    rsi_value = calculate_rsi(df['close'], 14)

    # === 3. Composite score ===
    # Higher momentum = higher score
    # Lower RSI (oversold) = higher score (100 - RSI)
    # Weights: 70% momentum + 30% inverted RSI
    momentum_score = momentum
    rsi_score = 100 - rsi_value  # Inverted RSI (lower RSI = higher score)

    composite_score = momentum_score * 0.7 + rsi_score * 0.3

    scores[symbol] = composite_score

# === Optional: manual ranking ===
# If not provided, system sorts by scores automatically
# rankings = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

# === System auto-handling ===
# 1. Sort all symbols by score (high to low)
# 2. Long top N symbols (based on portfolio_size * long_ratio)
# 3. Short bottom N symbols (based on portfolio_size * (1 - long_ratio))
# 4. Auto-generate buy/sell/close signals
