# MarketLabs — AI-Native Quantitative Trading Platform

AI-powered market analysis platform with custom indicator creation, automated trading strategies, and multi-market support spanning Crypto, US Stocks, Forex, and Indian Stocks. Features real-time portfolio monitoring, community indicator marketplace, and integration with 20+ exchanges and brokers.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python Flask, PostgreSQL, gunicorn + eventlet (WebSocket), Flask-SocketIO |
| **Frontend** | Vue.js 2, Ant Design Vue, ECharts |
| **Data Sources** | yfinance, ccxt (crypto), finnhub (US stocks), akshare (Asian markets) |
| **AI / LLM** | OpenRouter (multi-model gateway), OpenAI, Google Gemini, DeepSeek, xAI Grok |
| **Live Trading** | Binance, Bybit, OKX, Bitget, KuCoin, Gate, Coinbase, Kraken, IBKR (US stocks), MT5 (Forex), Zerodha, Angel One + 6 more Indian brokers |
| **Deployment** | Railway (Docker) |
| **Notifications** | Email (SMTP), Telegram bot, browser push |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 15+
- Homebrew (macOS)

### Setup

```bash
# 1. Copy environment config
make setup
# Edit server/.env with your API keys (see server/env.example for full list)

# 2. Create database
make postgres-create-db

# 3. Start backend + frontend
make dev
```

| Service | URL |
|---------|-----|
| Backend | http://localhost:5000 |
| Frontend | http://localhost:8000 |

**Default login**: `marketlabs` / `123456`

### Other Make Commands

```bash
make dev-backend     # Start backend only
make dev-web         # Start frontend only
make build-web       # Build Vue into server/dist/ for deployment
make postgres-start  # Start Homebrew PostgreSQL
make postgres-stop   # Stop Homebrew PostgreSQL
make postgres-status # Check PostgreSQL status
make migrate         # Run database migrations
```

## Features

### Dashboard

KPI summary showing total equity, active strategies, P&L, and win rate. Displays pending orders list.

**How to test**: Login → Dashboard is the home page. Create a strategy first to see data populate.

### AI Analysis (Global Market)

- Market heatmaps: Crypto, US Stocks, Forex, India
- Financial news feed with language selection
- Economic calendar
- Market sentiment (Fear & Greed Index, VIX)
- Trading opportunities scanner

**How to test**: Navigate to AI Analysis → click heatmap tabs (Crypto / US / Forex / India). Check News tab. Check Calendar tab.

### Fast AI Analysis (Per-Asset)

Select a market, symbol, AI model, and timeframe to generate a comprehensive analysis with buy/sell recommendation, confidence score, and risk assessment. Supports multiple LLM providers with real-time progress updates. Analysis memory learns from past analyses to improve future results.

**How to test**: Go to AI Analysis → select a symbol (e.g., BTC/USDT, Crypto market) → pick a model → click Analyze. Requires an LLM API key configured in Settings.

### Indicator Analysis

Write custom trading indicators in Python using a built-in sandbox with `pandas` and `numpy`. Backtest indicators against historical data and publish them to the community marketplace.

Convention: define `my_indicator_name`, `my_indicator_description`, and operate on the `df` DataFrame.

**How to test**: Go to Indicator Analysis → click "Create Indicator" → write Python code:

```python
my_indicator_name = "Golden Cross"
my_indicator_description = "SMA 50/200 crossover signal"

df['sma50'] = df['close'].rolling(50).mean()
df['sma200'] = df['close'].rolling(200).mean()
df['signal'] = (df['sma50'] > df['sma200']).astype(int)
```

Save → Run backtest on a symbol.

### Indicator Community / Marketplace

Browse, search, and purchase published indicators (free and paid). Filter by pricing, sort by newest/hot/rating. Rate and comment on indicators.

**How to test**: Go to Community page → browse available indicators → search by keyword.

### Trading Assistant (Strategy Creation)

Create automated trading strategies from indicators with support for paper trading (no real orders) or live trading.

**Supported markets and exchanges:**

| Market | Exchanges / Brokers |
|--------|-------------------|
| **Crypto** | Binance, Bybit, OKX, Bitget, KuCoin, Gate, Coinbase, Kraken, Bitfinex, DeepCoin |
| **US Stocks** | Interactive Brokers (IBKR via TWS / IB Gateway) |
| **Forex** | MetaTrader 5 (Windows only) |
| **Indian Stocks** | Zerodha, Angel One, Upstox, Fyers, Dhan, Kotak Neo, Shoonya, Flattrade |

Strategy lifecycle: create → start → monitor → stop. Order modes: market or maker (limit then market fallback). Test connection before going live. Export strategy history as CSV.

**How to test**:

1. Go to Trading Assistant → click "Create Strategy"
2. Select market (e.g., Crypto), symbol (e.g., BTC/USDT)
3. Choose an indicator from your library
4. Set parameters: timeframe, quantity, take-profit, stop-loss
5. For paper trading: leave exchange credentials empty
6. For live trading: add exchange credentials (API key + secret), test connection, then enable live mode
7. Click Save → Start strategy

### Portfolio

Track manual positions (existing holdings) across all markets with real-time P&L via live price feeds. Schedule AI monitoring on your positions for automated analysis alerts. Export portfolio as CSV.

**How to test**: Go to Portfolio → click "Add Position" → enter symbol (e.g., AAPL), market (USStock), quantity, entry price → Save.

### Settings (Admin Only)

Configure all system settings via UI: security/auth, LLM provider + API keys, data sources, email/SMTP, billing, and feature toggles. Changes write directly to the `.env` file.

**How to test**: Login as admin → go to Settings → configure LLM provider (e.g., set `OPENROUTER_API_KEY`) → Save.

### User Management (Admin Only)

List, search, create, edit, and delete users. Manage roles (admin / user) and view user activity.

**How to test**: Login as admin → go to User Management → view user list.

### Billing & Credits

Credit-based system for paid features (AI analysis, strategy runs, backtests). Membership plans: Monthly ($19.9), Yearly ($199), Lifetime ($499). USDT payment support (TRC20). Includes registration bonus and referral bonus credits. Per-feature costs are configurable via environment variables.

**How to test**: Set `BILLING_ENABLED=True` in `.env` → check Billing page for plans.

### Authentication

- Username/password login with bcrypt hashing
- User registration (toggle with `ENABLE_REGISTRATION`)
- OAuth: Google, GitHub
- Cloudflare Turnstile captcha
- IP + account rate limiting (anti-brute-force)
- JWT-based session tokens

### Real-time Features

- WebSocket price streaming (Flask-SocketIO)
- Live strategy monitoring
- Real-time portfolio value updates

### Notifications

- Email (SMTP)
- Telegram bot integration
- Portfolio AI monitoring alerts

## Environment Variables

See [`server/env.example`](server/env.example) for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Application secret for JWT signing |
| `LLM_PROVIDER` | AI provider: `openrouter`, `openai`, `google`, `deepseek`, `grok` |
| `OPENROUTER_API_KEY` | API key for OpenRouter (recommended multi-model gateway) |
| `BILLING_ENABLED` | Enable credit-based billing system |
| `IS_DEMO_MODE` | Read-only mode for public demos |
| `ENABLE_REGISTRATION` | Allow new user registration |

## Project Structure

```
marketlabs/
├── server/                  # Python Flask backend
│   ├── app/
│   │   ├── routes/          # API endpoints (19 blueprints)
│   │   ├── services/        # Business logic
│   │   │   ├── live_trading/ # Exchange clients (Binance, Bybit, etc.)
│   │   │   ├── ibkr_trading/ # Interactive Brokers integration
│   │   │   └── mt5_trading/  # MetaTrader 5 integration
│   │   ├── data_sources/    # Market data providers
│   │   └── utils/           # Auth, DB, logging, caching
│   ├── migrations/          # SQL schema (init.sql)
│   ├── dist/                # Pre-built Vue frontend (served by Flask)
│   └── run.py               # Dev server entry point
├── web/                     # Vue.js frontend (source, gitignored)
│   ├── src/views/           # Page components
│   ├── src/locales/         # i18n (10 languages)
│   └── src/config/          # Router, API config
├── Makefile                 # Dev commands
└── docs/                    # Documentation
```

## API Reference

| Prefix | Description |
|--------|-------------|
| `/api/auth/*` | Authentication (login, register, OAuth) |
| `/api/dashboard/*` | Dashboard metrics |
| `/api/fast-analysis/*` | AI analysis |
| `/api/indicator/*` | Indicators + backtesting |
| `/api/strategies/*` | Trading strategies |
| `/api/market/*` | Watchlist, symbols, pricing |
| `/api/portfolio/*` | Portfolio positions |
| `/api/global-market/*` | Heatmaps, news, calendar |
| `/api/community/*` | Indicator marketplace |
| `/api/credentials/*` | Exchange credential vault |
| `/api/settings/*` | System settings (admin) |
| `/api/users/*` | User management (admin) |
| `/api/billing/*` | Credits & membership |
| `/api/indian-broker/*` | Indian broker instruments & auth |

## Deployment

Railway auto-deploys from git push. To deploy:

```bash
make build-web    # Build Vue into server/dist/
git add server/dist/ && git commit -m "build: update frontend"
git push           # Railway auto-deploys
```

Docker: uses the Dockerfile in `server/`. See [`docs/DEPLOY_RAILWAY.md`](docs/DEPLOY_RAILWAY.md) for the full deployment guide.

## Supported Languages

English, Chinese (Simplified/Traditional), Korean, Japanese, Thai, Vietnamese, Arabic, German, French

## Demo Mode

Set `IS_DEMO_MODE=true` to enable read-only mode for public demos. Blocks all POST/PUT/DELETE requests except login. Blocks access to settings and credentials.

## License

Private and proprietary.
