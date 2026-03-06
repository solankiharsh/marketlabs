-- Migration: Rename qd_* tables to ml_* (existing database)
-- Run this ONCE if you already have a database with qd_ tables.
-- Safe to re-run (idempotent): only renames when qd_ table exists.
-- Usage: psql $DATABASE_URL -f server/migrations/rename_qd_to_ml.sql

DO $$
DECLARE
  r RECORD;
  qd_tables TEXT[] := ARRAY[
    'qd_users', 'qd_credits_log', 'qd_membership_orders', 'qd_usdt_orders',
    'qd_verification_codes', 'qd_login_attempts', 'qd_oauth_links', 'qd_security_logs',
    'qd_strategies_trading', 'qd_strategy_positions', 'qd_strategy_trades',
    'qd_strategy_notifications', 'qd_indicator_codes', 'qd_ai_decisions', 'qd_addon_config',
    'qd_watchlist', 'qd_analysis_tasks', 'qd_backtest_runs', 'qd_exchange_credentials',
    'qd_manual_positions', 'qd_position_alerts', 'qd_position_monitors', 'qd_market_symbols',
    'qd_agent_memories', 'qd_reflection_records', 'qd_analysis_memory',
    'qd_indicator_purchases', 'qd_indicator_comments'
  ];
  t TEXT;
  new_name TEXT;
BEGIN
  FOREACH t IN ARRAY qd_tables
  LOOP
    new_name := 'ml_' || SUBSTRING(t FROM 4);  -- qd_xxx -> ml_xxx
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', t, new_name);
      RAISE NOTICE 'Renamed % to %', t, new_name;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migration qd_ -> ml_ completed.';
END $$;
