"""
Zing Python API - Flask application factory.
"""
from flask import Flask
from flask_cors import CORS
import logging
import threading
import traceback

from app.utils.logger import setup_logger, get_logger

logger = get_logger(__name__)

# Global singletons (avoid duplicate strategy threads).
_trading_executor = None
_pending_order_worker = None


def get_trading_executor():
    """Get the trading executor singleton."""
    global _trading_executor
    if _trading_executor is None:
        from app.services.trading_executor import TradingExecutor
        _trading_executor = TradingExecutor()
    return _trading_executor


def get_pending_order_worker():
    """Get the pending order worker singleton."""
    global _pending_order_worker
    if _pending_order_worker is None:
        from app.services.pending_order_worker import PendingOrderWorker
        _pending_order_worker = PendingOrderWorker()
    return _pending_order_worker


def start_polymarket_worker():
    """Start Polymarket background worker."""
    try:
        from app.services.polymarket_worker import get_polymarket_worker
        get_polymarket_worker().start()
    except Exception as e:
        logger.error(f"Failed to start Polymarket worker: {e}")


def start_portfolio_monitor():
    """Start the portfolio monitor service if enabled.
    
    To enable it, set ENABLE_PORTFOLIO_MONITOR=true.
    Requires PostgreSQL; skipped when DB is unavailable (avoids repeated connection errors).
    """
    import os
    from app.utils.db import is_postgres_available
    enabled = os.getenv("ENABLE_PORTFOLIO_MONITOR", "true").lower() == "true"
    if not enabled:
        logger.info("Portfolio monitor is disabled. Set ENABLE_PORTFOLIO_MONITOR=true to enable.")
        return
    if not is_postgres_available():
        logger.info(
            "Portfolio monitor skipped: PostgreSQL is not available "
            "(check DATABASE_URL and that the role/database exist)."
        )
        return

    # Avoid running twice with Flask reloader
    debug = os.getenv("PYTHON_API_DEBUG", "false").lower() == "true"
    if debug:
        if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
            return

    try:
        from app.services.portfolio_monitor import start_monitor_service
        start_monitor_service()
    except Exception as e:
        logger.error(f"Failed to start portfolio monitor: {e}")


def start_pending_order_worker():
    """Start the pending order worker (disabled by default in paper mode).

    To enable it, set ENABLE_PENDING_ORDER_WORKER=true.
    Requires PostgreSQL (psycopg2 + DATABASE_URL); skipped when DB is unavailable.
    """
    import os
    from app.utils.db import is_postgres_available
    # Local deployment: default to enabled so queued orders can be dispatched automatically.
    # To disable it, set ENABLE_PENDING_ORDER_WORKER=false explicitly.
    if os.getenv('ENABLE_PENDING_ORDER_WORKER', 'true').lower() != 'true':
        logger.info("Pending order worker is disabled (paper mode). Set ENABLE_PENDING_ORDER_WORKER=true to enable.")
        return
    if not is_postgres_available():
        logger.info(
            "Pending order worker skipped: PostgreSQL is not available "
            "(install psycopg2 and set DATABASE_URL, or use Docker)."
        )
        return
    try:
        get_pending_order_worker().start()
    except Exception as e:
        logger.error(f"Failed to start pending order worker: {e}")


def start_usdt_order_worker():
    """Start the USDT order background worker.

    Periodically scans pending/paid USDT orders and checks on-chain status.
    Ensures orders are confirmed even if the user closes the browser after payment.
    Only starts if USDT_PAY_ENABLED=true.
    """
    import os
    if str(os.getenv("USDT_PAY_ENABLED", "False")).lower() not in ("1", "true", "yes"):
        logger.info("USDT order worker not started (USDT_PAY_ENABLED is not true).")
        return

    # Avoid running twice with Flask reloader
    debug = os.getenv("PYTHON_API_DEBUG", "false").lower() == "true"
    if debug:
        if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
            return

    try:
        from app.services.usdt_payment_service import get_usdt_order_worker
        get_usdt_order_worker().start()
    except Exception as e:
        logger.error(f"Failed to start USDT order worker: {e}")


def restore_running_strategies():
    """
    Restore running strategies on startup.
    Local deployment: only restores IndicatorStrategy.
    """
    import os
    # You can disable auto-restore to avoid starting many threads on low-resource hosts.
    if os.getenv('DISABLE_RESTORE_RUNNING_STRATEGIES', 'false').lower() == 'true':
        logger.info("Startup strategy restore is disabled via DISABLE_RESTORE_RUNNING_STRATEGIES")
        return
    try:
        from app.services.strategy import StrategyService

        strategy_service = StrategyService()
        try:
            trading_executor = get_trading_executor()
        except (ImportError, ModuleNotFoundError) as e:
            logger.info(
                "Strategy restore skipped: trading executor (ccxt) unavailable: %s. "
                "Set DISABLE_RESTORE_RUNNING_STRATEGIES=true to hide this.",
                e,
            )
            return
        
        running_strategies = strategy_service.get_running_strategies_with_type()
        
        if not running_strategies:
            logger.info("No running strategies to restore.")
            return
        
        logger.info(f"Restoring {len(running_strategies)} running strategies...")
        
        restored_count = 0
        for strategy_info in running_strategies:
            strategy_id = strategy_info['id']
            strategy_type = strategy_info.get('strategy_type', '')
            
            try:
                if strategy_type and strategy_type != 'IndicatorStrategy':
                    logger.info(f"Skip restore unsupported strategy type: id={strategy_id}, type={strategy_type}")
                    continue

                success = trading_executor.start_strategy(strategy_id)
                strategy_type_name = 'IndicatorStrategy'
                
                if success:
                    restored_count += 1
                    logger.info(f"[OK] {strategy_type_name} {strategy_id} restored")
                else:
                    logger.warning(f"[FAIL] {strategy_type_name} {strategy_id} restore failed (state may be stale)")
                    # If restore fails, update DB status to stopped to avoid zombie strategy state
                    try:
                        strategy_service.update_strategy_status(strategy_id, 'stopped')
                        logger.info(f"[FIX] Updated strategy {strategy_id} status to 'stopped' after restore failure")
                    except Exception as e:
                        logger.error(f"Failed to update strategy {strategy_id} status after restore failure: {e}")
            except Exception as e:
                logger.error(f"Error restoring strategy {strategy_id}: {str(e)}")
                logger.error(traceback.format_exc())
        
        logger.info(f"Strategy restore completed: {restored_count}/{len(running_strategies)} restored")

    except (ImportError, ModuleNotFoundError) as e:
        logger.info("Strategy restore skipped (missing dependency): %s", e)
    except Exception as e:
        logger.error(f"Failed to restore running strategies: {str(e)}")
        logger.error(traceback.format_exc())
        # Do not raise; avoid breaking app startup.


def create_app(config_name='default'):
    """
    Flask application factory.
    
    Args:
        config_name: config name
        
    Returns:
        Flask app
    """
    app = Flask(__name__)
    
    app.config['JSON_AS_ASCII'] = False

    # CORS: use CORS_ORIGINS env (e.g. https://marketlabs-production.up.railway.app or * for dev)
    from app.config.settings import Config
    _origins = Config.CORS_ORIGINS
    if _origins and str(_origins).strip() == '*':
        CORS(app)
    else:
        _list = [x.strip() for x in str(_origins or '').split(',') if x.strip()]
        CORS(app, origins=_list if _list else None)
    
    setup_logger()
    
    # Defer DB init to a background thread so the app can bind and respond to
    # /api/health immediately (avoids 502 "Application failed to respond" on Railway
    # when Postgres is slow or cold-starting).
    def _init_db_and_admin():
        try:
            from app.utils.db import init_database, get_db_type
            logger.debug("Database type: %s", get_db_type())
            init_database()
            from app.services.user_service import get_user_service
            get_user_service().ensure_admin_exists()
        except Exception as e:
            logger.warning("Database initialization note: %s", e)
    _db_thread = threading.Thread(target=_init_db_and_admin, daemon=True)
    _db_thread.start()

    # =====================================================
    # Demo Mode Middleware (Read-Only Mode)
    # =====================================================
    import os
    from flask import request, jsonify

    # Check environment variable IS_DEMO_MODE
    is_demo_mode = os.getenv('IS_DEMO_MODE', 'false').lower() == 'true'

    if is_demo_mode:
        logger.info("!!! SYSTEM STARTING IN DEMO MODE (READ-ONLY) !!!")

        @app.before_request
        def global_demo_mode_check():
            """
            Global interceptor for demo mode.
            Blocks all state-changing methods AND access to sensitive GET endpoints.
            """
            path = request.path

            # 1. Block access to sensitive settings/config APIs (even if GET)
            # These endpoints reveal internal config or allow settings changes
            sensitive_endpoints = [
                '/api/settings',           # All settings routes
                '/api/credentials',        # Credentials management
                '/api/market/watchlist/add', # Modifying watchlist (POST, already blocked but good to be explicit)
                '/api/market/watchlist/remove'
            ]
            
            # Check if path starts with any sensitive prefix
            if any(path.startswith(endpoint) for endpoint in sensitive_endpoints):
                 return jsonify({
                    'code': 403,
                    'msg': 'Demo mode: Access to settings and credentials is forbidden.',
                    'data': None
                }), 403

            # 2. Allow safe methods (GET, HEAD, OPTIONS)
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return None
            
            # 2. Allow Authentication (Login/Logout)
            # The auth routes are mounted at /api/user (see app/routes/__init__.py)
            if request.path.endswith('/login') or request.path.endswith('/logout'):
                return None

            # 3. Allow specific read-only POST endpoints (Whitelist)
            # Some search/query endpoints use POST for complex payloads but don't modify state.
            whitelist_post_endpoints = [
                '/api/indicator/getIndicators', # Search indicators
                '/api/market/klines',           # Fetch K-lines (sometimes POST)
                '/api/ai/chat',                 # AI Chat (generates response, doesn't mutate system state)
                '/api/fast-analysis/analyze',   # Fast AI Analysis request
                '/api/polymarket/analyze',      # Polymarket prediction market analysis
            ]
            
            # Check if current path ends with any whitelist item
            if any(request.path.endswith(endpoint) for endpoint in whitelist_post_endpoints):
                return None

            # 4. Block everything else
            return jsonify({
                'code': 403,
                'msg': 'Demo mode: Read-only access. Forbidden to modify data.',
                'data': None
            }), 403
    
    from app.routes import register_routes
    register_routes(app)

    # Run DB-dependent startup hooks in a background thread so create_app() returns quickly.
    # This allows the server to bind and respond to /api/health before DB/workers are ready
    # (fixes Railway healthcheck "service unavailable" when Postgres is slow or cold).
    def _run_startup_hooks():
        with app.app_context():
            start_pending_order_worker()
            start_portfolio_monitor()
            start_usdt_order_worker()
            start_polymarket_worker()
            restore_running_strategies()

    _startup_thread = threading.Thread(target=_run_startup_hooks, daemon=True)
    _startup_thread.start()

    return app

