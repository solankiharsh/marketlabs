"""
WebSocket event handlers for real-time price streaming.
"""
import jwt
from flask import request
from flask_socketio import join_room, leave_room

from app.config.settings import Config
from app.utils.logger import get_logger

logger = get_logger(__name__)


def register_ws_events(socketio):
    """Register SocketIO event handlers."""

    @socketio.on("connect")
    def handle_connect(auth=None):
        """Authenticate and join user room on connect."""
        token = None

        # Try auth dict first (socket.io v4 style)
        if auth and isinstance(auth, dict):
            token = auth.get("token", "")

        # Fallback: query param
        if not token:
            token = request.args.get("token", "")

        if not token:
            logger.warning("WS connect rejected: no token")
            return False  # reject connection

        try:
            # Use same key as auth (Config.SECRET_KEY) so tokens from login verify here
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id") or payload.get("sub")
            if not user_id:
                return False
            room = f"user_{user_id}"
            join_room(room)
            request.sid_room = room  # stash for disconnect
            logger.info(f"WS connected: user={user_id} sid={request.sid}")
        except jwt.ExpiredSignatureError:
            logger.warning("WS connect rejected: token expired")
            return False
        except jwt.InvalidSignatureError:
            logger.warning("WS connect rejected: invalid token signature (re-login may help)")
            return False
        except Exception as e:
            logger.warning(f"WS connect rejected: {e}")
            return False

    @socketio.on("disconnect")
    def handle_disconnect():
        room = getattr(request, "sid_room", None)
        if room:
            from app.services.price_streamer import unsubscribe
            unsubscribe(room)
            leave_room(room)
        logger.info(f"WS disconnected: sid={request.sid}")

    @socketio.on("subscribe_prices")
    def handle_subscribe(data):
        """Client sends list of {market, symbol} to subscribe to."""
        room = getattr(request, "sid_room", None)
        if not room:
            return
        symbols = data if isinstance(data, list) else data.get("symbols", [])
        from app.services.price_streamer import subscribe
        subscribe(room, symbols)

    @socketio.on("unsubscribe_prices")
    def handle_unsubscribe():
        room = getattr(request, "sid_room", None)
        if not room:
            return
        from app.services.price_streamer import unsubscribe
        unsubscribe(room)
