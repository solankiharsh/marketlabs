#!/usr/bin/env python3
"""
Test script for Polymarket Gamma API and parser.
Run from server/: python scripts/test_polymarket_gamma.py

Purpose: Fetch real API response, inspect structure, and run parser with/without
category filter to see why "Parsed 0 markets" occurs.
"""
import json
import sys
import os

# Run from server/ so app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests


def fetch_gamma_events(limit: int = 20):
    """Fetch events from Gamma API (same URL/params as PolymarketDataSource)."""
    url = "https://gamma-api.polymarket.com/events"
    params = {"active": "true", "closed": "false", "limit": limit}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    r = requests.get(url, params=params, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    if isinstance(data, list):
        return data
    return [data]


def main():
    print("=== 1. Fetch Gamma API (limit=20) ===\n")
    try:
        events = fetch_gamma_events(limit=20)
    except Exception as e:
        print(f"Fetch failed: {e}")
        return 1
    print(f"Got {len(events)} events (type={type(events).__name__})\n")

    if not events:
        print("No events returned.")
        return 0

    print("=== 2. Inspect first event structure ===\n")
    first = events[0]
    print(f"First event type: {type(first)}")
    print(f"First event keys: {list(first.keys())}")
    print(f"Has 'markets' key: {'markets' in first}")
    if "markets" in first:
        m = first["markets"]
        print(f"  event['markets'] type: {type(m)}, len: {len(m) if isinstance(m, list) else 'N/A'}")
        if isinstance(m, list) and m:
            print(f"  First market keys: {list(m[0].keys())}")
    print(f"Has 'question': {'question' in first}")
    print(f"Has 'title': {'title' in first}")
    print(f"Has 'slug': {'slug' in first}")
    if first.get("title"):
        print(f"  event['title'] (first 80 chars): {str(first['title'])[:80]}")
    print()

    print("=== 3. Run real parser (no category filter) ===\n")
    try:
        from app.data_sources.polymarket import PolymarketDataSource
        ds = PolymarketDataSource()
        parsed_no_filter = ds._parse_gamma_events(events, category_filter=None)
        print(f"Parsed with category_filter=None: {len(parsed_no_filter)} markets")
        if parsed_no_filter:
            print(f"  First parsed market keys: {list(parsed_no_filter[0].keys())}")
            print(f"  First question: {(parsed_no_filter[0].get('question') or '')[:60]}...")
    except Exception as e:
        print(f"Parser failed (no filter): {e}")
        import traceback
        traceback.print_exc()

    print("\n=== 4. Parser ignores category_filter (caller filters in _fetch_markets_from_api) ===\n")
    try:
        parsed_sports = ds._parse_gamma_events(events, category_filter="sports")
        print(f"Parsed with category_filter='sports' (ignored): {len(parsed_sports)} markets (all from events)")
    except Exception as e:
        print(f"Parser failed (sports): {e}")
        import traceback
        traceback.print_exc()

    print("\n=== 5. Category inference for first 5 event titles ===\n")
    try:
        for i, ev in enumerate(events[:5]):
            title = ev.get("title") or ev.get("question") or "(no title/question)"
            markets = ev.get("markets") or []
            if not markets and (ev.get("question") or ev.get("title") or ev.get("slug")):
                markets = [ev]
            if markets:
                q = markets[0].get("question") or ev.get("question") or markets[0].get("title") or ev.get("title") or ""
                cat = ds._infer_category(q) if q else "N/A"
                print(f"  [{i}] category={cat}  question={str(q)[:55]}...")
            else:
                print(f"  [{i}] (no markets) keys={list(ev.keys())[:8]}")
    except Exception as e:
        print(f"Infer failed: {e}")
        import traceback
        traceback.print_exc()

    print("\n=== 6. Full fetch via public API (category=sports, limit=50) ===\n")
    try:
        markets_sports = ds.get_trending_markets("sports", limit=50)
        print(f"get_trending_markets('sports', 50) returned {len(markets_sports)} markets")
    except Exception as e:
        print(f"get_trending_markets failed: {e}")
        import traceback
        traceback.print_exc()

    print("\n=== Done ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
