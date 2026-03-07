"""
Chart renderer — generates candlestick chart images for Telegram bot.
Uses mplfinance for professional candlestick rendering.
"""
import io
import pandas as pd

from app.data_sources.factory import DataSourceFactory
from app.utils.logger import get_logger

logger = get_logger(__name__)


def render_candlestick(market: str, symbol: str, timeframe: str = "1D", limit: int = 60) -> io.BytesIO:
    """
    Render a candlestick chart as a PNG image.

    Args:
        market: Market type (e.g. 'USStock', 'Crypto')
        symbol: Symbol / stock code
        timeframe: Candle timeframe (e.g. '1D', '4H', '1H')
        limit: Number of candles to show

    Returns:
        BytesIO object containing the PNG image.

    Raises:
        ValueError if no data is available.
    """
    import mplfinance as mpf

    klines = DataSourceFactory.get_kline(market, symbol, timeframe, limit)
    if not klines:
        raise ValueError(f"No kline data for {market}:{symbol}")

    df = pd.DataFrame(klines)

    # Normalize column names to what mplfinance expects
    col_map = {}
    for col in df.columns:
        lc = col.lower()
        if lc in ("open", "high", "low", "close", "volume", "time"):
            col_map[col] = lc.capitalize() if lc != "time" else "time"
    df.rename(columns=col_map, inplace=True)

    # Ensure required columns exist
    for req in ["Open", "High", "Low", "Close"]:
        if req not in df.columns:
            raise ValueError(f"Missing column {req} in kline data")

    # Convert time to datetime index
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"], unit="ms", errors="coerce")
        df.set_index("time", inplace=True)
    elif "Time" in df.columns:
        df["Time"] = pd.to_datetime(df["Time"], unit="ms", errors="coerce")
        df.set_index("Time", inplace=True)

    df.sort_index(inplace=True)

    # Convert to numeric
    for col in ["Open", "High", "Low", "Close"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    if "Volume" in df.columns:
        df["Volume"] = pd.to_numeric(df["Volume"], errors="coerce")

    df.dropna(subset=["Open", "High", "Low", "Close"], inplace=True)

    if df.empty:
        raise ValueError(f"No valid kline data for {market}:{symbol}")

    # Render chart
    has_volume = "Volume" in df.columns and df["Volume"].sum() > 0

    style = mpf.make_mpf_style(
        base_mpf_style="nightclouds",
        marketcolors=mpf.make_marketcolors(
            up="#26a69a", down="#ef5350",
            edge="inherit", wick="inherit",
            volume="in"
        ),
        facecolor="#1e1e2f",
        figcolor="#1e1e2f",
        gridcolor="#2a2a40",
    )

    buf = io.BytesIO()
    mpf.plot(
        df,
        type="candle",
        style=style,
        title=f"\n{market} : {symbol}  ({timeframe})",
        volume=has_volume,
        savefig=dict(fname=buf, dpi=150, bbox_inches="tight"),
        figsize=(10, 6),
    )
    buf.seek(0)
    return buf
