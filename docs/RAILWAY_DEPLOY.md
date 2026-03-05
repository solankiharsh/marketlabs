# Deploying Zing to Railway

This guide covers deploying the Zing monorepo (Python backend + Next.js web) to Railway as **two services**.

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
3. **Variables:** Add the same env vars you use locally. At minimum:
   - `DATABASE_URL` — Postgres connection string (e.g. from Railway Postgres or external).
   - `DB_TYPE=postgresql`
   - `SECRET_KEY` or `JWT_SECRET` (and any other secrets from `server/env.example`).
   - Optional: `OPENROUTER_API_KEY`, `ADMIN_PASSWORD`, etc.
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

---

## 4. PostgreSQL (recommended)

1. In the same project: **+ New** → **Database** → **PostgreSQL**.
2. After it’s created, open the Postgres service → **Variables** (or **Connect**) and copy the `DATABASE_URL` (or `POSTGRES_URL`).
3. In the **Backend** service **Variables**, set:
   - `DATABASE_URL` = that Postgres URL
   - `DB_TYPE=postgresql`

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
