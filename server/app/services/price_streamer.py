"""
Real-time price streaming service via SocketIO.

Runs a background thread that fetches prices for actively subscribed symbols
and pushes updates to connected clients every ~5 seconds.
"""
import time
import threading
from typing import Dict, Set, Tuple

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Global subscription registry: room_id -> set of (market, symbol) tuples
_subscriptions: Dict[str, Set[Tuple[str, str]]] = {}
_lock = threading.Lock()

# Reference to the SocketIO instance (set by init_streamer)
_socketio = None
_streamer_thread = None


def init_streamer(socketio):
    """Initialize the price streamer with a SocketIO instance and start the background thread."""
    global _socketio, _streamer_thread
    _socketio = socketio

    if _streamer_thread is not None and _streamer_thread.is_alive():
        return

    _streamer_thread = _socketio.start_background_task(_stream_loop)
    logger.info("Price streamer background thread started")


def subscribe(room: str, symbols: list):
    """Subscribe a room to a list of {market, symbol} dicts."""
    with _lock:
        if room not in _subscriptions:
            _subscriptions[room] = set()
        for s in symbols:
            market = s.get("market", "")
            symbol = s.get("symbol", "")
            if market and symbol:
                _subscriptions[room].add((market, symbol))
    logger.info(f"Room {room} subscribed to {len(symbols)} symbols")


def unsubscribe(room: str):
    """Remove all subscriptions for a room."""
    with _lock:
        _subscriptions.pop(room, None)
    logger.info(f"Room {room} unsubscribed")


def _get_all_active_symbols() -> Set[Tuple[str, str]]:
    """Get the union of all symbols currently subscribed across all rooms."""
    with _lock:
        result = set()
        for syms in _subscriptions.values():
            result.update(syms)
        return result


def _stream_loop():
    """Background loop: fetch prices for all active symbols and emit to subscribers."""
    from app.data_sources.factory import DataSourceFactory

    logger.info("Price streamer loop running")
    while True:
        try:
            active_symbols = _get_all_active_symbols()
            if not active_symbols:
                _socketio.sleep(5)
                continue

            # Fetch prices for all active symbols
            price_map: Dict[Tuple[str, str], dict] = {}
            for market, symbol in active_symbols:
                try:
                    ticker = DataSourceFactory.get_ticker(market, symbol)
                    price_map[(market, symbol)] = {
                        "market": market,
                        "symbol": symbol,
                        "price": ticker.get("last", 0),
                        "change": ticker.get("change", 0),
                        "changePercent": ticker.get("changePercent", 0),
                    }
                except Exception as e:
                    logger.debug(f"Streamer tick error {market}:{symbol}: {e}")

            # Emit to each room only the symbols it cares about
            with _lock:
                rooms_snapshot = dict(_subscriptions)

            for room, syms in rooms_snapshot.items():
                updates = [price_map[key] for key in syms if key in price_map]
                if updates:
                    _socketio.emit("price_update", updates, room=room)

            # Check price alerts
            _check_price_alerts(price_map)

            # Check SL/TP/Trailing Stop on portfolio positions
            _check_position_sl_tp(price_map)

        except Exception as e:
            logger.error(f"Price streamer error: {e}")

        _socketio.sleep(5)


def _check_price_alerts(price_map: Dict[Tuple[str, str], dict]):
    """Check if any price alerts have been triggered and send notifications."""
    try:
        from app.utils.db_postgres import _get_connection_pool
        pool = _get_connection_pool()
        conn = pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, user_id, telegram_chat_id, market, symbol, target_price, direction "
                "FROM ml_price_alerts WHERE is_triggered = FALSE"
            )
            alerts = cur.fetchall()
            if not alerts:
                return

            triggered_ids = []
            for alert_id, user_id, chat_id, market, symbol, target_price, direction in alerts:
                key = (market, symbol)
                if key not in price_map:
                    continue
                current_price = price_map[key].get("price", 0)
                if not current_price:
                    continue

                triggered = False
                if direction == "above" and current_price >= target_price:
                    triggered = True
                elif direction == "below" and current_price <= target_price:
                    triggered = True

                if triggered:
                    triggered_ids.append(alert_id)
                    # Send Telegram notification if chat_id is set
                    if chat_id:
                        _send_alert_notification(chat_id, market, symbol, current_price, target_price, direction)

            if triggered_ids:
                cur.execute(
                    "UPDATE ml_price_alerts SET is_triggered = TRUE, triggered_at = NOW() "
                    "WHERE id = ANY(%s)",
                    (triggered_ids,)
                )
                conn.commit()
                logger.info(f"Triggered {len(triggered_ids)} price alerts")
        finally:
            pool.putconn(conn)
    except Exception as e:
        # Table may not exist yet — that's fine
        if "ml_price_alerts" in str(e) and "does not exist" in str(e):
            return
        logger.debug(f"Alert check error: {e}")


def _send_alert_notification(chat_id: str, market: str, symbol: str, current_price: float, target_price: float, direction: str):
    """Send a Telegram notification for a triggered price alert."""
    import os
    import requests as req

    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        return

    arrow = "\u2b06\ufe0f" if direction == "above" else "\u2b07\ufe0f"
    text = (
        f"{arrow} Price Alert Triggered!\n\n"
        f"Symbol: {market}:{symbol}\n"
        f"Target: {target_price} ({direction})\n"
        f"Current: {current_price}"
    )
    try:
        req.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except Exception as e:
        logger.debug(f"Alert Telegram send error: {e}")


def _check_position_sl_tp(price_map: Dict[Tuple[str, str], dict]):
    """Check SL/TP/Trailing Stop on portfolio positions and emit notifications."""
    try:
        from app.utils.db_postgres import _get_connection_pool
        pool = _get_connection_pool()
        conn = pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, user_id, market, symbol, side, entry_price, stop_loss, take_profit, "
                "trailing_stop_pct, trailing_stop_highest "
                "FROM ml_manual_positions "
                "WHERE (stop_loss IS NOT NULL OR take_profit IS NOT NULL OR trailing_stop_pct IS NOT NULL)"
            )
            positions = cur.fetchall()
            if not positions:
                return

            notifications = []
            for pos_id, user_id, market, symbol, side, entry_price, sl, tp, tsl_pct, tsl_highest in positions:
                key = (market, symbol)
                if key not in price_map:
                    continue
                current_price = price_map[key].get("price", 0)
                if not current_price:
                    continue

                is_long = (side or "long") == "long"

                # Trailing stop: update highest price and check
                if tsl_pct and tsl_pct > 0:
                    track_price = current_price if is_long else current_price
                    new_highest = max(tsl_highest or entry_price, current_price) if is_long else min(tsl_highest or entry_price, current_price)
                    if new_highest != tsl_highest:
                        cur.execute(
                            "UPDATE ml_manual_positions SET trailing_stop_highest = %s WHERE id = %s",
                            (new_highest, pos_id)
                        )

                    if is_long and new_highest > 0:
                        tsl_price = new_highest * (1 - tsl_pct / 100.0)
                        if current_price <= tsl_price:
                            notifications.append((user_id, f"Trailing Stop triggered: {market}:{symbol} dropped to {current_price:.4f} (trail from {new_highest:.4f}, -{tsl_pct}%)"))
                    elif not is_long and new_highest > 0:
                        tsl_price = new_highest * (1 + tsl_pct / 100.0)
                        if current_price >= tsl_price:
                            notifications.append((user_id, f"Trailing Stop triggered: {market}:{symbol} rose to {current_price:.4f} (trail from {new_highest:.4f}, +{tsl_pct}%)"))

                # Stop loss check
                if sl and sl > 0:
                    if is_long and current_price <= sl:
                        notifications.append((user_id, f"Stop Loss hit: {market}:{symbol} at {current_price:.4f} (SL: {sl})"))
                    elif not is_long and current_price >= sl:
                        notifications.append((user_id, f"Stop Loss hit: {market}:{symbol} at {current_price:.4f} (SL: {sl})"))

                # Take profit check
                if tp and tp > 0:
                    if is_long and current_price >= tp:
                        notifications.append((user_id, f"Take Profit hit: {market}:{symbol} at {current_price:.4f} (TP: {tp})"))
                    elif not is_long and current_price <= tp:
                        notifications.append((user_id, f"Take Profit hit: {market}:{symbol} at {current_price:.4f} (TP: {tp})"))

            conn.commit()

            # Emit via WebSocket
            for user_id, msg in notifications:
                room = f"user_{user_id}"
                _socketio.emit("position_alert", {"message": msg}, room=room)
                logger.info(f"Position alert: {msg}")

        finally:
            pool.putconn(conn)
    except Exception as e:
        if "does not exist" in str(e):
            return
        logger.debug(f"SL/TP check error: {e}")
