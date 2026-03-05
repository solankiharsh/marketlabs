'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export type KlineRaw = [number, number, number, number, number, number?] | {
  time?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function normalizeKlines(klines: KlineRaw[]): OHLCVCandle[] {
  if (!Array.isArray(klines)) return [];
  return klines.map((k) => {
    if (Array.isArray(k)) {
      return {
        time: k[0],
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5],
      };
    }
    return {
      time: (k as OHLCVCandle).time ?? 0,
      open: (k as OHLCVCandle).open ?? 0,
      high: (k as OHLCVCandle).high ?? 0,
      low: (k as OHLCVCandle).low ?? 0,
      close: (k as OHLCVCandle).close ?? 0,
      volume: (k as OHLCVCandle).volume,
    };
  });
}

/** Backend expects: Crypto, USStock, Forex, Futures */
const NORMALIZE_MARKET: Record<string, string> = {
  Crypto: 'Crypto',
  Cryptocurrency: 'Crypto',
  USStock: 'USStock',
  Stocks: 'USStock',
  Forex: 'Forex',
  Futures: 'Futures',
};

export async function getKlineData(
  market: string,
  symbol: string,
  timeframe: string = '1D',
  limit: number = 300,
  beforeTime?: number
): Promise<KlineRaw[]> {
  const normalizedMarket = NORMALIZE_MARKET[market] ?? market;
  const params: Record<string, string | number> = { market: normalizedMarket, symbol, timeframe, limit };
  if (beforeTime != null) params.before_time = beforeTime;
  const response = await api.get<ZingResponse<KlineRaw[]>>('/api/indicator/kline', { params });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function getLatestPrice(
  market: string,
  symbol: string
): Promise<{ price?: number; [key: string]: unknown }> {
  const normalizedMarket = NORMALIZE_MARKET[market] ?? market;
  const response = await api.get<ZingResponse<{ price?: number; [key: string]: unknown }>>(
    '/api/indicator/price',
    { params: { market: normalizedMarket, symbol } }
  );
  return unwrap(response) ?? {};
}
