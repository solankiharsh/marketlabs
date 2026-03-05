# Server database migrations and seed

## Migrations

- **init.sql** — Creates all tables and seed data (e.g. `qd_market_symbols`). Run this once per database.
- **run_migrations.py** — Connects with `DATABASE_URL` and runs `init.sql`. Use Railway’s **public** Postgres URL when running from your laptop (SSL is applied automatically for Railway).

From the `server` directory:

```bash
export DATABASE_URL='postgresql://...'   # Railway: use PUBLIC URL from Postgres → Variables
./venv/bin/python migrations/run_migrations.py
```

## Seed initial admin (when `qd_users` is empty)

If the app did not create an admin on first startup (e.g. `DATABASE_URL` was missing), you can create one with **seed_admin.py**:

```bash
export DATABASE_URL='postgresql://...'
export ADMIN_USER=admin
export ADMIN_PASSWORD=your_secure_password
./venv/bin/python migrations/seed_admin.py
```

Then log in with `ADMIN_USER` / `ADMIN_PASSWORD`. See **docs/RAILWAY_DEPLOY.md** (“Can't log in / qd_users table is empty”) for Railway-specific steps.
