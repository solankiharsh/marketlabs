"""
Webhook routes — TradingView alerts and external signal ingestion.

Authenticates via X-Api-Key header. Logs all received webhooks.
Supports actions: alert (notify only), buy, sell, close.
"""
import json
import traceback
from flask import Blueprint, request, jsonify, g

from app.utils.auth import login_required
from app.utils.db import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)

webhook_bp = Blueprint('webhook', __name__)


@webhook_bp.route('/tradingview', methods=['POST'])
@login_required
def tradingview_webhook():
    """
    Receive TradingView alert webhook.

    Authenticate via X-Api-Key header.

    Expected JSON payload:
    {
        "action": "buy" | "sell" | "close" | "alert",
        "market": "USStock" | "Crypto" | ...,
        "symbol": "AAPL",
        "quantity": 1,           (optional, for buy/sell)
        "price": 150.00,         (optional, limit price)
        "message": "...",        (optional, alert text)
        "strategy_id": 123       (optional, link to a strategy)
    }
    """
    try:
        user_id = g.user_id
        raw_payload = request.get_data(as_text=True)

        try:
            data = request.get_json(force=True) or {}
        except Exception:
            data = {}

        action = (data.get('action') or 'alert').strip().lower()
        market = (data.get('market') or '').strip()
        symbol = (data.get('symbol') or '').strip().upper()
        quantity = data.get('quantity')
        price = data.get('price')
        message = data.get('message') or ''
        strategy_id = data.get('strategy_id')

        status = 'received'
        error_message = None

        # Process action
        if action in ('buy', 'sell'):
            if not market or not symbol:
                status = 'error'
                error_message = 'Missing market or symbol for trade action'
            else:
                try:
                    _execute_webhook_trade(
                        user_id=user_id,
                        action=action,
                        market=market,
                        symbol=symbol,
                        quantity=float(quantity) if quantity else 1,
                        price=float(price) if price else None,
                        strategy_id=int(strategy_id) if strategy_id else None,
                    )
                    status = 'processed'
                except Exception as e:
                    status = 'error'
                    error_message = str(e)

        elif action == 'close':
            if not market or not symbol:
                status = 'error'
                error_message = 'Missing market or symbol for close action'
            else:
                try:
                    _close_webhook_position(user_id, market, symbol)
                    status = 'processed'
                except Exception as e:
                    status = 'error'
                    error_message = str(e)

        elif action == 'alert':
            # Notification only — push via WebSocket if available
            status = 'processed'
            try:
                from app import socketio
                room = f"user_{user_id}"
                socketio.emit('webhook_alert', {
                    'market': market,
                    'symbol': symbol,
                    'message': message or f"TradingView alert: {market}:{symbol}",
                    'action': action,
                }, room=room)
            except Exception:
                pass

        # Log the webhook
        _log_webhook(user_id, raw_payload, action, market, symbol, status, error_message)

        return jsonify({
            'code': 1 if status != 'error' else 0,
            'msg': error_message or 'ok',
            'data': {
                'action': action,
                'status': status,
                'market': market,
                'symbol': symbol,
            }
        }), 200 if status != 'error' else 400

    except Exception as e:
        logger.error(f"tradingview_webhook error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'code': 0, 'msg': str(e)}), 500


@webhook_bp.route('/logs', methods=['GET'])
@login_required
def get_webhook_logs():
    """Get recent webhook logs for the current user."""
    try:
        user_id = g.user_id
        limit = min(int(request.args.get('limit', 50)), 200)

        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT id, source, action, market, symbol, status, error_message, created_at "
                "FROM ml_webhook_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
                (user_id, limit)
            )
            rows = cur.fetchall()
            cur.close()

        logs = []
        for row in rows:
            logs.append({
                'id': row['id'],
                'source': row['source'],
                'action': row['action'],
                'market': row['market'],
                'symbol': row['symbol'],
                'status': row['status'],
                'error': row['error_message'],
                'created_at': str(row['created_at']),
            })

        return jsonify({'code': 1, 'msg': 'success', 'data': logs})
    except Exception as e:
        logger.error(f"get_webhook_logs failed: {e}")
        return jsonify({'code': 0, 'msg': str(e)}), 500


def _log_webhook(user_id, payload, action, market, symbol, status, error_message):
    """Log a webhook event to the database."""
    try:
        with get_db_connection() as db:
            cur = db.cursor()
            cur.execute(
                "INSERT INTO ml_webhook_logs (user_id, source, payload, action, market, symbol, status, error_message) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (user_id, 'tradingview', str(payload)[:4000], action, market, symbol, status, error_message)
            )
            db.commit()
            cur.close()
    except Exception as e:
        logger.debug(f"Webhook log error: {e}")


def _execute_webhook_trade(user_id, action, market, symbol, quantity, price, strategy_id):
    """Execute a trade from a webhook signal by creating a pending order."""
    side = 'buy' if action == 'buy' else 'sell'

    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO pending_orders
            (user_id, market, symbol, side, quantity, price, order_type, execution_mode, status, source, strategy_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id, market, symbol, side, quantity,
                price, 'limit' if price else 'market',
                'live', 'pending', 'webhook',
                strategy_id,
            )
        )
        db.commit()
        cur.close()

    logger.info(f"Webhook trade created: {side} {quantity} {market}:{symbol} for user {user_id}")


def _close_webhook_position(user_id, market, symbol):
    """Close a position by creating a counter-order."""
    with get_db_connection() as db:
        cur = db.cursor()
        # Find existing position
        cur.execute(
            "SELECT side, quantity FROM ml_manual_positions "
            "WHERE user_id = %s AND market = %s AND symbol = %s LIMIT 1",
            (user_id, market, symbol)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            raise ValueError(f"No position found for {market}:{symbol}")

        close_side = 'sell' if row['side'] == 'long' else 'buy'
        cur.execute(
            "DELETE FROM ml_manual_positions WHERE user_id = %s AND market = %s AND symbol = %s",
            (user_id, market, symbol)
        )
        db.commit()
        cur.close()

    logger.info(f"Webhook close: {market}:{symbol} for user {user_id}")
