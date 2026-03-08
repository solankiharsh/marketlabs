"""
Market hours utility — knows trading sessions for each market type.
Used to suppress false stale-data warnings and optimize cache TTLs.
"""
from datetime import datetime, time as dtime
from zoneinfo import ZoneInfo


MARKET_SESSIONS = {
    'Crypto': {'24_7': True},
    'USStock': {
        'tz': 'US/Eastern',
        'open': (9, 30),
        'close': (16, 0),
        'days': [0, 1, 2, 3, 4],  # Mon-Fri
    },
    'IndianStock': {
        'tz': 'Asia/Kolkata',
        'open': (9, 15),
        'close': (15, 30),
        'days': [0, 1, 2, 3, 4],
    },
    'Forex': {
        # Forex trades Sun 17:00 ET to Fri 17:00 ET
        'tz': 'US/Eastern',
        'open_day': 6,   # Sunday
        'open_time': (17, 0),
        'close_day': 4,  # Friday
        'close_time': (17, 0),
    },
    'Futures': {'24_7': True},
}


def is_market_open(market: str) -> bool:
    """Check if the given market is currently in trading hours."""
    session = MARKET_SESSIONS.get(market)
    if not session:
        return True  # unknown market, assume open

    if session.get('24_7'):
        return True

    tz = ZoneInfo(session['tz'])
    now = datetime.now(tz)

    # Forex has a weekly window rather than daily open/close
    if 'open_day' in session:
        return _is_forex_open(now, session)

    # Standard daily session (USStock, IndianStock)
    if now.weekday() not in session['days']:
        return False

    market_open = dtime(*session['open'])
    market_close = dtime(*session['close'])
    return market_open <= now.time() <= market_close


def get_market_status(market: str) -> dict:
    """
    Return market status dict:
      is_open: bool
      market: str (echoed back)
    """
    return {
        'is_open': is_market_open(market),
        'market': market,
    }


def _is_forex_open(now: datetime, session: dict) -> bool:
    """Forex trades Sun 17:00 ET through Fri 17:00 ET."""
    weekday = now.weekday()
    current = now.time()
    open_time = dtime(*session['open_time'])
    close_time = dtime(*session['close_time'])

    # Saturday — always closed
    if weekday == 5:
        return False
    # Sunday — open only after 17:00 ET
    if weekday == 6:
        return current >= open_time
    # Friday — open only before 17:00 ET
    if weekday == 4:
        return current <= close_time
    # Mon-Thu — open all day
    return True
