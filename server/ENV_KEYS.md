# Where to Get Environment Variable Values

Use this with `.env.example`: copy to `.env` and set values. Keys needed to fix **401 after login** and run the app are listed first.

---

## Required for login and to fix 401s

| Variable | Where to get it |
|----------|-----------------|
| **SECRET_KEY** | **You choose it.** Any long random string (e.g. `openssl rand -hex 32`). Used to sign JWTs. Must be the same across restarts; change in production. |
| **ADMIN_USER** | **You choose it.** Username for legacy admin login (e.g. `zing`). |
| **ADMIN_PASSWORD** | **You choose it.** Password for legacy admin login. Must match what you enter on the login page. |
| **ADMIN_EMAIL** | **You choose it.** Email for the admin account (optional; used for reset/notifications). |
| **DATABASE_URL** | **From your PostgreSQL setup.** Format: `postgresql://USER:PASSWORD@HOST:5432/zing`. Local: create role and DB (e.g. `create role zing with login password 'yourpassword'; create database zing owner zing;`) then set `postgresql://zing:yourpassword@127.0.0.1:5432/zing`. Docker: use the URL from your compose or host (e.g. `postgresql://zing:zing123@127.0.0.1:5432/zing`). If DB is missing or has no user row, legacy login (ADMIN_USER/ADMIN_PASSWORD) still works after the auth fix. |

---

## Optional: AI / LLM (for analysis, Polymarket, etc.)

| Variable | Where to get it |
|----------|-----------------|
| **OPENROUTER_API_KEY** | [OpenRouter](https://openrouter.ai/keys) — sign up and create an API key. |
| **OPENROUTER_MODEL** | [OpenRouter models](https://openrouter.ai/models) — e.g. `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`. |
| **OPENAI_API_KEY** | [OpenAI API keys](https://platform.openai.com/api-keys). |
| **OPENAI_MODEL** | Model name, e.g. `gpt-4o`, `gpt-4o-mini`. |

---

## Optional: Database / runtimes

| Variable | Where to get it |
|----------|-----------------|
| **LOG_LEVEL** | You choose: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| **PYTHON_API_PORT** | Port the backend listens on (default `5000`). |
| **CORS_ORIGINS** | Allowed origins for CORS; `*` for dev, or comma-separated URLs in production (e.g. your Railway frontend URL). |
| **DB_POOL_MAX_CONNECTIONS** | Max connections in the PostgreSQL pool (default `10`). Lower on Railway to avoid connection exhaustion. |

---

## Optional: Notifications and security

| Variable | Where to get it |
|----------|-----------------|
| **SMTP_*** | Your email provider (Gmail, SendGrid, etc.): host, port, user, password, from address. |
| **TWILIO_*** | [Twilio](https://www.twilio.com/) — Account SID, Auth Token, From number for SMS. |
| **TURNSTILE_SITE_KEY** / **TURNSTILE_SECRET_KEY** | [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) — for captcha. |
| **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** | [Google Cloud Console](https://console.cloud.google.com/) — OAuth 2.0 credentials. |
| **GITHUB_CLIENT_ID** / **GITHUB_CLIENT_SECRET** | [GitHub OAuth Apps](https://github.com/settings/developers). |

---

## Optional: Market data (Forex / metals)

| Variable | Where to get it |
|----------|-----------------|
| **TIINGO_API_KEY** | [Tiingo](https://www.tiingo.com/account/api/token) — free tier supports major forex pairs and some metals. Used for Forex (e.g. EURUSD, XAUUSD, XAGUSD) price and K-line data. If not set, the app falls back to **yfinance** for Forex so symbols like XAGUSD can still work locally. |

---

## Optional: Feature flags and workers

| Variable | Where to get it |
|----------|-----------------|
| **IS_DEMO_MODE** | Set `true` for read-only demo; `false` for normal use. |
| **ENABLE_REGISTRATION** | `true` or `false` — allow new user sign-up. |
| **ENABLE_PENDING_ORDER_WORKER** | `true` or `false` — enable pending order worker. |
| **ENABLE_PORTFOLIO_MONITOR** | `true` or `false` — enable portfolio monitor. |
