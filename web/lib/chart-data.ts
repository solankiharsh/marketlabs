'use strict';

/**
 * Chart data fetching and transformation for KLineCharts.
 * Uses existing MarketLabs/Zing API (getKlineData, getLatestPrice) when available;
 * spec-style endpoints (GET /api/market/historical/{symbol}?period=, GET /api/market/realtime/{symbol})
 * can be wired via NEXT_PUBLIC_BACKEND_URL if different backend is used.
 */

import { getKlineData, getLatestPrice, normalizeKlines } from '@/lib/api';
import type { KlineRaw } from '@/lib/api';

export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Map spec period (e.g. 1m, 5m, 1H, d, w) to backend timeframe (e.g. 1m, 5m, 15m, 30m, 1H, 4H, 1D, 1W). */
const PERIOD_TO_TIMEFRAME: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  d: '1D',
  w: '1W',
};

/**
 * Transform API OHLCV array (date string or timestamp) to KLineCharts KLineData.
 * Handles both spec format { date, open, high, low, close, volume } and raw tuple format.
 */
export function transformOHLCV(
  apiData: Array<{
    date?: string;
    time?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  } | KlineRaw>
): KLineData[] {
  if (!Array.isArray(apiData)) return [];
  return apiData.map((d) => {
    if (Array.isArray(d)) {
      const t = d[0] ?? 0;
      const ts = t >= 1e12 ? t : t * 1000;
      return {
        timestamp: ts,
        open: d[1] ?? 0,
        high: d[2] ?? 0,
        low: d[3] ?? 0,
        close: d[4] ?? 0,
        volume: d[5],
      };
    }
    const raw = d as { date?: string; time?: number; open: number; high: number; low: number; close: number; volume?: number };
    const ts = raw.time != null
      ? (raw.time >= 1e12 ? raw.time : raw.time * 1000)
      : (raw.date ? new Date(raw.date).getTime() : 0);
    return {
      timestamp: ts,
      open: raw.open,
      high: raw.high,
      low: raw.low,
      close: raw.close,
      volume: raw.volume,
    };
  });
}

/**
 * Fetch OHLCV from backend. Uses existing /api/indicator/kline (market, symbol, timeframe, limit).
 * period: spec style 1m | 5m | 15m | 30m | 1h | 4h | d | w
 */
export async function fetchOHLCV(
  market: string,
  symbol: string,
  period: string,
  limit: number = 300
): Promise<KLineData[]> {
  const timeframe = PERIOD_TO_TIMEFRAME[period.toLowerCase()] ?? period;
  const raw = await getKlineData(market, symbol, timeframe, limit);
  const normalized = normalizeKlines(raw);
  return normalized.map((c) => {
    const ts = c.time >= 1e12 ? c.time : c.time * 1000;
    return {
      timestamp: ts,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    };
  });
}

/**
 * Fetch realtime price for symbol (for current price line and right-side price panel).
 * Uses existing /api/indicator/price.
 */
export async function fetchRealtimePrice(
  market: string,
  symbol: string
): Promise<{ price?: number; change?: number; changePercent?: number; high?: number; low?: number; volume?: number; timestamp?: number }> {
  const data = await getLatestPrice(market, symbol);
  return {
    price: data?.price ?? (data as { close?: number })?.close,
    change: (data as { change?: number })?.change,
    changePercent: (data as { changePercent?: number })?.changePercent ?? (data as { change_percent?: number })?.change_percent,
    high: (data as { high?: number })?.high,
    low: (data as { low?: number })?.low,
    volume: (data as { volume?: number })?.volume,
    timestamp: (data as { timestamp?: number })?.timestamp,
  };
}

/**
 * Fallback mock data when backend is unavailable (e.g. demo).
 * Generates ~200 daily candles with BTC-like price range.
 */
export function generateMockData(count: number = 200): KLineData[] {
  const data: KLineData[] = [];
  let price = 70_000;
  const now = Date.now();
  const dayMs = 86400 * 1000;
  for (let i = count; i > 0; i--) {
    const open = price;
    const close = open + (Math.random() - 0.5) * 3000;
    const high = Math.max(open, close) + Math.random() * 1500;
    const low = Math.min(open, close) - Math.random() * 1500;
    data.push({
      timestamp: now - i * dayMs,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 50000 + 5000),
    });
    price = close;
  }
  return data;
}
