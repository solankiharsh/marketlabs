'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getWatchlist,
  addToWatchlist as apiAdd,
  removeFromWatchlist as apiRemove,
  getWatchlistPrices,
} from '@/lib/api';
import type { WatchlistItem, WatchlistPriceItem } from '@/lib/api';

const LOCAL_KEY = 'indicator_analysis_watchlist';

export interface WatchlistEntry {
  market: string;
  symbol: string;
  name?: string;
  price?: number;
}

function loadLocal(): WatchlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    if (s) return JSON.parse(s) as WatchlistEntry[];
  } catch {}
  return [];
}

function saveLocal(entries: WatchlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch {}
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(loadLocal);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const list = await getWatchlist();
      if (Array.isArray(list) && list.length > 0) {
        const next: WatchlistEntry[] = list.map((i) => ({
          market: i.market,
          symbol: i.symbol,
          name: i.name,
        }));
        setEntries(next);
        saveLocal(next);
      }
    } catch {
      // keep localStorage fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (entries.length === 0) {
      setPrices({});
      return;
    }
    const list = entries.map((e) => ({ market: e.market, symbol: e.symbol }));
    getWatchlistPrices(list)
      .then((res: WatchlistPriceItem[]) => {
        const map: Record<string, number> = {};
        res.forEach((r) => {
          const k = `${r.market}:${r.symbol}`;
          if (r.price != null) map[k] = r.price;
        });
        setPrices(map);
      })
      .catch(() => {});
  }, [entries]);

  const add = useCallback(
    async (market: string, symbol: string, name?: string) => {
      const entry: WatchlistEntry = { market, symbol, name };
      setEntries((prev) => {
        const key = `${market}:${symbol}`;
        if (prev.some((e) => `${e.market}:${e.symbol}` === key)) return prev;
        const next = [...prev, entry];
        saveLocal(next);
        return next;
      });
      try {
        await apiAdd(market, symbol, name);
      } catch {}
    },
    []
  );

  const remove = useCallback(
    async (market: string, symbol: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => !(e.market === market && e.symbol === symbol));
        saveLocal(next);
        return next;
      });
      try {
        await apiRemove(market, symbol);
      } catch {}
    },
    []
  );

  const getPrice = useCallback(
    (market: string, symbol: string): number | undefined => prices[`${market}:${symbol}`],
    [prices]
  );

  return { entries, loading, add, remove, getPrice, refresh: fetchList };
}
