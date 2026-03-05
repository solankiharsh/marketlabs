"""
Backfill qd_strategy_trades rows where price/amount/value are 0.

Background:
- For some exchanges/order types, the executor may report filled_price/filled_amount as 0
  while the exchange actually filled the order, so trade discipline/history shows zeros.
- OrderProcessor now has fetch_order/fetch_my_trades backfill logic to avoid new data having this issue.
- For historical dirty data, use qd_pending_orders (executed_at, filled_price, filled_amount, fee) for approximate matching and backfill.

Usage:
  python server/scripts/backfill_zero_trades.py --strategy-id 43 --since 2025-12-24 --until 2025-12-25
  python server/scripts/backfill_zero_trades.py --strategy-id 43 --since 2025-12-24 --until 2025-12-25 --apply

Notes:
- Script matches qd_pending_orders by (strategy_id, symbol, type) and time window (default ±600s).
- If one trade matches multiple candidate orders, the one with executed_at closest to the trade is chosen; ties are skipped.
"""

from __future__ import annotations

import argparse
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, List

from app.utils.db import get_db_connection


def _parse_date_to_ts(s: str) -> int:
    s = (s or "").strip()
    # Supports YYYY-MM-DD or YYYY/MM/DD
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            # Server typically writes int(time.time()) in local time; parse as local time here
            return int(dt.replace(tzinfo=None).timestamp())
        except Exception:
            pass
    raise ValueError(f"Could not parse date: {s}")


def _fetch_bad_trades(strategy_id: int, since_ts: int, until_ts: int, limit: int) -> List[Dict[str, Any]]:
    with get_db_connection() as db:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, strategy_id, symbol, type, price, amount, value, commission, profit, created_at
            FROM qd_strategy_trades
            WHERE strategy_id = %s
              AND created_at BETWEEN %s AND %s
              AND (
                    price = 0
                 OR amount = 0
                 OR value = 0
              )
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (strategy_id, since_ts, until_ts, limit),
        )
        rows = cursor.fetchall() or []
        cursor.close()
        return rows


def _find_best_order_match(
    strategy_id: int,
    symbol: str,
    signal_type: str,
    trade_ts: int,
    window_sec: int,
) -> Optional[Dict[str, Any]]:
    lo = int(trade_ts) - int(window_sec)
    hi = int(trade_ts) + int(window_sec)
    with get_db_connection() as db:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, symbol, signal_type, status, order_id, filled_amount, filled_price, fee, executed_at, created_at
            FROM qd_pending_orders
            WHERE strategy_id = %s
              AND symbol = %s
              AND signal_type = %s
              AND status = 'completed'
              AND executed_at IS NOT NULL
              AND executed_at BETWEEN %s AND %s
              AND filled_amount > 0
              AND filled_price > 0
            ORDER BY ABS(executed_at - %s) ASC
            LIMIT 3
            """,
            (strategy_id, symbol, signal_type, lo, hi, trade_ts),
        )
        cand = cursor.fetchall() or []
        cursor.close()
        if not cand:
            return None
        # If the closest match is tied (e.g. same executed_at), treat as non-unique and skip to avoid wrong backfill
        if len(cand) >= 2 and abs(int(cand[0]["executed_at"]) - trade_ts) == abs(int(cand[1]["executed_at"]) - trade_ts):
            return None
        return cand[0]


def _update_trade(
    trade_id: int,
    price: float,
    amount: float,
    value: float,
    commission: Optional[float],
    apply: bool,
) -> None:
    if not apply:
        return
    with get_db_connection() as db:
        cursor = db.cursor()
        cursor.execute(
            """
            UPDATE qd_strategy_trades
            SET price=%s, amount=%s, value=%s, commission=%s
            WHERE id=%s
            """,
            (price, amount, value, commission, trade_id),
        )
        db.commit()
        cursor.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strategy-id", type=int, required=True)
    ap.add_argument("--since", type=str, required=True, help="YYYY-MM-DD or YYYY/MM/DD")
    ap.add_argument("--until", type=str, required=True, help="YYYY-MM-DD or YYYY/MM/DD")
    ap.add_argument("--window-sec", type=int, default=600, help="Match window in seconds (default ±600)")
    ap.add_argument("--limit", type=int, default=500, help="Max number of trades to process")
    ap.add_argument("--apply", action="store_true", help="Write to DB; default is dry-run (print only)")
    args = ap.parse_args()

    since_ts = _parse_date_to_ts(args.since)
    until_ts = _parse_date_to_ts(args.until) + 24 * 3600 - 1 if len(args.until.strip()) <= 10 else _parse_date_to_ts(args.until)

    trades = _fetch_bad_trades(args.strategy_id, since_ts, until_ts, args.limit)
    print(f"[scan] bad_trades={len(trades)} strategy_id={args.strategy_id} since={since_ts} until={until_ts} apply={args.apply}")

    fixed = 0
    skipped = 0
    for t in trades:
        tid = int(t["id"])
        symbol = t["symbol"]
        sig = t["type"]
        ts = int(t["created_at"] or 0)
        m = _find_best_order_match(args.strategy_id, symbol, sig, ts, args.window_sec)
        if not m:
            skipped += 1
            print(f"[skip] trade_id={tid} {symbol} {sig} ts={ts} reason=no_unique_match")
            continue

        price = float(m["filled_price"])
        amount = float(m["filled_amount"])
        value = float(price * amount)
        fee = m.get("fee")
        commission = float(fee) if fee is not None else None

        print(
            f"[fix] trade_id={tid} {symbol} {sig} ts={ts} -> "
            f"price={price} amount={amount} value={value} commission={commission} "
            f"(matched pending_id={m['id']} ex_order_id={m.get('order_id')}, executed_at={m.get('executed_at')})"
        )
        _update_trade(tid, price, amount, value, commission, args.apply)
        fixed += 1

    print(f"[done] fixed={fixed} skipped={skipped} apply={args.apply}")


if __name__ == "__main__":
    main()


