"""
MarketLabs Interactive Telegram Bot.

Communicates with the running MarketLabs API via HTTP.
Start with: make dev-telegram-bot (or python telegram_bot.py)
"""
import os
import sys
import logging
import asyncio

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=False)
except Exception:
    pass

# Add project root to path so we can import app modules for chart rendering
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import httpx
from telegram import Update, BotCommand
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("telegram_bot")

# Configuration
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_URL = os.getenv("MARKETLABS_API_URL", "http://localhost:5000")
API_USERNAME = os.getenv("MARKETLABS_USERNAME", "marketlabs")
API_PASSWORD = os.getenv("MARKETLABS_PASSWORD", "marketlabs123")

# Cached JWT token
_jwt_token: str = ""


async def _get_token() -> str:
    """Authenticate with MarketLabs API and return JWT token."""
    global _jwt_token
    if _jwt_token:
        return _jwt_token
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{API_URL}/api/auth/login",
            json={"username": API_USERNAME, "password": API_PASSWORD},
        )
        data = resp.json()
        if data.get("code") == 1 and data.get("data", {}).get("token"):
            _jwt_token = data["data"]["token"]
            return _jwt_token
    raise RuntimeError("Failed to authenticate with MarketLabs API")


async def _api_get(path: str, params: dict = None) -> dict:
    """Make authenticated GET request to MarketLabs API."""
    token = await _get_token()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{API_URL}{path}",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


async def _api_post(path: str, json_data: dict = None) -> dict:
    """Make authenticated POST request to MarketLabs API."""
    token = await _get_token()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{API_URL}{path}",
            json=json_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_symbol(text: str):
    """Parse 'MARKET:SYMBOL' or just 'SYMBOL' (defaults to USStock)."""
    if not text:
        return None, None
    parts = text.strip().split(":")
    if len(parts) == 2:
        return parts[0], parts[1].upper()
    # Default: if it looks like crypto (has /), use Crypto; if .NS suffix, IndianStock
    sym = parts[0].upper()
    if "/" in sym:
        return "Crypto", sym
    if sym.endswith(".NS") or sym.endswith(".BO"):
        return "IndianStock", sym
    return "USStock", sym


# ─── Command Handlers ────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Welcome to MarketLabs Bot!\n\n"
        "Commands:\n"
        "/price <symbol> — Current price\n"
        "/chart <symbol> [timeframe] — Candlestick chart\n"
        "/watchlist — Your watchlist\n"
        "/portfolio — Portfolio summary\n"
        "/analyze <symbol> — AI analysis\n"
        "/alert <symbol> <price> [above|below] — Set price alert\n"
        "/search <keyword> — Search symbols\n"
        "/help — Show this help"
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await cmd_start(update, context)


async def cmd_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /price <symbol>\nExample: /price AAPL")
        return

    market, symbol = _parse_symbol(context.args[0])
    if not symbol:
        await update.message.reply_text("Invalid symbol.")
        return

    import json
    data = await _api_get("/api/market/watchlist/prices", {
        "watchlist": json.dumps([{"market": market, "symbol": symbol}])
    })

    if data.get("code") == 1 and data.get("data"):
        item = data["data"][0]
        price = item.get("price", 0)
        change = item.get("change", 0)
        change_pct = item.get("changePercent", 0)
        arrow = "\u2b06\ufe0f" if change >= 0 else "\u2b07\ufe0f"
        await update.message.reply_text(
            f"{arrow} {market}:{symbol}\n"
            f"Price: {price}\n"
            f"Change: {change:+.2f} ({change_pct:+.2f}%)"
        )
    else:
        await update.message.reply_text(f"Could not fetch price for {symbol}.")


async def cmd_chart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /chart <symbol> [timeframe]\nExample: /chart AAPL 1D")
        return

    market, symbol = _parse_symbol(context.args[0])
    timeframe = context.args[1] if len(context.args) > 1 else "1D"

    if not symbol:
        await update.message.reply_text("Invalid symbol.")
        return

    await update.message.reply_text(f"Generating chart for {market}:{symbol} ({timeframe})...")

    try:
        from app.services.chart_renderer import render_candlestick
        buf = render_candlestick(market, symbol, timeframe)
        await update.message.reply_photo(photo=buf, caption=f"{market}:{symbol} ({timeframe})")
    except Exception as e:
        await update.message.reply_text(f"Failed to generate chart: {e}")


async def cmd_watchlist(update: Update, context: ContextTypes.DEFAULT_TYPE):
    data = await _api_get("/api/market/watchlist/get", {"userid": "1"})

    if data.get("code") == 1 and data.get("data"):
        lines = ["Your Watchlist:\n"]
        for item in data["data"]:
            lines.append(f"  {item['market']}:{item['symbol']}")
        await update.message.reply_text("\n".join(lines))
    else:
        await update.message.reply_text("Watchlist is empty or could not be loaded.")


async def cmd_portfolio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    data = await _api_get("/api/portfolio/summary")

    if data.get("code") == 1 and data.get("data"):
        d = data["data"]
        await update.message.reply_text(
            f"Portfolio Summary:\n"
            f"Total Value: ${d.get('totalValue', 0):,.2f}\n"
            f"Total P/L: ${d.get('totalPnl', 0):,.2f}\n"
            f"Positions: {d.get('positionCount', 0)}"
        )
    else:
        await update.message.reply_text("Could not load portfolio summary.")


async def cmd_analyze(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /analyze <symbol>\nExample: /analyze AAPL")
        return

    market, symbol = _parse_symbol(context.args[0])
    if not symbol:
        await update.message.reply_text("Invalid symbol.")
        return

    await update.message.reply_text(f"Analyzing {market}:{symbol}... (this may take a moment)")

    data = await _api_post("/api/fast-analysis/analyze", {
        "market": market,
        "symbol": symbol,
    })

    if data.get("code") == 1 and data.get("data"):
        result = data["data"]
        text = result.get("analysis") or result.get("summary") or str(result)
        # Telegram message limit is 4096 chars
        if len(text) > 4000:
            text = text[:4000] + "..."
        await update.message.reply_text(text)
    else:
        msg = data.get("msg", "Analysis failed.")
        await update.message.reply_text(f"Analysis failed: {msg}")


async def cmd_alert(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) < 2:
        await update.message.reply_text(
            "Usage: /alert <symbol> <price> [above|below]\n"
            "Example: /alert AAPL 200 above"
        )
        return

    market, symbol = _parse_symbol(context.args[0])
    try:
        target_price = float(context.args[1])
    except ValueError:
        await update.message.reply_text("Invalid price. Must be a number.")
        return

    direction = "above"
    if len(context.args) > 2 and context.args[2].lower() in ("above", "below"):
        direction = context.args[2].lower()

    chat_id = str(update.effective_chat.id)

    # Insert alert directly into DB
    try:
        from app.utils.db_postgres import _get_connection_pool
        pool = _get_connection_pool()
        conn = pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO ml_price_alerts (user_id, telegram_chat_id, market, symbol, target_price, direction) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (1, chat_id, market, symbol, target_price, direction),
            )
            conn.commit()
            cur.close()
        finally:
            pool.putconn(conn)

        arrow = "\u2b06\ufe0f" if direction == "above" else "\u2b07\ufe0f"
        await update.message.reply_text(
            f"{arrow} Alert set!\n"
            f"Symbol: {market}:{symbol}\n"
            f"Target: {target_price} ({direction})\n"
            f"You'll be notified when the price is reached."
        )
    except Exception as e:
        await update.message.reply_text(f"Failed to set alert: {e}")


async def cmd_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /search <keyword>\nExample: /search Apple")
        return

    keyword = " ".join(context.args)
    data = await _api_get("/api/market/symbols/search", {"keyword": keyword})

    if data.get("code") == 1 and data.get("data"):
        results = data["data"][:10]  # Limit to 10
        lines = [f"Search results for '{keyword}':\n"]
        for item in results:
            name = item.get("name", "")
            lines.append(f"  {item['market']}:{item['symbol']}" + (f" — {name}" if name else ""))
        await update.message.reply_text("\n".join(lines))
    else:
        await update.message.reply_text(f"No results for '{keyword}'.")


# ─── Main ─────────────────────────────────────────────────────────────────────

async def post_init(application: Application):
    """Set bot commands for the menu."""
    await application.bot.set_my_commands([
        BotCommand("price", "Get current price"),
        BotCommand("chart", "Candlestick chart"),
        BotCommand("watchlist", "Your watchlist"),
        BotCommand("portfolio", "Portfolio summary"),
        BotCommand("analyze", "AI analysis"),
        BotCommand("alert", "Set price alert"),
        BotCommand("search", "Search symbols"),
        BotCommand("help", "Show help"),
    ])


def main():
    if not BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not set in .env")
        print("Create a bot via @BotFather and add the token to server/.env")
        sys.exit(1)

    logger.info(f"Starting MarketLabs Telegram Bot (API: {API_URL})")

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("price", cmd_price))
    app.add_handler(CommandHandler("chart", cmd_chart))
    app.add_handler(CommandHandler("watchlist", cmd_watchlist))
    app.add_handler(CommandHandler("portfolio", cmd_portfolio))
    app.add_handler(CommandHandler("analyze", cmd_analyze))
    app.add_handler(CommandHandler("alert", cmd_alert))
    app.add_handler(CommandHandler("search", cmd_search))

    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
