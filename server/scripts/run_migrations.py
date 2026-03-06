#!/usr/bin/env python3
"""
Run PostgreSQL migrations (init.sql).
Use after a fresh Postgres install or Railway Postgres reset so schema exists.

  Local:  make migrate   # or: cd server && python scripts/run_migrations.py
  Railway: Set build command to nothing, then one-off:
    railway run python scripts/run_migrations.py
  Or in Railway dashboard: Postgres → Reset (deletes all data), redeploy app,
  then run this script once via CLI or a deploy hook.
"""
import os
import sys

# Project root = server/
_script_dir = os.path.dirname(os.path.abspath(__file__))
_server_dir = os.path.dirname(_script_dir)
sys.path.insert(0, _server_dir)

# Load .env so DATABASE_URL is set
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_server_dir, ".env"), override=False)
except Exception:
    pass


def _is_railway_public_url(url: str) -> bool:
    """True if this is Railway's public Postgres URL (requires SSL)."""
    if "railway.internal" in url:
        return False
    return "rlwy.net" in url or ".railway" in url.lower()


def main():
    # Prefer public URL when running from your machine; private URL (postgres.railway.internal) only works inside Railway
    url = (
        os.environ.get("DATABASE_PUBLIC_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not url or ("postgresql" not in url and "postgres" not in url):
        print("DATABASE_URL (or DATABASE_PUBLIC_URL) not set or not PostgreSQL. Skipping migrations.")
        return 0

    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not installed. Install with: pip install psycopg2-binary")
        return 1

    init_sql = os.path.join(_server_dir, "migrations", "init.sql")
    if not os.path.isfile(init_sql):
        print(f"Migration file not found: {init_sql}")
        return 1

    print(f"Running migrations from {init_sql} ...")
    with open(init_sql, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Railway public Postgres requires SSL; pass as kwarg so libpq uses TLS (URL append can break if password has ? or &)
    connect_kwargs = {}
    if _is_railway_public_url(url):
        connect_kwargs["sslmode"] = "require"
    try:
        conn = psycopg2.connect(url, **connect_kwargs)
    except Exception as e:
        err_str = str(e).lower()
        if "railway.internal" in str(url) or "could not translate host" in err_str:
            print(
                "Cannot reach postgres.railway.internal from your machine (it only resolves inside Railway).\n"
                "Option A: In Railway dashboard → Postgres → Connect, copy the PUBLIC URL and set DATABASE_PUBLIC_URL in server/.env, then run this script again.\n"
                "Option B: Run migrations on Railway (e.g. add a one-off deploy that runs this script, or use Railway's shell and run it there)."
            )
        elif _is_railway_public_url(str(url)) and ("server closed" in err_str or "unexpectedly" in err_str):
            print(
                "Connection to Railway public Postgres was rejected. Run migrations from inside Railway instead:\n"
                "  Railway dashboard → backend service → deploy a one-off that runs: python scripts/run_migrations.py\n"
                "  (uses private DATABASE_URL so no public SSL is needed)."
            )
        raise
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Run each statement (psycopg2 executes one at a time)
            for stmt in (s.strip() for s in content.split(";") if s.strip()):
                if stmt.startswith("--"):
                    continue
                try:
                    cur.execute(stmt + ";")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        pass  # idempotent (CREATE TABLE IF NOT EXISTS etc.)
                    else:
                        raise
        print("Migrations completed successfully.")
    finally:
        conn.close()

    return 0

if __name__ == "__main__":
    sys.exit(main())
