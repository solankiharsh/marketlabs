-- Run this ONLY if you have an existing database with qd_* tables.
-- New installs use init.sql which already creates qd_* tables.
-- Usage: psql $DATABASE_URL -f rename_qd_to_zing.sql

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'qd_%')
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I RENAME TO %I', r.tablename, 'qd_' || substring(r.tablename from 4));
    RAISE NOTICE 'Renamed % to qd_%', r.tablename, substring(r.tablename from 4);
  END LOOP;
END $$;
