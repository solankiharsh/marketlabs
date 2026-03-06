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

def main():
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url or "postgresql" not in url and "postgres" not in url:
        print("DATABASE_URL not set or not PostgreSQL. Skipping migrations.")
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

    conn = psycopg2.connect(url)
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
