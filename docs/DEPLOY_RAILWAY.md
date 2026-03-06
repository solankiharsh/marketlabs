# Railway Deployment Guide

## Architecture

Single Railway project with 3 services:

| Service | Type | What it does |
|---------|------|-------------|
| **zestful-laughter** | Backend (Python/Flask) | API server + serves pre-built frontend |
| **marketlabs** | Frontend (Vue) | **No longer needed** — frontend is now served by Flask from `server/dist/` |
| **Postgres** | Database | PostgreSQL 16 |

## How It Works

1. Frontend is pre-built locally with `make build-web`
2. Built files go to `server/dist/` and are committed to git
3. On Railway, the backend Dockerfile copies everything including `dist/`
4. Flask serves `dist/` for all non-API routes (SPA with client-side routing)
5. `init.sql` runs automatically on every startup (all `CREATE TABLE IF NOT EXISTS`)

## Deploy Workflow

### First-time setup

```bash
# 1. Set Railway env vars for the backend service (zestful-laughter):
DATABASE_URL=postgresql://postgres:<password>@postgres.railway.internal:5432/railway
DB_TYPE=postgresql
PORT=5000
WEB_CONCURRENCY=1
ADMIN_USER=marketlabs
ADMIN_PASSWORD=<your-password>
SECRET_KEY=<random-string>
# ... other env vars (LLM keys, etc.)
```

### Every deploy

```bash
# 1. Make your code changes (backend or frontend)

# 2. If frontend changed, rebuild:
make build-web

# 3. Commit and push
git add -A
git commit -m "your message"
git push origin <branch>

# 4. Railway auto-deploys from the push (if connected to the repo)
#    Or merge PR to main for production deploy
```

### Quick deploy command

```bash
# One-liner: build frontend + commit + push
make build-web && git add server/dist/ && git commit -m "chore: rebuild frontend" && git push
```

## Git Configuration

**IMPORTANT**: This repo must always push from the personal GitHub account.

The remote is configured as:
```
origin  git@github.com-personal:solankiharsh/marketlabs.git
```

This uses the `github.com-personal` SSH alias. To ensure this works, your `~/.ssh/config` should have:

```
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal  # or your personal key
```

Set repo-local git identity (so commits don't use work email):
```bash
cd /Users/harshsolanki/Developer/marketlabs
git config user.name "Harsh Solanki"
git config user.email "hvsolanki27@gmail.com"
```

**Never** use `git remote set-url` to point to work GitHub.

## Troubleshooting

### Healthcheck fails (service unavailable)

**Symptoms**: Build succeeds but healthcheck at `/api/health` fails for 2 minutes.

**Common causes**:
1. **Gunicorn logging to files** — must log to stdout (`"-"`). Fixed in `gunicorn_config.py`.
2. **Too many workers** — each worker runs `create_app()` which starts background threads. Keep `WEB_CONCURRENCY=1`.
3. **Wrong PORT** — gunicorn must bind to `$PORT` (Railway-injected). Check `gunicorn_config.py` uses `os.environ.get("PORT")`.

### Missing tables (relation does not exist)

**Symptoms**: `relation "ml_users" does not exist` or similar.

**Fix**: The app now auto-runs `migrations/init.sql` on every startup. All statements use `CREATE TABLE IF NOT EXISTS`. If you need to add new tables, add them to `init.sql`.

### Frontend not loading

**Symptoms**: API works at `/api/health` but `/` returns 404 or no content.

**Fix**: Rebuild and commit the frontend:
```bash
make build-web
git add server/dist/
git commit -m "chore: rebuild frontend"
git push
```

### Can't connect to Railway Postgres externally

Railway's TCP proxy may block external connections. Use the Railway dashboard's "Data" tab to run SQL, or add migrations to `init.sql` (they run automatically on deploy).

## Service Configuration

### Backend (zestful-laughter)

- **Root directory**: `server`
- **Builder**: Dockerfile
- **Healthcheck**: `/api/health` (2 min timeout)
- **railway.toml**: Already configured in `server/railway.toml`

### Postgres

- **Plugin**: Railway Postgres
- **Internal URL**: `postgres.railway.internal:5432`
- **External proxy**: `yamabiko.proxy.rlwy.net:53802` (may be restricted)

## Files That Matter

| File | Purpose |
|------|---------|
| `server/Dockerfile` | Production Docker image (Python + pip + app code) |
| `server/gunicorn_config.py` | Gunicorn workers, logging, PORT binding |
| `server/railway.toml` | Railway build/deploy config |
| `server/Procfile` | Process command (`gunicorn`) |
| `server/migrations/init.sql` | Database schema (runs on every startup) |
| `server/dist/` | Pre-built frontend (committed to git) |
| `server/app/__init__.py` | App factory — runs migrations, serves frontend |
