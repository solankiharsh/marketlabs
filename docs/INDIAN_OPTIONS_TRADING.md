# Indian Index Options Trading Guide

This guide covers trading Indian index options (Nifty, Bank Nifty, Sensex) via MarketLabs using Zerodha or Angel One.

## Prerequisites

1. **F&O Segment Enabled** — Your broker account must have Futures & Options (F&O) segment activated on NSE/BSE.
2. **API Access Configured**:
   - **Zerodha**: Create a Kite Connect app at [https://developers.kite.trade](https://developers.kite.trade). Requires a paid API subscription.
   - **Angel One**: Generate a SmartAPI key at [https://smartapi.angelone.in](https://smartapi.angelone.in). Free API access.
3. **Sufficient Margin** — SPAN + exposure margin required for option selling; premium required for option buying.

## Supported Indices

| Index | Exchange | Lot Size | Tick Size | Weekly Expiry |
|-------|----------|----------|-----------|---------------|
| Nifty 50 | NFO (NSE F&O) | 25 | 0.05 | Thursday |
| Bank Nifty | NFO (NSE F&O) | 15 | 0.05 | Wednesday |
| Sensex | BFO (BSE F&O) | 10 | 0.05 | Friday (monthly) |

> Lot sizes are subject to change by exchanges. Check the latest circular.

## Option Symbol Format

### Zerodha (Kite Connect)

Zerodha uses tradingsymbol format:

```
NIFTY{YYMDD}{STRIKE}{CE/PE}
```

Examples:
- `NIFTY2430322000CE` — Nifty 22000 CE expiring 03-Mar-2024
- `BANKNIFTY24306500PE` — Bank Nifty 50000 PE expiring 06-Mar-2024
- `SENSEX2432880000CE` — Sensex 80000 CE expiring 28-Mar-2024

### Angel One (SmartAPI)

Angel One uses instrument tokens (numeric). Look up the token via the instrument master file or use the symbol search API.

- Symbol: `NIFTY` / `BANKNIFTY` / `SENSEX`
- Token: Numeric instrument token from master file
- Exchange: `NFO` or `BFO`

## Exchange Codes

| Code | Description |
|------|-------------|
| `NFO` | NSE Futures & Options |
| `BFO` | BSE Futures & Options |
| `NSE` | NSE Cash (Equities) |
| `BSE` | BSE Cash (Equities) |

## Product Types

### Zerodha
| Product | Description |
|---------|-------------|
| `NRML` | Normal / Carry forward (overnight positions) |
| `MIS` | Margin Intraday Square-off (auto-squared off at 3:15 PM) |

### Angel One
| Product | Description |
|---------|-------------|
| `CARRYFORWARD` | Carry forward (overnight positions) |
| `INTRADAY` | Intraday (auto-squared off at 3:15 PM) |

## Order Types

Both brokers support:

| Order Type | Zerodha | Angel One | Description |
|------------|---------|-----------|-------------|
| Market | `MARKET` | `MARKET` | Execute at best available price |
| Limit | `LIMIT` | `LIMIT` | Execute at specified price or better |
| Stop Loss | `SL` | `STOPLOSS_LIMIT` | Trigger at stop price, then limit order |
| Stop Loss Market | `SL-M` | `STOPLOSS_MARKET` | Trigger at stop price, then market order |

## How to Trade via MarketLabs

1. **Create a Strategy** in Trading Assistant
2. **Select Market**: Choose `Indian Stock` from the market category
3. **Select Broker**: Choose Zerodha or Angel One
4. **Enter Credentials**:
   - **Zerodha**: API Key + Access Token (generated daily)
   - **Angel One**: API Key + Client ID + Password + TOTP Key
5. **Test Connection** to verify credentials
6. **Configure Symbol**:
   - For index options, use NFO exchange symbols
   - Example: `IndianStock:NIFTY2430322000CE` for Nifty options
7. **Set Execution Mode** to `Live` for real trading
8. **Deploy** the strategy

## Margin Requirements

### Option Buying
- Pay the full premium upfront
- Maximum loss limited to premium paid
- No additional margin required

### Option Selling
- **SPAN Margin**: Exchange-calculated margin based on risk
- **Exposure Margin**: Additional margin as safety buffer
- Total margin = SPAN + Exposure (typically 1-2 lakh per lot for Nifty)
- Use margin calculators on broker websites for exact requirements

## Expiry Schedule

| Index | Weekly Expiry | Monthly Expiry |
|-------|--------------|----------------|
| Nifty 50 | Every Thursday | Last Thursday of month |
| Bank Nifty | Every Wednesday | Last Wednesday of month |
| Sensex | — | Last Friday of month |
| Fin Nifty | Every Tuesday | Last Tuesday of month |

> Trading hours: 9:15 AM to 3:30 PM IST (Monday to Friday, excluding holidays)

## API-Specific Notes

### Zerodha (Kite Connect)

- **Daily Token Refresh**: Access tokens expire daily. Generate a new one each morning via the Kite login URL:
  ```
  https://kite.trade/connect/login?v=3&api_key=YOUR_API_KEY
  ```
  After login, you receive a `request_token`. Exchange it for an `access_token` using the session API.

- **API Key**: Obtained from the Kite Connect developer console. Subscription required (~Rs 2000/month).

- **Rate Limits**: 3 requests/second for order placement, 1 request/second for historical data.

- **WebSocket**: Kite Connect provides WebSocket for live market data streaming.

### Angel One (SmartAPI)

- **TOTP Setup**: Configure TOTP via your authenticator app (Google Authenticator, etc.). The TOTP secret key is used by MarketLabs to auto-generate OTP for login.

- **SmartAPI Key**: Free to generate from the Angel One SmartAPI developer portal.

- **Auto-Login**: With API key + client ID + password + TOTP key, MarketLabs can automatically establish sessions without manual intervention.

- **Rate Limits**: 10 requests/second for order APIs.

- **Instrument Master**: Download the instrument list daily from Angel One's API to get the latest tokens and symbols.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid access token" (Zerodha) | Regenerate access token — they expire daily |
| "Invalid TOTP" (Angel One) | Verify TOTP key matches your authenticator app setup |
| "Insufficient margin" | Check margin requirements; ensure adequate funds |
| "Order rejected — market closed" | NSE/BSE trading hours: 9:15 AM - 3:30 PM IST |
| "Invalid symbol" | Verify symbol format matches the broker's convention |
