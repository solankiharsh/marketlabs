"""
Basket Orders API — Execute multiple orders atomically.

Supports multi-leg orders for pair trades, hedging, rebalancing.
Each order in the basket becomes a pending_order for the order worker.
"""
import json
import traceback
from flask import Blueprint, request, jsonify, g

from app.utils.auth import login_required
from app.utils.db import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)

basket_bp = Blueprint('basket', __name__)


@basket_bp.route('/execute', methods=['POST'])
@login_required
def execute_basket():
    """
    Execute a basket of orders.

    Request body:
    {
        "label": "My basket trade",          (optional)
        "execution_mode": "live" | "signal", (default: signal)
        "orders": [
            {
                "market": "USStock",
                "symbol": "AAPL",
                "side": "buy",
                "quantity": 10,
                "price": null,           (null = market order)
                "order_type": "market"   (optional: market | limit)
            },
            {
                "market": "USStock",
                "symbol": "MSFT",
                "side": "sell",
                "quantity": 5,
                "price": 400.00,
                "order_type": "limit"
            }
        ]
    }
    """
    try:
        user_id = g.user_id
        data = request.get_json() or {}
        orders = data.get('orders') or []
        label = (data.get('label') or '').strip()
        execution_mode = (data.get('execution_mode') or 'signal').strip().lower()

        if not orders or not isinstance(orders, list):
            return jsonify({'code': 0, 'msg': 'No orders provided', 'data': None}), 400

        if len(orders) > 20:
            return jsonify({'code': 0, 'msg': 'Maximum 20 orders per basket', 'data': None}), 400

        # Validate all orders first
        validated = []
        for i, order in enumerate(orders):
            market = (order.get('market') or '').strip()
            symbol = (order.get('symbol') or '').strip().upper()
            side = (order.get('side') or '').strip().lower()
            quantity = order.get('quantity')
            price = order.get('price')
            order_type = (order.get('order_type') or ('limit' if price else 'market')).strip().lower()

            if not market or not symbol:
                return jsonify({'code': 0, 'msg': f'Order {i+1}: missing market or symbol'}), 400
            if side not in ('buy', 'sell'):
                return jsonify({'code': 0, 'msg': f'Order {i+1}: side must be buy or sell'}), 400
            if not quantity or float(quantity) <= 0:
                return jsonify({'code': 0, 'msg': f'Order {i+1}: quantity must be positive'}), 400

            # Map side to signal_type for pending_orders table
            signal_type = 'open_long' if side == 'buy' else 'open_short'

            validated.append({
                'market': market,
                'symbol': symbol,
                'signal_type': signal_type,
                'amount': float(quantity),
                'price': float(price) if price else 0,
                'order_type': order_type,
                'execution_mode': execution_mode,
            })

        # Insert all orders in a single transaction
        created_ids = []
        with get_db_connection() as db:
            cur = db.cursor()
            for v in validated:
                cur.execute(
                    """
                    INSERT INTO pending_orders
                    (user_id, symbol, signal_type, market_type, order_type, amount, price,
                     execution_mode, status, dispatch_note)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                    RETURNING id
                    """,
                    (
                        user_id, v['symbol'], v['signal_type'], v['market'],
                        v['order_type'], v['amount'], v['price'],
                        v['execution_mode'],
                        f"basket:{label}" if label else "basket",
                    )
                )
                row = cur.fetchone()
                if row:
                    created_ids.append(row['id'] if isinstance(row, dict) else row[0])
            db.commit()
            cur.close()

        logger.info(f"Basket order created: {len(created_ids)} orders for user {user_id} (label={label})")

        return jsonify({
            'code': 1,
            'msg': f'{len(created_ids)} orders queued',
            'data': {
                'order_ids': created_ids,
                'count': len(created_ids),
                'label': label,
            }
        })
    except Exception as e:
        logger.error(f"execute_basket failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'code': 0, 'msg': str(e)}), 500
