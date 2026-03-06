# Database migrations

## Fresh database

Use `init.sql` when creating a **new** database (e.g. first-time setup or Docker Postgres init). It creates all `ml_*` tables.

## Existing database (qd_ → ml_ rename)

If you already have a database with the old `qd_*` table names, run the rename migration **once** to keep your data.

### Option A: Via Docker (no `psql` on host)

If Postgres runs in Docker/Colima, run the migration inside the container (from repo root):

```bash
make migrate-qd-to-ml
```

Defaults use container `zing-db`, user `zing`, db `zing`. Override if needed:

```bash
make migrate-qd-to-ml PG_CONTAINER=marketlabs-db PG_USER=marketlabs PG_DB=marketlabs
```

Or run manually:

```bash
cat server/migrations/rename_qd_to_ml.sql | docker exec -i <container> psql -U <user> -d <db>
```

### Option B: With `psql` on host

```bash
psql "$DATABASE_URL" -f server/migrations/rename_qd_to_ml.sql
# Or:
psql "postgresql://user:pass@127.0.0.1:5433/dbname" -f server/migrations/rename_qd_to_ml.sql
```

The script is **idempotent**: safe to run multiple times (after the first run, `qd_*` tables no longer exist, so it does nothing).

## Summary

| Situation | Action |
|----------|--------|
| New DB / no data to keep | Use `init.sql` only (e.g. via Docker or run manually). |
| Existing DB with `qd_*` tables | Run `rename_qd_to_ml.sql` once, then use app as usual. |
