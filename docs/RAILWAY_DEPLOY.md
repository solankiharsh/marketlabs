# Deploying Zing to Railway

This guide covers deploying the Zing monorepo (Python backend + Next.js web) to Railway as **two services**.

---

## ⚠️ "Railpack could not determine how to build" / "Script start.sh not found"

**You are deploying from the repo root.** This repo is a **monorepo** (it has both `server/` and `web/`). Railway/Railpack cannot build from the root because it doesn’t know which app to run.

**Fix:** Use **two separate Railway services** and set **Root Directory** for each:

| Service   | Root Directory |
|-----------|----------------|
| Backend   | `server`       |
| Frontend  | `web`          |

**Steps:**

1. In your Railway project, **do not** use a single service that builds from the repo root.
2. **Backend:** Add a service (or reconfigure the existing one) → **Settings** → **Root Directory** → set to **`server`** (no trailing slash). Redeploy.
3. **Frontend:** Add a **second** service → connect the **same** GitHub repo → **Settings** → **Root Directory** → set to **`web`**. Add variable `NEXT_PUBLIC_API_URL` = your backend URL. Deploy.

After that, Railpack will detect Python in `server/` and Node in `web/` and build each service correctly.

---

## Prerequisites

- [Railway](https://railway.app) account
- GitHub repo connected to Railway (push this repo)
- PostgreSQL: use [Railway PostgreSQL](https://docs.railway.app/databases/postgresql) or an external Postgres URL

---

## 1. Create a new Railway project

1. Go to [railway.app](https://railway.app) → **New Project**.
2. Choose **Deploy from GitHub repo** and select your Zing repository.

---

## 2. Backend service (Python/Flask)

### Add the backend service

1. In the project, click **+ New** → **GitHub Repo** (or **Empty Service** then connect repo).
2. If you added one service from the repo, add a second: **+ New** → **Empty Service** (we’ll configure it below).

### Configure the backend service

1. Select the **backend** service.
2. Open **Settings**:
   - **Root Directory:** `server`
   - **Build Command:** (leave empty to use Dockerfile, or use Nixpacks)  
     If not using Dockerfile: `pip install -r requirements.txt`
   - **Start Command:**  
     - With **Dockerfile:** leave empty (Dockerfile CMD is used).  
     - With **Nixpacks:** `gunicorn -c gunicorn_config.py run:app` or `python run.py`
3. **Variables:** Add the same env vars you use locally. At minimum: `DATABASE_URL`, `SECRET_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`. See **Environment variables reference** below for the full list. Optional: `OPENROUTER_API_KEY`, etc.
4. **Deploy:** Trigger a deploy. Backend will be available at `https://<backend-service>.up.railway.app` (or the custom domain you set).
5. Copy the **public URL** of the backend (e.g. `https://zing-backend.up.railway.app`) for the frontend.

---

## 3. Frontend service (Next.js)

### Add the frontend service

1. **+ New** → **Empty Service** (or add from same repo again).
2. Select this new service.

### Configure the frontend service

1. **Settings:**
   - **Root Directory:** `web`
   - **Build Command:** `npm ci && npm run build` (or leave empty for Nixpacks to detect Next.js).
   - **Start Command:** `npm start` (or leave empty for Nixpacks).
   - **Docker (optional):** To use the included Dockerfile, set **Dockerfile Path** to `web/Dockerfile` and **Root Directory** to `web`. The build arg `NEXT_PUBLIC_API_URL` is taken from Variables.
2. **Variables:**
   - `NEXT_PUBLIC_API_URL` = **Backend public URL** from step 2 (e.g. `https://zing-backend.up.railway.app`).  
     No trailing slash.
3. **Deploy:** Deploy the service. Frontend will be at `https://<frontend-service>.up.railway.app`.

### If you get 502 Bad Gateway (build succeeds, app shows "Ready")

- **Check target port:** In the **web** service go to **Settings → Networking → Public Networking**. Ensure the **port** your domain forwards to matches the port the app listens on. Railway usually sets `PORT` (e.g. 8080); the app uses it. If "Port" or "Target port" is wrong (e.g. 3000 while the app listens on 8080), change it to match `PORT` or **Generate Domain** again so it picks the right port.
- **Bind to all interfaces:** The web app’s `npm start` runs `next start -H 0.0.0.0` so it listens on `0.0.0.0` (required for Railway’s proxy to reach it). If you use a custom start command, keep `-H 0.0.0.0`.
- **Build-time env for Next.js:** Set `NEXT_PUBLIC_API_URL` in the service **Variables** (so it’s present at build). Redeploy after changing it.

---

## Environment variables reference

### Web (frontend) service

| Variable | Required | Description |
|----------|----------|-------------|
| **NEXT_PUBLIC_API_URL** | **Yes** | Backend public URL, e.g. `https://your-backend.up.railway.app`. No trailing slash. Set in Railway Variables so the build bakes it in. |

That’s the only variable the web app needs for Railway. Optional overrides can go in `web/.env.local` for local dev only.

---

### Server (backend) service

**Required (minimal deploy):**

| Variable | Description |
|----------|-------------|
| **DATABASE_URL** | PostgreSQL URL, e.g. `postgresql://user:password@host:5432/zing`. From Railway Postgres or your own DB. |
| **SECRET_KEY** | Long random string for JWT signing (e.g. `openssl rand -hex 32`). Keep secret. |
| **ADMIN_USER** | Login username (e.g. `zing` or your choice). |
| **ADMIN_PASSWORD** | Login password. Use a strong value in production. |

**Recommended for production:**

| Variable | Description |
|----------|-------------|
| **CORS_ORIGINS** | Allowed origins, e.g. `https://your-web.up.railway.app` or `*` for dev. |
| **FRONTEND_URL** | Frontend URL for OAuth redirects (e.g. your Railway web URL). |

**Optional — AI / LLM (for analysis, Polymarket, etc.):**

| Variable | Description |
|----------|-------------|
| **LLM_PROVIDER** | `openrouter`, `openai`, `google`, `deepseek`, or `grok`. |
| **OPENROUTER_API_KEY** | From [OpenRouter](https://openrouter.ai/keys). |
| **OPENROUTER_MODEL** | e.g. `openai/gpt-4o`. |
| **OPENAI_API_KEY** | From [OpenAI](https://platform.openai.com/api-keys). |
| **GOOGLE_API_KEY** / **DEEPSEEK_API_KEY** / **GROK_API_KEY** | If using those providers. |

**Optional — feature flags:**

| Variable | Default | Description |
|----------|---------|-------------|
| **ENABLE_REGISTRATION** | `true` | Allow new user sign-up. |
| **IS_DEMO_MODE** | `false` | Read-only demo (blocks write APIs). |
| **ENABLE_PENDING_ORDER_WORKER** | `true` | Pending order worker. |
| **ENABLE_PORTFOLIO_MONITOR** | `true` | Portfolio monitor. |

**Optional — auth & security:**

| Variable | Description |
|----------|-------------|
| **TURNSTILE_SITE_KEY** / **TURNSTILE_SECRET_KEY** | [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) for captcha. |
| **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** | Google OAuth. |
| **GITHUB_CLIENT_ID** / **GITHUB_CLIENT_SECRET** | GitHub OAuth. |

**Optional — data & notifications:**

| Variable | Description |
|----------|-------------|
| **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASSWORD**, **SMTP_FROM** | Email (notifications). |
| **TWILIO_ACCOUNT_SID**, **TWILIO_AUTH_TOKEN**, **TWILIO_FROM_NUMBER** | SMS (Twilio). |
| **FINNHUB_API_KEY**, **TIINGO_API_KEY** | Market data (if needed). |

Full list with defaults: copy `server/env.example` to `server/.env` and see `server/ENV_KEYS.md`.

---

## 4. PostgreSQL (recommended)

1. In the same project: **+ New** → **Database** → **PostgreSQL**.
2. After it’s created, open the Postgres service → **Variables** (or **Connect**) and copy the `DATABASE_URL` (or `POSTGRES_URL`).
3. In the **Backend** service **Variables**, set `DATABASE_URL` = that Postgres URL.

Run migrations if needed (e.g. run `server` migrations against this DB once; see backend README).

---

## 5. CORS (if needed)

If the frontend domain is different from the backend (e.g. `app.railway.app` vs `api.railway.app`), ensure the backend allows the frontend origin:

- In Flask, set `CORS_ORIGINS` or equivalent to your frontend URL (e.g. `https://zing-web.up.railway.app`).
- Check `server` for CORS configuration and add your Railway frontend URL.

---

## 6. Summary

| Service   | Root Directory      | Build (optional)           | Start (optional)                    | Key variables                          |
|----------|---------------------|----------------------------|-------------------------------------|----------------------------------------|
| Backend  | `server`| (Dockerfile or pip install)| (Dockerfile CMD or gunicorn/python) | `DATABASE_URL`, `DB_TYPE`, secrets     |
| Frontend | `web`               | `npm ci && npm run build`  | `npm start`                         | `NEXT_PUBLIC_API_URL` = backend URL    |

After both services are deployed and `NEXT_PUBLIC_API_URL` points to the backend, the web UI will call the API correctly. Open the frontend URL and log in or register as usual.
