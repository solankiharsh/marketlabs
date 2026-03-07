"""
Scanner Strategy API Routes

Generic webhook-based scanner system.
Accepts ChartInk, TradingView, and generic JSON payloads.
"""

import json
import secrets
from datetime import datetime

from flask import Blueprint, jsonify, request, g

from app.utils.db import get_db_connection
from app.utils.logger import get_logger
from app.utils.auth import login_required

logger = get_logger(__name__)

scanner_bp = Blueprint("scanner", __name__)


def _format_dt(dt):
    if dt and hasattr(dt, 'isoformat'):
        return dt.isoformat()
    return dt


def _row_to_strategy(row, columns):
    s = dict(zip(columns, row))
    for k in ('created_at', 'updated_at'):
        s[k] = _format_dt(s.get(k))
    return s


def _row_to_mapping(row, columns):
    m = dict(zip(columns, row))
    m['created_at'] = _format_dt(m.get('created_at'))
    return m


def _row_to_log(row, columns):
    log = dict(zip(columns, row))
    log['created_at'] = _format_dt(log.get('created_at'))
    v = log.get('payload')
    if isinstance(v, str):
        try:
            log['payload'] = json.loads(v)
        except Exception:
            pass
    return log


# ── Strategy CRUD ──────────────────────────────────────────────────────────

@scanner_bp.route('/strategies', methods=['GET'])
@login_required
def list_strategies():
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM ml_scanner_strategies WHERE user_id = %s ORDER BY updated_at DESC",
            (user_id,)
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    return jsonify({'code': 1, 'msg': 'success', 'data': [_row_to_strategy(r, cols) for r in rows]})


@scanner_bp.route('/strategies', methods=['POST'])
@login_required
def create_strategy():
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    name = data.get('name', 'Untitled Scanner')
    webhook_id = secrets.token_urlsafe(32)
    market_type = data.get('market_type', 'USStock')
    strategy_type = data.get('strategy_type', 'intraday')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    squareoff_time = data.get('squareoff_time')
    default_action = data.get('default_action', 'BUY')
    default_order_type = data.get('default_order_type', 'market')

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO ml_scanner_strategies "
            "(user_id, name, webhook_id, market_type, strategy_type, start_time, end_time, squareoff_time, default_action, default_order_type) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (user_id, name, webhook_id, market_type, strategy_type, start_time, end_time, squareoff_time, default_action, default_order_type)
        )
        sid = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM ml_scanner_strategies WHERE id = %s", (sid,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
    return jsonify({'code': 1, 'msg': 'created', 'data': _row_to_strategy(row, cols)})


@scanner_bp.route('/strategies/<int:sid>', methods=['GET'])
@login_required
def get_strategy(sid):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()
        if not row:
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        strategy = _row_to_strategy(row, cols)

        # Get mappings
        cur.execute("SELECT * FROM ml_scanner_symbol_mappings WHERE strategy_id = %s ORDER BY id", (sid,))
        mcols = [d[0] for d in cur.description]
        mrows = cur.fetchall()
        strategy['mappings'] = [_row_to_mapping(r, mcols) for r in mrows]

    return jsonify({'code': 1, 'msg': 'success', 'data': strategy})


@scanner_bp.route('/strategies/<int:sid>', methods=['PUT'])
@login_required
def update_strategy(sid):
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    allowed = ('name', 'market_type', 'strategy_type', 'start_time', 'end_time',
               'squareoff_time', 'default_action', 'default_order_type')
    sets = []
    params = []
    for f in allowed:
        if f in data:
            sets.append(f"{f} = %s")
            params.append(data[f])
    if not sets:
        return jsonify({'code': 0, 'msg': 'No fields', 'data': None}), 400
    sets.append("updated_at = NOW()")
    params.extend([sid, user_id])
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE ml_scanner_strategies SET {', '.join(sets)} WHERE id = %s AND user_id = %s", params)
        conn.commit()
    return jsonify({'code': 1, 'msg': 'updated', 'data': None})


@scanner_bp.route('/strategies/<int:sid>', methods=['DELETE'])
@login_required
def delete_strategy(sid):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        conn.commit()
    return jsonify({'code': 1, 'msg': 'deleted', 'data': None})


@scanner_bp.route('/strategies/<int:sid>/toggle', methods=['POST'])
@login_required
def toggle_strategy(sid):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE ml_scanner_strategies SET is_active = NOT is_active, updated_at = NOW() WHERE id = %s AND user_id = %s RETURNING is_active",
            (sid, user_id)
        )
        row = cur.fetchone()
        conn.commit()
    if not row:
        return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
    return jsonify({'code': 1, 'msg': 'toggled', 'data': {'is_active': row[0]}})


# ── Symbol Mappings ────────────────────────────────────────────────────────

@scanner_bp.route('/strategies/<int:sid>/symbols', methods=['POST'])
@login_required
def add_symbol_mapping(sid):
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}

    # Verify ownership
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        if not cur.fetchone():
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404

        cur.execute(
            "INSERT INTO ml_scanner_symbol_mappings (strategy_id, source_symbol, market, symbol, quantity, execution_mode) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (sid, data.get('source_symbol', ''), data.get('market', 'USStock'),
             data.get('symbol', ''), float(data.get('quantity', 1)), data.get('execution_mode', 'signal'))
        )
        mid = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM ml_scanner_symbol_mappings WHERE id = %s", (mid,))
        cols = [d[0] for d in cur.description]
        row = cur.fetchone()

    return jsonify({'code': 1, 'msg': 'added', 'data': _row_to_mapping(row, cols)})


@scanner_bp.route('/strategies/<int:sid>/symbols/bulk', methods=['POST'])
@login_required
def bulk_add_symbols(sid):
    user_id = g.user_id
    data = request.get_json(force=True, silent=True) or {}
    csv_text = data.get('csv', '')

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, market_type FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        row = cur.fetchone()
        if not row:
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        default_market = row[1]

        added = 0
        for line in csv_text.strip().split('\n'):
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 2:
                continue
            source = parts[0]
            symbol = parts[1]
            market = parts[2] if len(parts) > 2 else default_market
            qty = float(parts[3]) if len(parts) > 3 else 1
            cur.execute(
                "INSERT INTO ml_scanner_symbol_mappings (strategy_id, source_symbol, market, symbol, quantity) "
                "VALUES (%s, %s, %s, %s, %s)",
                (sid, source, market, symbol, qty)
            )
            added += 1
        conn.commit()

    return jsonify({'code': 1, 'msg': f'{added} symbols added', 'data': {'count': added}})


@scanner_bp.route('/strategies/<int:sid>/symbols/<int:mid>', methods=['DELETE'])
@login_required
def remove_symbol_mapping(sid, mid):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        if not cur.fetchone():
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        cur.execute("DELETE FROM ml_scanner_symbol_mappings WHERE id = %s AND strategy_id = %s", (mid, sid))
        conn.commit()
    return jsonify({'code': 1, 'msg': 'removed', 'data': None})


# ── Webhook Logs ───────────────────────────────────────────────────────────

@scanner_bp.route('/strategies/<int:sid>/logs', methods=['GET'])
@login_required
def get_webhook_logs(sid):
    user_id = g.user_id
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM ml_scanner_strategies WHERE id = %s AND user_id = %s", (sid, user_id))
        if not cur.fetchone():
            return jsonify({'code': 0, 'msg': 'Not found', 'data': None}), 404
        cur.execute(
            "SELECT * FROM ml_scanner_webhook_logs WHERE strategy_id = %s ORDER BY created_at DESC LIMIT 100",
            (sid,)
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    return jsonify({'code': 1, 'msg': 'success', 'data': [_row_to_log(r, cols) for r in rows]})


# ── External Webhook (no auth) ────────────────────────────────────────────

@scanner_bp.route('/webhook/<webhook_id>', methods=['POST'])
def scanner_webhook(webhook_id):
    """
    Accept external webhook payloads. Auto-detects format:

    Format 1 (ChartInk): {"stocks": "AAPL,MSFT", "trigger_prices": "180.50,420.00", ...}
    Format 2 (TradingView): {"symbol": "AAPL", "action": "buy", "quantity": 10, ...}
    Format 3 (Generic list): {"symbols": ["AAPL", "MSFT"], "action": "buy"}
    """
    payload = request.get_json(force=True, silent=True) or {}

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT s.id, s.user_id, s.is_active, s.market_type, s.default_action, s.default_order_type, "
            "s.start_time, s.end_time "
            "FROM ml_scanner_strategies s WHERE s.webhook_id = %s",
            (webhook_id,)
        )
        row = cur.fetchone()

    if not row:
        return jsonify({'status': 'error', 'message': 'Invalid webhook'}), 404

    strategy_id, user_id, is_active, market_type, default_action, default_order_type, start_time, end_time = row

    if not is_active:
        return jsonify({'status': 'error', 'message': 'Strategy inactive'}), 403

    # Check time window
    now_time = datetime.now().strftime('%H:%M')
    if start_time and end_time:
        if not (start_time <= now_time <= end_time):
            _log_webhook(strategy_id, payload, '', 0, 'rejected', 'Outside time window')
            return jsonify({'status': 'error', 'message': 'Outside trading hours'}), 403

    # Parse symbols from payload
    symbols, action = _parse_webhook_payload(payload, default_action)

    if not symbols:
        _log_webhook(strategy_id, payload, '', 0, 'error', 'No symbols found in payload')
        return jsonify({'status': 'error', 'message': 'No symbols in payload'}), 400

    # Resolve via symbol mappings
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT source_symbol, market, symbol, quantity, execution_mode FROM ml_scanner_symbol_mappings WHERE strategy_id = %s", (strategy_id,))
        mappings = {r[0].upper(): {'market': r[1], 'symbol': r[2], 'quantity': r[3], 'execution_mode': r[4]} for r in cur.fetchall()}

    orders_queued = 0
    processed_symbols = []

    for src_symbol in symbols:
        src_upper = src_symbol.strip().upper()
        mapping = mappings.get(src_upper)
        if not mapping:
            # No mapping — use source symbol directly with default market
            mapping = {'market': market_type, 'symbol': src_upper, 'quantity': 1, 'execution_mode': 'signal'}

        processed_symbols.append(src_upper)

        # Queue to pending_orders
        try:
            with get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO pending_orders (user_id, symbol, signal_type, market_type, order_type, amount, execution_mode, status, payload_json) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)",
                    (user_id, mapping['symbol'], action.lower(), mapping['market'],
                     default_order_type, mapping['quantity'], mapping['execution_mode'],
                     json.dumps({'source': 'scanner', 'strategy_id': strategy_id, 'source_symbol': src_upper}))
                )
                conn.commit()
            orders_queued += 1
        except Exception as e:
            logger.error(f"Scanner order queue error: {e}")

    _log_webhook(strategy_id, payload, ','.join(processed_symbols), orders_queued, 'processed')

    return jsonify({
        'status': 'ok',
        'symbols_processed': len(processed_symbols),
        'orders_queued': orders_queued,
    })


def _parse_webhook_payload(payload: dict, default_action: str):
    """Auto-detect payload format and extract symbols + action."""
    symbols = []
    action = default_action

    # Format 1: ChartInk style
    if 'stocks' in payload:
        stocks_str = payload.get('stocks', '')
        symbols = [s.strip() for s in stocks_str.split(',') if s.strip()]
        action = payload.get('action', default_action)
        return symbols, action

    # Format 2: TradingView single
    if 'symbol' in payload and isinstance(payload['symbol'], str):
        symbols = [payload['symbol']]
        action = payload.get('action', default_action)
        return symbols, action

    # Format 3: Generic list
    if 'symbols' in payload and isinstance(payload['symbols'], list):
        symbols = payload['symbols']
        action = payload.get('action', default_action)
        return symbols, action

    # Fallback: try to find any symbol-like field
    for key in ('ticker', 'stock', 'instrument'):
        if key in payload:
            val = payload[key]
            if isinstance(val, str):
                symbols = [val]
            elif isinstance(val, list):
                symbols = val
            break

    action = payload.get('action', payload.get('side', default_action))
    return symbols, action


def _log_webhook(strategy_id, payload, symbols_processed, orders_queued, status, error=None):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO ml_scanner_webhook_logs (strategy_id, payload, symbols_processed, orders_queued, status, error) "
                "VALUES (%s, %s::jsonb, %s, %s, %s, %s)",
                (strategy_id, json.dumps(payload), symbols_processed, orders_queued, status, error)
            )
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to log webhook: {e}")
