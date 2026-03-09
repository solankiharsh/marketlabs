"""
MarketLabs Python API - Flask application factory.
"""
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import logging
import traceback

from app.utils.logger import setup_logger, get_logger

# Module-level SocketIO instance (importable by run.py / gunicorn)
socketio = SocketIO()

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


def start_portfolio_monitor():
    """Start the portfolio monitor service if enabled.
    
    To enable it, set ENABLE_PORTFOLIO_MONITOR=true.
    """
    import os
    enabled = os.getenv("ENABLE_PORTFOLIO_MONITOR", "true").lower() == "true"
    if not enabled:
        logger.info("Portfolio monitor is disabled. Set ENABLE_PORTFOLIO_MONITOR=true to enable.")
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
    """
    import os
    # Local deployment: default to enabled so queued orders can be dispatched automatically.
    # To disable it, set ENABLE_PENDING_ORDER_WORKER=false explicitly.
    if os.getenv('ENABLE_PENDING_ORDER_WORKER', 'true').lower() != 'true':
        logger.info("Pending order worker is disabled (paper mode). Set ENABLE_PENDING_ORDER_WORKER=true to enable.")
        return
    try:
        get_pending_order_worker().start()
    except Exception as e:
        logger.error(f"Failed to start pending order worker: {e}")


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
        trading_executor = get_trading_executor()
        
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
            except Exception as e:
                logger.error(f"Error restoring strategy {strategy_id}: {str(e)}")
                logger.error(traceback.format_exc())
        
        logger.info(f"Strategy restore completed: {restored_count}/{len(running_strategies)} restored")
        
    except Exception as e:
        logger.error(f"Failed to restore running strategies: {str(e)}")
        logger.error(traceback.format_exc())
        # Do not raise; avoid breaking app startup.


def _run_migrations():
    """Run init.sql on startup (all statements are IF NOT EXISTS — safe to repeat)."""
    import os
    try:
        from app.utils.db import get_db_type
        if get_db_type() != 'postgresql':
            return
        sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'migrations', 'init.sql')
        if not os.path.isfile(sql_path):
            return
        with open(sql_path, 'r') as f:
            sql = f.read()
        from app.utils.db_postgres import _get_connection_pool
        pool = _get_connection_pool()
        conn = pool.getconn()
        try:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(sql)
            cur.close()
            logger.info("Database schema migration completed (init.sql)")
        finally:
            conn.autocommit = False
            pool.putconn(conn)
    except Exception as e:
        logger.warning(f"Migration note (non-fatal): {e}")


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
    
    CORS(app)

    # Initialize SocketIO — auto-detect async mode:
    # gunicorn+eventlet → eventlet mode; dev server (run.py) → threading mode
    import os as _os
    _async_mode = "eventlet" if _os.environ.get("GUNICORN_WORKER") else "threading"
    socketio.init_app(app, cors_allowed_origins="*", async_mode=_async_mode)

    setup_logger()
    
    # Test PostgreSQL connectivity first so we can show a clear message if it's not running
    try:
        from app.utils.db import get_db_type
        from app.utils.db_postgres import test_postgres_connection
        logger.info(f"Database type: {get_db_type()}")
        ok, err = test_postgres_connection()
        if not ok:
            logger.error(
                "PostgreSQL is not reachable at %s. Start the database with: make postgres-up  (requires Docker or Podman to be running).",
                err,
            )
    except Exception as e:
        logger.debug("Postgres connectivity check skipped: %s", e)

    # Run schema migrations (CREATE TABLE IF NOT EXISTS — safe to run every startup)
    _run_migrations()

    # Initialize database and ensure admin user exists
    try:
        from app.utils.db import init_database, get_db_type
        init_database()

        # Ensure admin user exists (multi-user mode)
        from app.services.user_service import get_user_service
        get_user_service().ensure_admin_exists()
    except Exception as e:
        logger.warning(f"Database initialization note: {e}")

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

    # Register WebSocket event handlers and start price streamer
    from app.routes.ws import register_ws_events
    register_ws_events(socketio)
    from app.services.price_streamer import init_streamer
    init_streamer(socketio)

    # Serve pre-built frontend from web/dist/ (single-binary deploy).
    # In dev mode the Vue CLI dev server handles this; in production Flask serves
    # the static build so no separate web server or Node.js is needed.
    _serve_frontend(app)

    # Startup hooks.
    with app.app_context():
        start_pending_order_worker()
        start_portfolio_monitor()
        restore_running_strategies()

    return app


def _serve_frontend(app):
    """Serve the Vue SPA from dist/ if it exists (production deploy)."""
    import os
    from flask import send_from_directory, make_response

    # Look for dist/ relative to server/ dir (../web/dist) or as a sibling copy (dist/)
    server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(server_dir, 'dist')
    if not os.path.isdir(dist_dir):
        dist_dir = os.path.join(os.path.dirname(server_dir), 'web', 'dist')
    if not os.path.isdir(dist_dir):
        return  # No dist found — dev mode, frontend served by Vue CLI

    logger.info(f"Serving frontend from {dist_dir}")

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        # Never intercept API calls
        if path.startswith('api/'):
            from flask import abort
            abort(404)
        # If the path matches a real file in dist/, serve it
        full = os.path.join(dist_dir, path)
        if path and os.path.isfile(full):
            resp = make_response(send_from_directory(dist_dir, path))
            # Hashed assets (js/css with content hash) can be cached forever;
            # everything else gets a short cache so deploys take effect quickly.
            if '/js/' in path or '/css/' in path:
                resp.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            else:
                resp.headers['Cache-Control'] = 'public, max-age=3600'
            return resp
        # SPA fallback — index.html must never be cached aggressively
        resp = make_response(send_from_directory(dist_dir, 'index.html'))
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
        return resp

