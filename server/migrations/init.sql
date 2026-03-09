-- MarketLabs PostgreSQL Schema Initialization
-- This script runs automatically when PostgreSQL container starts for the first time.

-- =============================================================================
-- 1. Users & Authentication
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    nickname VARCHAR(50),
    avatar VARCHAR(255) DEFAULT '/avatar2.jpg',
    status VARCHAR(20) DEFAULT 'active',  -- active/disabled/pending
    role VARCHAR(20) DEFAULT 'user',       -- admin/manager/user/viewer
    credits DECIMAL(20,2) DEFAULT 0,       -- Credits balance
    vip_expires_at TIMESTAMP,              -- VIP expiration time
    vip_plan VARCHAR(20) DEFAULT '',       -- VIP plan: monthly/yearly/lifetime
    vip_is_lifetime BOOLEAN DEFAULT FALSE, -- Whether the VIP is lifetime
    vip_monthly_credits_last_grant TIMESTAMP, -- Last grant time of monthly credits for lifetime VIP
    email_verified BOOLEAN DEFAULT FALSE,  -- Whether the email is verified
    referred_by INTEGER,                   -- Referral ID
    notification_settings TEXT DEFAULT '', -- User notification configuration JSON (telegram_chat_id, default_channels etc.)
    token_version INTEGER DEFAULT 1,       -- Token version number, for single-client login control
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_referred_by ON ml_users(referred_by);

-- Note: Admin user is created automatically by the application on startup
-- using ADMIN_USER and ADMIN_PASSWORD from environment variables.
-- Default username: marketlabs (set ADMIN_USER=marketlabs in server/.env).

-- =============================================================================
-- 1.5. Credits Log (Credits change log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_credits_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,            -- recharge/consume/refund/admin_adjust/vip_grant
    amount DECIMAL(20,2) NOT NULL,          -- Change amount (positive number increases, negative number decreases)
    balance_after DECIMAL(20,2) NOT NULL,   -- Balance after change
    feature VARCHAR(50) DEFAULT '',          -- Consumed feature: ai_analysis/strategy_run/backtest etc.
    reference_id VARCHAR(100) DEFAULT '',    -- Reference ID (e.g. order number, analysis task ID etc.)
    remark TEXT DEFAULT '',                  -- Remark
    operator_id INTEGER,                     -- Operator ID (recorded when admin adjusts)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_log_user_id ON ml_credits_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_log_action ON ml_credits_log(action);
CREATE INDEX IF NOT EXISTS idx_credits_log_created_at ON ml_credits_log(created_at);

-- =============================================================================
-- 1.55. Membership Orders (Membership order - Mock payment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_membership_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL,             -- monthly/yearly/lifetime
    price_usd DECIMAL(10,2) DEFAULT 0,     -- Order amount (USD)
    status VARCHAR(20) DEFAULT 'paid',     -- paid/pending/failed/refunded (mock 默认 paid)
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_membership_orders_user_id ON ml_membership_orders(user_id);

-- =============================================================================
-- 1.56. USDT Orders (USDT payment order - each order has a separate address)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_usdt_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL,                 -- monthly/yearly/lifetime
    chain VARCHAR(20) NOT NULL DEFAULT 'TRC20',-- TRC20 (MVP)
    amount_usdt DECIMAL(20,6) NOT NULL DEFAULT 0,
    address_index INTEGER NOT NULL DEFAULT 0,  -- HD derived index
    address VARCHAR(80) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/paid/confirmed/expired/cancelled/failed
    tx_hash VARCHAR(120) DEFAULT '',
    paid_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_orders_address_unique ON ml_usdt_orders(chain, address);
CREATE INDEX IF NOT EXISTS idx_usdt_orders_user_id ON ml_usdt_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_orders_status ON ml_usdt_orders(status);

-- =============================================================================
-- 1.6. Verification Codes (Email verification code)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_verification_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,              -- register/login/reset_password/change_email/change_password
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),
    attempts INTEGER DEFAULT 0,             -- Failed verification attempts (anti-brute-force)
    last_attempt_at TIMESTAMP,              -- Last attempt time
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON ml_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON ml_verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON ml_verification_codes(expires_at);

-- =============================================================================
-- 1.7. Login Attempts (Login attempt record - anti-brute-force)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_login_attempts (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL,       -- IP address or username
    identifier_type VARCHAR(10) NOT NULL,   -- 'ip' or 'account'
    attempt_time TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON ml_login_attempts(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON ml_login_attempts(attempt_time);

-- =============================================================================
-- 1.8. OAuth Links (Third-party account association)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_oauth_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES ml_users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,          -- 'google' or 'github'
    provider_user_id VARCHAR(100) NOT NULL,
    provider_email VARCHAR(100),
    provider_name VARCHAR(100),
    provider_avatar VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_links_user_id ON ml_oauth_links(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_links_provider ON ml_oauth_links(provider);

-- =============================================================================
-- 1.9. Security Audit Log (Security audit log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,            -- login/logout/register/reset_password/oauth_login/etc
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,                           -- JSON with additional info
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON ml_security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON ml_security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON ml_security_logs(created_at);

-- =============================================================================
-- 2. Trading Strategies
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_strategies_trading (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_name VARCHAR(255) NOT NULL,
    strategy_type VARCHAR(50) DEFAULT 'IndicatorStrategy',
    market_category VARCHAR(50) DEFAULT 'Crypto',
    execution_mode VARCHAR(20) DEFAULT 'signal',
    notification_config TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'stopped',
    symbol VARCHAR(50),
    timeframe VARCHAR(10),
    initial_capital DECIMAL(20,8) DEFAULT 1000,
    leverage INTEGER DEFAULT 1,
    market_type VARCHAR(20) DEFAULT 'swap',
    exchange_config TEXT,
    indicator_config TEXT,
    trading_config TEXT,
    ai_model_config TEXT,
    decide_interval INTEGER DEFAULT 300,
    strategy_group_id VARCHAR(100) DEFAULT '',
    group_base_name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON ml_strategies_trading(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON ml_strategies_trading(status);
CREATE INDEX IF NOT EXISTS idx_strategies_group_id ON ml_strategies_trading(strategy_group_id);

-- Add last_rebalance_at column for cross-sectional strategies (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_strategies_trading' AND column_name = 'last_rebalance_at'
    ) THEN
        ALTER TABLE ml_strategies_trading ADD COLUMN last_rebalance_at TIMESTAMP;
        RAISE NOTICE 'Added last_rebalance_at column to ml_strategies_trading';
    END IF;
END $$;

-- =============================================================================
-- 3. Strategy Positions
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_strategy_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES ml_strategies_trading(id) ON DELETE CASCADE,
    symbol VARCHAR(50),
    side VARCHAR(10),  -- long/short
    size DECIMAL(20,8),
    entry_price DECIMAL(20,8),
    current_price DECIMAL(20,8),
    highest_price DECIMAL(20,8) DEFAULT 0,
    lowest_price DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    pnl_percent DECIMAL(10,4) DEFAULT 0,
    equity DECIMAL(20,8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(strategy_id, symbol, side)
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON ml_strategy_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_strategy_id ON ml_strategy_positions(strategy_id);

-- =============================================================================
-- 4. Strategy Trades
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_strategy_trades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES ml_strategies_trading(id) ON DELETE CASCADE,
    symbol VARCHAR(50),
    type VARCHAR(30),  -- open_long, close_short, etc.
    price DECIMAL(20,8),
    amount DECIMAL(20,8),
    value DECIMAL(20,8),
    commission DECIMAL(20,8) DEFAULT 0,
    commission_ccy VARCHAR(20) DEFAULT '',
    profit DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON ml_strategy_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON ml_strategy_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON ml_strategy_trades(created_at);

-- =============================================================================
-- 5. Pending Orders Queue
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES ml_strategies_trading(id) ON DELETE SET NULL,
    symbol VARCHAR(50) NOT NULL,
    signal_type VARCHAR(30) NOT NULL,
    signal_ts BIGINT,
    market_type VARCHAR(20) DEFAULT 'swap',
    order_type VARCHAR(20) DEFAULT 'market',
    amount DECIMAL(20,8) DEFAULT 0,
    price DECIMAL(20,8) DEFAULT 0,
    execution_mode VARCHAR(20) DEFAULT 'signal',
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 10,
    last_error TEXT DEFAULT '',
    payload_json TEXT DEFAULT '',
    dispatch_note TEXT DEFAULT '',
    exchange_id VARCHAR(50) DEFAULT '',
    exchange_order_id VARCHAR(100) DEFAULT '',
    exchange_response_json TEXT DEFAULT '',
    filled DECIMAL(20,8) DEFAULT 0,
    avg_price DECIMAL(20,8) DEFAULT 0,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_strategy_id ON pending_orders(strategy_id);

-- =============================================================================
-- 6. Strategy Notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_strategy_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES ml_strategies_trading(id) ON DELETE CASCADE,
    symbol VARCHAR(50) DEFAULT '',
    signal_type VARCHAR(30) DEFAULT '',
    channels VARCHAR(255) DEFAULT '',
    title VARCHAR(255) DEFAULT '',
    message TEXT DEFAULT '',
    payload_json TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON ml_strategy_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_strategy_id ON ml_strategy_notifications(strategy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON ml_strategy_notifications(is_read);

-- =============================================================================
-- 7. Indicator Codes
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_indicator_codes (
   id serial4 NOT NULL,
   user_id int4 DEFAULT 1 NOT NULL,
   is_buy int4 DEFAULT 0 NOT NULL,
   end_time int8 DEFAULT 1 NOT NULL,
   name varchar(255) DEFAULT ''::character varying NOT NULL,
   code text NULL,
   description text DEFAULT ''::text NULL,
   publish_to_community int4 DEFAULT 0 NOT NULL,
   pricing_type varchar(20) DEFAULT 'free'::character varying NOT NULL,
   price numeric(10, 2) DEFAULT 0 NOT NULL,
   is_encrypted int4 DEFAULT 0 NOT NULL,
   preview_image varchar(500) DEFAULT ''::character varying NULL,
   vip_free boolean DEFAULT false, -- VIP free indicator: VIP can use without deducting credits
   createtime int8 NULL,
   updatetime int8 NULL,
   created_at timestamp DEFAULT now(),
   updated_at timestamp DEFAULT now(),
   purchase_count int4 DEFAULT 0 NULL,
   avg_rating numeric(3, 2) DEFAULT 0 NULL,
   rating_count int4 DEFAULT 0 NULL,
   view_count int4 DEFAULT 0 NULL,
   review_status varchar(20) DEFAULT 'approved'::character varying NULL,
   review_note text DEFAULT ''::text NULL,
   reviewed_at timestamp NULL,
   reviewed_by int4 NULL,
   CONSTRAINT ml_indicator_codes_pkey PRIMARY KEY (id),
   CONSTRAINT ml_indicator_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES ml_users(id) ON DELETE CASCADE

);

CREATE INDEX IF NOT EXISTS idx_indicator_codes_user_id ON ml_indicator_codes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_indicator_review_status ON ml_indicator_codes USING btree (review_status);

-- =============================================================================
-- 8. AI Decisions
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_ai_decisions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES ml_strategies_trading(id) ON DELETE CASCADE,
    decision_data TEXT,
    context_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_user_id ON ml_ai_decisions(user_id);

-- =============================================================================
-- 9. Addon Config
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_addon_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    type VARCHAR(20) DEFAULT 'string'
);

-- =============================================================================
-- 10. Watchlist
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, market, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON ml_watchlist(user_id);

-- =============================================================================
-- 11. Analysis Tasks
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_analysis_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    model VARCHAR(100) DEFAULT '',
    language VARCHAR(20) DEFAULT 'en-US',
    status VARCHAR(20) DEFAULT 'completed',
    result_json TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_tasks_user_id ON ml_analysis_tasks(user_id);

-- =============================================================================
-- 12. Backtest Runs
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_backtest_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    indicator_id INTEGER,
    market VARCHAR(50) NOT NULL DEFAULT '',
    symbol VARCHAR(50) NOT NULL DEFAULT '',
    timeframe VARCHAR(10) NOT NULL DEFAULT '',
    start_date VARCHAR(20) NOT NULL DEFAULT '',
    end_date VARCHAR(20) NOT NULL DEFAULT '',
    initial_capital DECIMAL(20,8) DEFAULT 10000,
    commission DECIMAL(10,6) DEFAULT 0.001,
    slippage DECIMAL(10,6) DEFAULT 0,
    leverage INTEGER DEFAULT 1,
    trade_direction VARCHAR(20) DEFAULT 'long',
    strategy_config TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT DEFAULT '',
    result_json TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_user_id ON ml_backtest_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_indicator_id ON ml_backtest_runs(indicator_id);

-- =============================================================================
-- 13. Exchange Credentials
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_exchange_credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT '',
    exchange_id VARCHAR(50) NOT NULL,
    api_key_hint VARCHAR(50) DEFAULT '',
    encrypted_config TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_credentials_user_id ON ml_exchange_credentials(user_id);

-- =============================================================================
-- 14. Manual Positions
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_manual_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(100) DEFAULT '',
    side VARCHAR(10) DEFAULT 'long',
    quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
    entry_price DECIMAL(20,8) NOT NULL DEFAULT 0,
    entry_time BIGINT,
    notes TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    group_name VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, market, symbol, side, group_name)
);

CREATE INDEX IF NOT EXISTS idx_manual_positions_user_id ON ml_manual_positions(user_id);

-- =============================================================================
-- 15. Position Alerts
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_position_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    position_id INTEGER,
    market VARCHAR(50) DEFAULT '',
    symbol VARCHAR(50) DEFAULT '',
    alert_type VARCHAR(30) NOT NULL,
    threshold DECIMAL(20,8) NOT NULL DEFAULT 0,
    notification_config TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    is_triggered INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    repeat_interval INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_alerts_user_id ON ml_position_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_position_alerts_position_id ON ml_position_alerts(position_id);

-- =============================================================================
-- 16. Position Monitors
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_position_monitors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES ml_users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT '',
    position_ids TEXT DEFAULT '',
    monitor_type VARCHAR(20) DEFAULT 'ai',
    config TEXT DEFAULT '',
    notification_config TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    last_result TEXT DEFAULT '',
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_monitors_user_id ON ml_position_monitors(user_id);

-- =============================================================================
-- 17. Market Symbols (Seed Data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_market_symbols (
    id SERIAL PRIMARY KEY,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    exchange VARCHAR(50) DEFAULT '',
    currency VARCHAR(10) DEFAULT '',
    is_active INTEGER DEFAULT 1,
    is_hot INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(market, symbol)
);

CREATE INDEX IF NOT EXISTS idx_market_symbols_market ON ml_market_symbols(market);
CREATE INDEX IF NOT EXISTS idx_market_symbols_is_hot ON ml_market_symbols(market, is_hot);

-- Seed data: Hot symbols for each market
INSERT INTO ml_market_symbols (market, symbol, name, exchange, currency, is_active, is_hot, sort_order) VALUES
-- USStock (US Stocks)
('USStock', 'AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 1, 1, 100),
('USStock', 'MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 1, 1, 99),
('USStock', 'GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 1, 1, 98),
('USStock', 'AMZN', 'Amazon.com Inc.', 'NASDAQ', 'USD', 1, 1, 97),
('USStock', 'TSLA', 'Tesla, Inc.', 'NASDAQ', 'USD', 1, 1, 96),
('USStock', 'META', 'Meta Platforms Inc.', 'NASDAQ', 'USD', 1, 1, 95),
('USStock', 'NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', 1, 1, 94),
('USStock', 'JPM', 'JPMorgan Chase & Co.', 'NYSE', 'USD', 1, 1, 93),
('USStock', 'V', 'Visa Inc.', 'NYSE', 'USD', 1, 1, 92),
('USStock', 'JNJ', 'Johnson & Johnson', 'NYSE', 'USD', 1, 1, 91),
-- Crypto
('Crypto', 'BTC/USDT', 'Bitcoin', 'Binance', 'USDT', 1, 1, 100),
('Crypto', 'ETH/USDT', 'Ethereum', 'Binance', 'USDT', 1, 1, 99),
('Crypto', 'BNB/USDT', 'BNB', 'Binance', 'USDT', 1, 1, 98),
('Crypto', 'SOL/USDT', 'Solana', 'Binance', 'USDT', 1, 1, 97),
('Crypto', 'XRP/USDT', 'Ripple', 'Binance', 'USDT', 1, 1, 96),
('Crypto', 'ADA/USDT', 'Cardano', 'Binance', 'USDT', 1, 1, 95),
('Crypto', 'DOGE/USDT', 'Dogecoin', 'Binance', 'USDT', 1, 1, 94),
('Crypto', 'DOT/USDT', 'Polkadot', 'Binance', 'USDT', 1, 1, 93),
('Crypto', 'MATIC/USDT', 'Polygon', 'Binance', 'USDT', 1, 1, 92),
('Crypto', 'AVAX/USDT', 'Avalanche', 'Binance', 'USDT', 1, 1, 91),
-- Forex
('Forex', 'XAUUSD', 'Gold/USD', 'Forex', 'USD', 1, 1, 100),
('Forex', 'XAGUSD', 'Silver/USD', 'Forex', 'USD', 1, 1, 99),
('Forex', 'EURUSD', 'Euro/US Dollar', 'Forex', 'USD', 1, 1, 98),
('Forex', 'GBPUSD', 'British Pound/US Dollar', 'Forex', 'USD', 1, 1, 97),
('Forex', 'USDJPY', 'US Dollar/Japanese Yen', 'Forex', 'USD', 1, 1, 96),
('Forex', 'AUDUSD', 'Australian Dollar/US Dollar', 'Forex', 'USD', 1, 1, 95),
('Forex', 'USDCAD', 'US Dollar/Canadian Dollar', 'Forex', 'USD', 1, 1, 94),
('Forex', 'NZDUSD', 'New Zealand Dollar/US Dollar', 'Forex', 'USD', 1, 1, 93),
('Forex', 'USDCHF', 'US Dollar/Swiss Franc', 'Forex', 'EUR', 1, 1, 92),
('Forex', 'EURJPY', 'Euro/Japanese Yen', 'Forex', 'EUR', 1, 1, 91),
-- Futures
('Futures', 'CL', 'WTI Crude Oil', 'NYMEX', 'USD', 1, 1, 100),
('Futures', 'GC', 'Gold', 'COMEX', 'USD', 1, 1, 99),
('Futures', 'SI', 'Silver', 'COMEX', 'USD', 1, 1, 98),
('Futures', 'NG', 'Natural Gas', 'NYMEX', 'USD', 1, 1, 97),
('Futures', 'HG', 'Copper', 'COMEX', 'USD', 1, 1, 96),
('Futures', 'ZC', 'Corn', 'CBOT', 'USD', 1, 1, 95),
('Futures', 'ZS', 'Soybeans', 'CBOT', 'USD', 1, 1, 94),
('Futures', 'ZW', 'Wheat', 'CBOT', 'USD', 1, 1, 93),
('Futures', 'ES', 'S&P 500 E-mini', 'CME', 'USD', 1, 1, 92),
('Futures', 'NQ', 'NASDAQ 100 E-mini', 'CME', 'USD', 1, 1, 91),
-- IndianStock (NSE)
('IndianStock', 'RELIANCE.NS', 'Reliance Industries Ltd.', 'NSE', 'INR', 1, 1, 100),
('IndianStock', 'TCS.NS', 'Tata Consultancy Services Ltd.', 'NSE', 'INR', 1, 1, 99),
('IndianStock', 'INFY.NS', 'Infosys Ltd.', 'NSE', 'INR', 1, 1, 98),
('IndianStock', 'HDFCBANK.NS', 'HDFC Bank Ltd.', 'NSE', 'INR', 1, 1, 97),
('IndianStock', 'ICICIBANK.NS', 'ICICI Bank Ltd.', 'NSE', 'INR', 1, 1, 96),
('IndianStock', 'HINDUNILVR.NS', 'Hindustan Unilever Ltd.', 'NSE', 'INR', 1, 1, 95),
('IndianStock', 'ITC.NS', 'ITC Ltd.', 'NSE', 'INR', 1, 1, 94),
('IndianStock', 'SBIN.NS', 'State Bank of India', 'NSE', 'INR', 1, 1, 93),
('IndianStock', 'BHARTIARTL.NS', 'Bharti Airtel Ltd.', 'NSE', 'INR', 1, 1, 92),
('IndianStock', 'KOTAKBANK.NS', 'Kotak Mahindra Bank Ltd.', 'NSE', 'INR', 1, 1, 91),
-- IndianStock Indices
('IndianStock', '^NSEI', 'NIFTY 50 Index', 'NSE_INDEX', 'INR', 1, 1, 110),
('IndianStock', '^NSEBANK', 'NIFTY Bank Index', 'NSE_INDEX', 'INR', 1, 1, 109),
('IndianStock', '^BSESN', 'BSE SENSEX Index', 'BSE_INDEX', 'INR', 1, 1, 108),
('IndianStock', '^CNXFIN', 'NIFTY Financial Services Index', 'NSE_INDEX', 'INR', 1, 1, 107),
('IndianStock', '^CNXMID', 'NIFTY Midcap Select Index', 'NSE_INDEX', 'INR', 1, 1, 106),
-- IndianStock additional popular equities
('IndianStock', 'BAJFINANCE.NS', 'Bajaj Finance Ltd.', 'NSE', 'INR', 1, 1, 90),
('IndianStock', 'LT.NS', 'Larsen & Toubro Ltd.', 'NSE', 'INR', 1, 1, 89),
('IndianStock', 'HCLTECH.NS', 'HCL Technologies Ltd.', 'NSE', 'INR', 1, 1, 88),
('IndianStock', 'WIPRO.NS', 'Wipro Ltd.', 'NSE', 'INR', 1, 1, 87),
('IndianStock', 'MARUTI.NS', 'Maruti Suzuki India Ltd.', 'NSE', 'INR', 1, 1, 86),
('IndianStock', 'TATAMOTORS.NS', 'Tata Motors Ltd.', 'NSE', 'INR', 1, 1, 85),
('IndianStock', 'SUNPHARMA.NS', 'Sun Pharmaceutical Industries Ltd.', 'NSE', 'INR', 1, 1, 84),
('IndianStock', 'ADANIENT.NS', 'Adani Enterprises Ltd.', 'NSE', 'INR', 1, 1, 83),
('IndianStock', 'TATASTEEL.NS', 'Tata Steel Ltd.', 'NSE', 'INR', 1, 1, 82),
('IndianStock', 'AXISBANK.NS', 'Axis Bank Ltd.', 'NSE', 'INR', 1, 1, 81)
ON CONFLICT (market, symbol) DO NOTHING;

-- =============================================================================
-- 18. Agent Memories (AI Learning System)
-- =============================================================================
-- Stores agent decision experiences for RAG-style retrieval during analysis.
-- Each agent (trader, risk_analyst, etc.) shares this table but is identified by agent_name.

CREATE TABLE IF NOT EXISTS ml_agent_memories (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    situation TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    result TEXT,
    returns REAL,
    market VARCHAR(50),
    symbol VARCHAR(50),
    timeframe VARCHAR(20),
    features_json TEXT,
    embedding BYTEA,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON ml_agent_memories(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON ml_agent_memories(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_market ON ml_agent_memories(agent_name, market, symbol);

-- =============================================================================
-- 19. Reflection Records (AI Auto-Verification System)
-- =============================================================================
-- Records analysis predictions for future auto-verification and closed-loop learning.

CREATE TABLE IF NOT EXISTS ml_reflection_records (
    id SERIAL PRIMARY KEY,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    initial_price REAL,
    decision VARCHAR(20),
    confidence INTEGER,
    reasoning TEXT,
    analysis_date TIMESTAMP DEFAULT NOW(),
    target_check_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING',
    final_price REAL,
    actual_return REAL,
    check_result TEXT
);

CREATE INDEX IF NOT EXISTS idx_reflection_status ON ml_reflection_records(status, target_check_date);
CREATE INDEX IF NOT EXISTS idx_reflection_market ON ml_reflection_records(market, symbol);

-- =============================================================================
-- 19.5. Analysis Memory (Fast AI Analysis Memory System)
-- =============================================================================
-- Stores AI analysis results for history, feedback, and learning.

CREATE TABLE IF NOT EXISTS ml_analysis_memory (
    id SERIAL PRIMARY KEY,
    user_id INT,                                -- User who created this analysis (for filtering)
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    decision VARCHAR(10) NOT NULL,
    confidence INT DEFAULT 50,
    price_at_analysis DECIMAL(24, 8),
    entry_price DECIMAL(24, 8),
    stop_loss DECIMAL(24, 8),
    take_profit DECIMAL(24, 8),
    summary TEXT,
    reasons JSONB,
    risks JSONB,
    scores JSONB,
    indicators_snapshot JSONB,
    raw_result JSONB,                           -- Full analysis result for history replay
    created_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP,
    actual_outcome VARCHAR(20),
    actual_return_pct DECIMAL(10, 4),
    was_correct BOOLEAN,
    user_feedback VARCHAR(20),                  -- helpful/not_helpful
    feedback_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_memory_symbol ON ml_analysis_memory(market, symbol);
CREATE INDEX IF NOT EXISTS idx_analysis_memory_created ON ml_analysis_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_memory_validated ON ml_analysis_memory(validated_at) WHERE validated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_memory_user ON ml_analysis_memory(user_id);

-- Migration: Add user_id column to existing ml_analysis_memory table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_analysis_memory' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE ml_analysis_memory ADD COLUMN user_id INT;
        CREATE INDEX IF NOT EXISTS idx_analysis_memory_user ON ml_analysis_memory(user_id);
        RAISE NOTICE 'Added user_id column to ml_analysis_memory';
    END IF;
END $$;

-- =============================================================================
-- 20. Migration: Add token_version for single-client login
-- =============================================================================
-- This migration adds token_version column for enforcing single-client login.
-- When a user logs in from a new device, the token_version is incremented,
-- invalidating all previous tokens and forcing other sessions to logout.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_users' AND column_name = 'token_version'
    ) THEN
        ALTER TABLE ml_users ADD COLUMN token_version INTEGER DEFAULT 1;
        RAISE NOTICE 'Added token_version column to ml_users table';
    END IF;
END $$;

-- =============================================================================
-- 21. Indicator Community Tables
-- =============================================================================

-- Indicator Purchases (Purchase record)
CREATE TABLE IF NOT EXISTS ml_indicator_purchases (
    id SERIAL PRIMARY KEY,
    indicator_id INTEGER NOT NULL REFERENCES ml_indicator_codes(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES ml_users(id),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(indicator_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_indicator ON ml_indicator_purchases(indicator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON ml_indicator_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller ON ml_indicator_purchases(seller_id);

-- Indicator Comments (Comments)
CREATE TABLE IF NOT EXISTS ml_indicator_comments (
    id SERIAL PRIMARY KEY,
    indicator_id INTEGER NOT NULL REFERENCES ml_indicator_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    content TEXT DEFAULT '',
    parent_id INTEGER REFERENCES ml_indicator_comments(id) ON DELETE CASCADE,
    is_deleted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_indicator ON ml_indicator_comments(indicator_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON ml_indicator_comments(user_id);

-- Add community stats columns to ml_indicator_codes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_indicator_codes' AND column_name = 'purchase_count'
    ) THEN
        ALTER TABLE ml_indicator_codes ADD COLUMN purchase_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added purchase_count column to ml_indicator_codes';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_indicator_codes' AND column_name = 'avg_rating'
    ) THEN
        ALTER TABLE ml_indicator_codes ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT 0;
        RAISE NOTICE 'Added avg_rating column to ml_indicator_codes';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_indicator_codes' AND column_name = 'rating_count'
    ) THEN
        ALTER TABLE ml_indicator_codes ADD COLUMN rating_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added rating_count column to ml_indicator_codes';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ml_indicator_codes' AND column_name = 'view_count'
    ) THEN
        ALTER TABLE ml_indicator_codes ADD COLUMN view_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added view_count column to ml_indicator_codes';
    END IF;
END $$;

-- =============================================================================
-- Price Alerts (Telegram bot + WebSocket streamer)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    telegram_chat_id VARCHAR(100),
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    target_price REAL NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'above',  -- 'above' or 'below'
    is_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    triggered_at TIMESTAMP
);

-- =============================================================================
-- API Keys (external access for TradingView webhooks, scripts, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,       -- SHA-256 hash of the API key
    key_prefix VARCHAR(10) NOT NULL,      -- First 8 chars for display (e.g. "ml_a1b2...")
    label VARCHAR(100) DEFAULT '',        -- User-friendly label
    permissions TEXT DEFAULT 'read,trade', -- Comma-separated: read, trade, admin
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON ml_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON ml_api_keys(key_hash);

-- =============================================================================
-- Webhook Logs (TradingView alert history)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_webhook_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    source VARCHAR(50) DEFAULT 'tradingview',
    payload TEXT,
    action VARCHAR(50),        -- 'buy', 'sell', 'alert', etc.
    market VARCHAR(50),
    symbol VARCHAR(50),
    status VARCHAR(20) DEFAULT 'received',  -- received, processed, error
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON ml_webhook_logs(user_id);

-- =============================================================================
-- Add SL/TP/Trailing Stop columns to manual positions (safe — IF NOT EXISTS)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ml_manual_positions' AND column_name = 'stop_loss'
    ) THEN
        ALTER TABLE ml_manual_positions ADD COLUMN stop_loss DECIMAL(20,8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ml_manual_positions' AND column_name = 'take_profit'
    ) THEN
        ALTER TABLE ml_manual_positions ADD COLUMN take_profit DECIMAL(20,8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ml_manual_positions' AND column_name = 'trailing_stop_pct'
    ) THEN
        ALTER TABLE ml_manual_positions ADD COLUMN trailing_stop_pct DECIMAL(10,4);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ml_manual_positions' AND column_name = 'trailing_stop_highest'
    ) THEN
        ALTER TABLE ml_manual_positions ADD COLUMN trailing_stop_highest DECIMAL(20,8);
    END IF;
END $$;

-- =============================================================================
-- 22. Flow Workflows (Visual Strategy Builder)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_flow_workflows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Workflow',
    description TEXT DEFAULT '',
    nodes JSONB DEFAULT '[]',
    edges JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT FALSE,
    webhook_token VARCHAR(64),
    webhook_secret VARCHAR(64),
    webhook_enabled BOOLEAN DEFAULT FALSE,
    webhook_auth_type VARCHAR(10) DEFAULT 'payload',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_workflows_user_id ON ml_flow_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_workflows_webhook_token ON ml_flow_workflows(webhook_token);

-- =============================================================================
-- 23. Flow Workflow Executions
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_flow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES ml_flow_workflows(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    logs JSONB DEFAULT '[]',
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_executions_workflow_id ON ml_flow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON ml_flow_executions(status);

-- =============================================================================
-- 24. Scanner Strategies (Generic Webhook Scanner)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_scanner_strategies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES ml_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    webhook_id VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    market_type VARCHAR(50) NOT NULL DEFAULT 'USStock',
    strategy_type VARCHAR(20) NOT NULL DEFAULT 'intraday',
    start_time VARCHAR(5),
    end_time VARCHAR(5),
    squareoff_time VARCHAR(5),
    default_action VARCHAR(10) DEFAULT 'BUY',
    default_order_type VARCHAR(20) DEFAULT 'market',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanner_strategies_user_id ON ml_scanner_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_scanner_strategies_webhook_id ON ml_scanner_strategies(webhook_id);

-- =============================================================================
-- 25. Scanner Symbol Mappings
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_scanner_symbol_mappings (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES ml_scanner_strategies(id) ON DELETE CASCADE,
    source_symbol VARCHAR(100) NOT NULL,
    market VARCHAR(50) NOT NULL,
    symbol VARCHAR(100) NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    execution_mode VARCHAR(20) DEFAULT 'signal',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanner_symbol_mappings_strategy_id ON ml_scanner_symbol_mappings(strategy_id);

-- =============================================================================
-- 26. Scanner Webhook Logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_scanner_webhook_logs (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL,
    payload JSONB,
    symbols_processed TEXT,
    orders_queued INTEGER DEFAULT 0,
    status VARCHAR(20),
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanner_webhook_logs_strategy_id ON ml_scanner_webhook_logs(strategy_id);

-- =============================================================================
-- Completion Notice
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'MarketLabs PostgreSQL schema initialized successfully!';
END $$;
