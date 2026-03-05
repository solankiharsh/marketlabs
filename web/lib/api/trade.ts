'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function placeOrder(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/quick-trade/place-order',
    data
  );
  return unwrap(response) ?? {};
}

export async function closePosition(data: {
  credential_id: number;
  symbol: string;
  market_type?: string;
}): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/quick-trade/close-position',
    data
  );
  return unwrap(response) ?? {};
}

export async function getBalance(credentialId: number, marketType: string): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/quick-trade/balance',
    { params: { credentialId, marketType } }
  );
  return unwrap(response) ?? {};
}

export async function getQuickTradePosition(
  credentialId: number,
  symbol: string,
  marketType: string
): Promise<Record<string, unknown> | null> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/quick-trade/position',
    { params: { credentialId, symbol, marketType } }
  );
  return unwrap(response) ?? null;
}

export async function getTradeHistory(limit?: number, offset?: number): Promise<unknown[]> {
  const params: Record<string, number> = {};
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const response = await api.get<ZingResponse<unknown[]>>('/api/quick-trade/history', { params });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}
