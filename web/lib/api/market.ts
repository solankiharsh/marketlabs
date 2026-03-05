'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface MarketConfig {
  models?: Record<string, string>;
  qdt_cost?: Record<string, unknown>;
}

export interface MarketType {
  value: string;
  i18nKey: string;
}

export interface SymbolSearchItem {
  symbol: string;
  name?: string;
  market?: string;
  [key: string]: unknown;
}

export interface WatchlistItem {
  id: number;
  market: string;
  symbol: string;
  name?: string;
}

export interface WatchlistPriceItem {
  market: string;
  symbol: string;
  price?: number;
  [key: string]: unknown;
}

export async function getMarketConfig(): Promise<MarketConfig> {
  const response = await api.get<ZingResponse<MarketConfig>>('/api/market/config');
  return unwrap(response);
}

export async function getMarketTypes(): Promise<MarketType[]> {
  const response = await api.get<ZingResponse<MarketType[]>>('/api/market/types');
  return unwrap(response);
}

export async function searchSymbols(
  market: string,
  keyword: string,
  limit: number = 20
): Promise<SymbolSearchItem[]> {
  const response = await api.get<ZingResponse<SymbolSearchItem[]>>('/api/market/symbols/search', {
    params: { market, keyword, limit },
  });
  return unwrap(response) ?? [];
}

export async function getHotSymbols(market?: string, limit: number = 10): Promise<SymbolSearchItem[]> {
  const params: Record<string, string | number> = { limit };
  if (market) params.market = market;
  const response = await api.get<ZingResponse<SymbolSearchItem[]>>('/api/market/symbols/hot', {
    params,
  });
  return unwrap(response) ?? [];
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const response = await api.get<ZingResponse<WatchlistItem[]>>('/api/market/watchlist/get');
  return unwrap(response) ?? [];
}

export async function addToWatchlist(market: string, symbol: string, name?: string): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/market/watchlist/add', {
    market,
    symbol,
    name,
  });
  unwrap(response);
}

export async function removeFromWatchlist(market: string, symbol: string): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/market/watchlist/remove', {
    market,
    symbol,
  });
  unwrap(response);
}

export async function getWatchlistPrices(
  watchlist: { market: string; symbol: string }[]
): Promise<WatchlistPriceItem[]> {
  const list = Array.isArray(watchlist) ? watchlist : [];
  const response = await api.get<ZingResponse<WatchlistPriceItem[]>>('/api/market/watchlist/prices', {
    params: { watchlist: JSON.stringify(list) },
  });
  return unwrap(response) ?? [];
}
