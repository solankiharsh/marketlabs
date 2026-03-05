'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

/** Single item from the opportunities radar (Crypto, USStock, Forex). */
export interface Opportunity {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  change_7d?: number;
  signal?: string;
  strength?: string;
  reason?: string;
  /** English reason text; prefer this for display when present. */
  reason_en?: string;
  impact?: string;
  market?: string;
  timestamp?: number;
  market_id?: string;
  ai_analysis?: Record<string, unknown>;
}

export async function getGlobalOverview(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/global-market/overview'
  );
  return unwrap(response) ?? {};
}

export async function getGlobalHeatmap(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/global-market/heatmap'
  );
  return unwrap(response) ?? {};
}

export async function getGlobalNews(lang?: string): Promise<unknown[]> {
  const response = await api.get<ZingResponse<unknown[]>>('/api/global-market/news', {
    params: lang ? { lang } : {},
  });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function getEconomicCalendar(): Promise<unknown[]> {
  const response = await api.get<ZingResponse<unknown[]>>('/api/global-market/calendar');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

/** Sentiment indicator with value, change, level, and optional English interpretation */
export interface SentimentIndicator {
  value?: number;
  change?: number;
  level?: string;
  interpretation?: string;
  interpretation_en?: string;
  signal?: string;
  classification?: string;
  source?: string;
  timestamp?: number;
  /** VIX term: vix, vix3m */
  vix?: number;
  vix3m?: number;
  /** Yield curve: spread, yield_10y, yield_2y */
  spread?: number;
  yield_10y?: number;
  yield_2y?: number;
  [key: string]: unknown;
}

/** Full sentiment API response shape */
export interface MarketSentimentData {
  timestamp?: number;
  dxy?: SentimentIndicator;
  fear_greed?: SentimentIndicator;
  gvz?: SentimentIndicator;
  vix?: SentimentIndicator;
  vix_term?: SentimentIndicator;
  vxn?: SentimentIndicator;
  yield_curve?: SentimentIndicator;
  [key: string]: unknown;
}

export async function getMarketSentiment(cacheBust?: number): Promise<MarketSentimentData> {
  const params = cacheBust != null ? { _t: cacheBust } : {};
  const response = await api.get<ZingResponse<MarketSentimentData>>(
    '/api/global-market/sentiment',
    { params }
  );
  return (unwrap(response) ?? {}) as MarketSentimentData;
}

export async function getOpportunities(force?: boolean): Promise<Opportunity[]> {
  const params: Record<string, boolean> = {};
  if (force) params.force = true;
  const response = await api.get<ZingResponse<Opportunity[]>>(
    '/api/global-market/opportunities',
    { params }
  );
  const data = unwrap(response);
  return Array.isArray(data) ? (data as Opportunity[]) : [];
}

export async function refreshGlobalData(): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/global-market/refresh');
  unwrap(response);
}
