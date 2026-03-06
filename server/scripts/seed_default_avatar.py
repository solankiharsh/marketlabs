"""
Set default avatar for all users that have null or empty avatar.

Ensures the profile/header avatar (web/public/avatar2.jpg) shows consistently
after profile data loads from the API.

Usage:
  From repo root: make seed-default-avatar
  Or: cd server && python scripts/seed_default_avatar.py
"""
from __future__ import annotations

import os
import sys

# Load .env so DATABASE_URL is set (same as run.py)
try:
    from dotenv import load_dotenv
    this_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(this_dir, ".env"), override=False)
    parent_dir = os.path.dirname(this_dir)
    load_dotenv(os.path.join(parent_dir, ".env"), override=False)
except Exception:
    pass

# Ensure server app is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_AVATAR = "/avatar2.jpg"


def main() -> None:
    from app.utils.db import get_db_connection

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE ml_users
            SET avatar = %s
            WHERE avatar IS NULL OR avatar = '' OR avatar = '/avatar2.png'
            """,
            (DEFAULT_AVATAR,),
        )
        updated = cur.rowcount
        db.commit()
        cur.close()
    print(f"Updated {updated} user(s) to avatar={DEFAULT_AVATAR!r}")


if __name__ == "__main__":
    main()
