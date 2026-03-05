#!/usr/bin/env python3
"""
Run PostgreSQL migrations from this directory.
Uses DATABASE_URL (must be set). From your laptop, use Railway's *public* URL.
Railway public Postgres requires SSL; we pass sslmode=require explicitly for public URLs.
"""
import os
import sys
import time
from urllib.parse import urlparse, unquote

def parse_db_url(url):
    """Parse postgresql:// URL into kwargs for psycopg2.connect()."""
    parsed = urlparse(url)
    if parsed.scheme not in ("postgresql", "postgres"):
        return None
    path = (parsed.path or "/").lstrip("/")
    dbname = path.split("/")[0] or "railway"
    kwargs = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": dbname,
        "user": unquote(parsed.username) if parsed.username else "postgres",
        "password": unquote(parsed.password) if parsed.password else "",
        "connect_timeout": 30,
    }
    if parsed.query:
        for part in parsed.query.split("&"):
            if "=" in part:
                k, v = part.split("=", 1)
                if k == "sslmode":
                    kwargs["sslmode"] = v
    return kwargs

def main():
    db_url = os.environ.get("DATABASE_URL", "").strip()
    if not db_url:
        print("Error: DATABASE_URL is not set.", file=sys.stderr)
        print("Example: export DATABASE_URL='postgresql://user:pass@host:5432/railway'", file=sys.stderr)
        print("From local: use Railway Postgres → Variables → DATABASE_PUBLIC_URL (not the .internal URL).", file=sys.stderr)
        sys.exit(1)

    if "railway.internal" in db_url:
        print("Warning: DATABASE_URL uses postgres.railway.internal (reachable only from inside Railway).", file=sys.stderr)
        print("From your laptop, use the PUBLIC URL from Railway Postgres → Variables.", file=sys.stderr)

    try:
        import psycopg2
    except ImportError:
        print("Error: psycopg2 not installed.", file=sys.stderr)
        print("From server dir: ./venv/bin/pip install psycopg2-binary  (or: pip install -r requirements.txt)", file=sys.stderr)
        sys.exit(1)

    migrations_dir = os.path.dirname(os.path.abspath(__file__))
    init_sql = os.path.join(migrations_dir, "init.sql")

    if not os.path.isfile(init_sql):
        print(f"Error: {init_sql} not found.", file=sys.stderr)
        sys.exit(1)

    # For Railway public URL, use explicit connection params so sslmode=require is applied
    use_ssl = "proxy.rlwy.net" in db_url or "railway.app" in db_url
    if use_ssl and "sslmode=" not in db_url:
        db_url = db_url + ("?" if "?" not in db_url else "&") + "sslmode=require"

    kwargs = parse_db_url(db_url)
    if kwargs is not None and use_ssl and kwargs.get("sslmode") != "verify-full":
        kwargs["sslmode"] = "require"

    # Retry connection (Railway proxy can drop first attempt)
    max_attempts = 3
    conn = None
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            if kwargs is not None:
                conn = psycopg2.connect(**kwargs)
            else:
                conn = psycopg2.connect(db_url, connect_timeout=30)
            break
        except Exception as e:
            last_error = e
            if attempt < max_attempts:
                wait = 2 * attempt
                print(f"Connection attempt {attempt} failed: {e}. Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print("Connection failed after", max_attempts, "attempts.", file=sys.stderr)
                print("", file=sys.stderr)
                if "proxy.rlwy.net" in db_url or "railway" in (os.environ.get("DATABASE_URL") or ""):
                    print("Railway Postgres from your laptop:", file=sys.stderr)
                    print("  - Use the PUBLIC URL: Railway dashboard → Postgres → Variables → DATABASE_PUBLIC_URL (or DATABASE_URL that contains proxy.rlwy.net).", file=sys.stderr)
                    print("  - Do NOT use the internal URL (postgres.railway.internal).", file=sys.stderr)
                    print("  - If on VPN/corporate network, try disabling VPN or allow outbound to the DB host/port.", file=sys.stderr)
                raise last_error from last_error

    print("Connecting and running init.sql...")
    conn.autocommit = True
    cur = conn.cursor()
    with open(init_sql, "r") as f:
        cur.execute(f.read())
    cur.close()
    conn.close()
    print("Done: init.sql")
    print("Optional: run rename_qd_to_zing.sql only for existing DBs with qd_* tables.")
    print("Migrations complete.")

if __name__ == "__main__":
    main()
