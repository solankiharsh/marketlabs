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

### If you get 502 on the backend ("Application failed to respond") or TCP abort / HTTP 000

- **Use Gunicorn:** The repo **Dockerfile** now runs `gunicorn -c gunicorn_config.py run:app` so the app binds to `0.0.0.0:$PORT`. If you override the start command, use the same. Do **not** run only `python run.py` in production on Railway.
- **Backend must listen on Railway's PORT:** Railway injects `PORT` (e.g. 5000). The app must bind to that port. In **Settings → Networking**, the **Port** shown for the backend (e.g. 5000) is where the proxy sends traffic; the app reads `PORT` and listens there. Do not set `PORT` in Variables (let Railway set it).
- **If health returns 502 or curl gives 000 / TCP abort:** (1) The repo uses **`server/railway.toml`** to force **DOCKERFILE** builder so the Dockerfile CMD (gunicorn) is used and the app binds to `PORT`. Do not change the builder to Nixpacks unless you set the same start command and port behavior. (2) DB init and other startup hooks run in background threads so the app can respond to `/api/health` before Postgres is ready. (3) Set **`WEB_CONCURRENCY=1`** in the backend service Variables so only one worker starts (faster boot, fewer timeouts). (4) Check **Deploy Logs** for tracebacks. **Root Directory** must be `server`.

### Healthcheck fails with "service unavailable" or "replicas never became healthy"

The backend must respond to `GET /api/health` within the healthcheck window (e.g. 2 minutes). If startup blocks on the database or too many workers, the check fails.

- **Set `WEB_CONCURRENCY=1`** in the backend **Variables**. This starts a single Gunicorn worker so the app binds and responds quickly.
- **Optional:** Set **`DISABLE_RESTORE_RUNNING_STRATEGIES=true`** to skip restoring strategies on startup (fewer DB calls, faster boot).
- The app defers DB init and startup hooks to background threads so `/api/health` can return before Postgres is ready. If you still see failures, check **Deploy Logs** for Python tracebacks or connection timeouts.

### Frontend shows 8080 in Deploy Logs but Settings shows Port 3000

**What’s going on:** Deploy Logs show the port the app actually listens on (e.g. `Local: http://localhost:8080`). That comes from the `PORT` env var Railway injects (often 8080 for Node/Next.js). **Settings → Networking → Port** is the port Railway’s proxy forwards to. Those two must match or the proxy hits the wrong port and you get 502 or no response.

**Fix (pick one):**

1. **Use port 3000:** In the **frontend** service **Variables**, set `PORT=3000`. Redeploy. Next.js will listen on 3000; keep **Networking → Port** as 3000.
2. **Use port 8080:** Leave Variables as-is (no `PORT`), and in **Settings → Networking** set the port to **8080** so it matches what the app uses (what you see in Deploy Logs).

### If you get 502 Bad Gateway on the web (build succeeds, app shows "Ready")

- **Check target port:** In the **web** service go to **Settings → Networking → Public Networking**. Ensure the **port** your domain forwards to matches the port the app listens on (see Deploy Logs: “Local: http://localhost:XXXX”). If you set a custom port in Variables (e.g. `PORT=3000`), Networking port must be the same; otherwise use the port Railway assigns (e.g. 8080).
- **Bind to all interfaces:** The web app’s `npm start` runs `next start -H 0.0.0.0` so it listens on `0.0.0.0` (required for Railway’s proxy to reach it). If you use a custom start command, keep `-H 0.0.0.0`.
- **Build-time env for Next.js:** Set `NEXT_PUBLIC_API_URL` in the service **Variables** (so it’s present at build). Redeploy after changing it.

### Can't log in / `qd_users` table is empty

If the database has tables but **no users** (e.g. you see "This table is empty" for `qd_users` in Railway Postgres → Data), the app has no account to log in with.

**Option A — Redeploy so the server creates an admin (recommended)**  
1. In the **backend** service **Variables**, set **ADMIN_USER** and **ADMIN_PASSWORD** (and optionally **ADMIN_EMAIL**).  
2. **Redeploy** the backend. On startup the app runs `ensure_admin_exists()` and, if `qd_users` is empty, creates one admin with those credentials.  
3. Log in with **ADMIN_USER** / **ADMIN_PASSWORD**.

**Option B — Seed an admin from your machine**  
If the server already started before `DATABASE_URL` was set (so it never created an admin), you can seed one manually:

1. From the **Postgres** service in Railway, copy the **public** connection URL (Variables → `DATABASE_PUBLIC_URL` or the URL that contains `proxy.rlwy.net`). Do **not** use the internal URL (`postgres.railway.internal`) from your laptop.  
2. From the `server` directory on your machine:
   ```bash
   export DATABASE_URL='postgresql://...'   # paste the public URL
   export ADMIN_USER=admin
   export ADMIN_PASSWORD=your_secure_password
   ./venv/bin/python migrations/seed_admin.py
   ```
3. Log in with **ADMIN_USER** / **ADMIN_PASSWORD**.

### No HTTP Logs / only Deploy Logs / debugging 500s

- **After setting custom ports** (e.g. backend 5000, frontend 3000), if you see **500** on login or `/api/auth/security-config` in the frontend HTTP logs, the backend is returning the error. Check **backend** (zestful-laughter) → **Deploy Logs** at the time of the request for the Python traceback.
- **HTTP Logs** on Railway are filled from their edge when requests hit the service’s **public URL**. If traffic goes through your **frontend** (browser → web app → proxy to backend), the backend service may show **“No logs in this time range”** under HTTP Logs even though requests and 500s are reaching it. That’s expected in a frontend-proxy setup.
- **Deploy Logs** = your app’s stdout/stderr (gunicorn + Flask). All requests and errors show up here. **Use Deploy Logs to debug 500s.**
- **What to do:** Reproduce the 500 (e.g. try login), then open the **backend** service → **Deploy Logs**, and look at the **time when you clicked Login**. You should see:
  - A line like `POST /api/auth/login 500` (gunicorn access log when `accesslog = "-"`),
  - And a **traceback** right after it (e.g. `Login error (check Deploy Logs for traceback): ...`). That traceback is the real cause (e.g. DB error, missing env, missing table).
- If you don’t see any line when you submit the form, the request may not be reaching this backend (check frontend proxy URL and CORS).

---

### "Failed to proxy ... ECONNRESET" / "socket hang up"

This means the **backend** closed the connection or didn't respond in time. The frontend proxy is fine; the backend at `NEXT_PUBLIC_API_URL` is the problem.

**How to see the cause:**

1. **Test the backend directly** (bypass the frontend):
   ```bash
   BACKEND="https://zestful-laughter-production.up.railway.app"  # or your backend URL
   curl -s -o /dev/null -w "%{http_code}\n" -m 25 "$BACKEND/api/health"
   curl -s -w "\nHTTP_CODE:%{http_code}\n" -m 25 -X POST "$BACKEND/api/auth/login" \
     -H "Content-Type: application/json" -d '{"username":"admin","password":"test"}'
   ```
   - **Time out / fail:** Backend down or very slow (cold start, DB). Check Railway → backend **Active**, **Deploy Logs** at startup.
   - **Health 200, login times out:** Login or DB slow/failing → check **Deploy Logs** when you run curl.
   - **Login returns 500:** See "No HTTP Logs / debugging 500s" above; check Deploy Logs for traceback.

2. **Check backend Deploy Logs** (backend service → Deploy → View Logs) at the time you click Login or run curl:
   - Look for `POST /api/auth/login`, tracebacks, `ERROR`, or `timeout` / `connection ... failed`.
   - If **no log line** when you hit login: request not reaching backend (wrong URL, backend sleeping/crashed).

3. **Typical fixes:** Cold start → health-check or keep-warm; same region for DB and backend. Crash → fix error in Deploy Logs. Not listening → use gunicorn and bind to `0.0.0.0:$PORT`.

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

If the frontend domain is different from the backend (e.g. `app.railway.app` vs `api.railway.app`), the backend must allow the frontend origin or you get **502 / CORS errors**.

- In the **backend** service **Variables**, set **CORS_ORIGINS** to your frontend URL(s), comma-separated if multiple, e.g.:
  - `https://marketlabs-production.up.railway.app`
  - Or for dev: `*` (allows any origin; avoid in production).
- The app uses this list when initializing CORS; missing frontend URL is a common cause of 502 when the browser blocks the response.

---

## 6. Railway variables checklist

Set these in each service’s **Variables** so the app and proxy match. Replace placeholder URLs with your real Railway service URLs.

| Service (example name) | Variable | Value |
|------------------------|----------|--------|
| **Backend** (e.g. zestful-laughter) | `PORT` | `5000` (or leave unset and set **Networking → Port** to whatever Railway injects) |
| **Backend** | `CORS_ORIGINS` | `https://marketlabs-production.up.railway.app` (your frontend URL) or `*` for dev |
| **Backend** | `JWT_SECRET` or `SECRET_KEY` | 32+ character random string |
| **Backend** | `DATABASE_URL` | From Railway Postgres or your DB. Optional: add `?connection_limit=5` to the URL if your provider limits connections. |
| **Backend** | `DB_POOL_MAX_CONNECTIONS` | Optional. Default `10`. Limits psycopg2 pool size to avoid exhaustion (e.g. on Railway). |
| **Backend** | `WEB_CONCURRENCY` | Optional. Gunicorn worker count. Set to `1` or `2` on Railway so the app binds quickly and healthchecks pass (default caps at 4). |
| **Backend** | `DISABLE_RESTORE_RUNNING_STRATEGIES` | Optional. Set to `true` to skip restoring strategies on startup (faster boot, fewer DB calls). |
| **Frontend** (e.g. marketlabs) | `NEXT_PUBLIC_API_URL` | Backend public URL, e.g. `https://zestful-laughter-production.up.railway.app` (no trailing slash) |

**Critical:** If `NEXT_PUBLIC_API_URL` is not set on the frontend service, the app may call `http://localhost:5000` from the server or browser and fail in production. Set it in the **Frontend** service Variables and redeploy so it’s baked into the build.

---

## 7. Summary

| Service   | Root Directory      | Build (optional)           | Start (optional)                    | Key variables                          |
|----------|---------------------|----------------------------|-------------------------------------|----------------------------------------|
| Backend  | `server`| (Dockerfile or pip install)| (Dockerfile CMD or gunicorn/python) | `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, optional `PORT=5000`, `DB_POOL_MAX_CONNECTIONS` |
| Frontend | `web`               | `npm ci && npm run build`  | `npm start`                         | **`NEXT_PUBLIC_API_URL`** = backend URL (required on Railway) |

After both services are deployed and `NEXT_PUBLIC_API_URL` points to the backend, the web UI will call the API correctly. Open the frontend URL and log in or register as usual.
