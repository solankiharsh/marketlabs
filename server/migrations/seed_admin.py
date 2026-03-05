#!/usr/bin/env python3
"""
Seed an initial admin user when qd_users is empty.
Use this after running init.sql if the app did not create an admin on startup
(e.g. DATABASE_URL was not set when the server first started).

Usage (from server directory):
  export DATABASE_URL='postgresql://...'   # Use Railway PUBLIC URL from Postgres → Variables
  export ADMIN_USER=admin
  export ADMIN_PASSWORD=your_secure_password
  ./venv/bin/python migrations/seed_admin.py

Or with Railway internal URL from a Railway shell:
  DATABASE_URL is usually set; set ADMIN_USER and ADMIN_PASSWORD, then run the script.
"""
import os
import sys
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
        sys.exit(1)

    admin_user = os.environ.get("ADMIN_USER", "admin").strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "").strip()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").strip()

    if not admin_password:
        print("Error: ADMIN_PASSWORD is not set. Set it to the desired admin password.", file=sys.stderr)
        sys.exit(1)

    try:
        import bcrypt
    except ImportError:
        print("Error: bcrypt not installed. Run: pip install bcrypt", file=sys.stderr)
        sys.exit(1)
    try:
        import psycopg2
    except ImportError:
        print("Error: psycopg2 not installed. Run: pip install psycopg2-binary", file=sys.stderr)
        sys.exit(1)

    # SSL for Railway public URL
    use_ssl = "proxy.rlwy.net" in db_url or "railway.app" in db_url
    if use_ssl and "sslmode=" not in db_url:
        db_url = db_url + ("?" if "?" not in db_url else "&") + "sslmode=require"
    kwargs = parse_db_url(db_url)
    if kwargs and use_ssl and kwargs.get("sslmode") != "verify-full":
        kwargs["sslmode"] = "require"

    try:
        conn = psycopg2.connect(**kwargs) if kwargs else psycopg2.connect(db_url, connect_timeout=30)
    except Exception as e:
        print(f"Connection failed: {e}", file=sys.stderr)
        sys.exit(1)

    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) AS count FROM qd_users")
        row = cur.fetchone()
        count = row[0] if row else 0
        if count > 0:
            print("At least one user already exists. No seed needed.")
            conn.close()
            return

        password_hash = bcrypt.hashpw(
            admin_password.encode("utf-8"),
            bcrypt.gensalt(rounds=12),
        ).decode("utf-8")

        cur.execute(
            """
            INSERT INTO qd_users
            (username, password_hash, email, nickname, role, status, email_verified, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (admin_user, password_hash, admin_email or None, "Administrator", "admin", "active", True),
        )
        conn.commit()
        print(f"Created admin user: {admin_user} ({admin_email}). You can log in with these credentials.")
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
