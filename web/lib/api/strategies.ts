'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface StrategyItem {
  id: number;
  name?: string;
  symbol?: string;
  market?: string;
  status?: string;
  pnl?: number;
  [key: string]: unknown;
}

export async function getStrategies(): Promise<StrategyItem[]> {
  const response = await api.get<ZingResponse<{ strategies: StrategyItem[] }>>('/api/strategies');
  const data = unwrap(response);
  return (data?.strategies ?? []) as StrategyItem[];
}

export async function getStrategyDetail(id: number): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>('/api/strategies/detail', {
    params: { id },
  });
  return unwrap(response);
}

export async function createStrategy(data: Record<string, unknown>): Promise<{ id: number }> {
  const response = await api.post<ZingResponse<{ id: number }>>('/api/strategies/create', data);
  return unwrap(response);
}

export async function updateStrategy(id: number, data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>('/api/strategies/update', data, {
    params: { id },
  });
  unwrap(response);
}

export async function deleteStrategy(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>('/api/strategies/delete', { params: { id } });
  unwrap(response);
}

export async function startStrategy(id: number): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/strategies/start', null, {
    params: { id },
  });
  unwrap(response);
}

export async function stopStrategy(id: number): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/strategies/stop', null, {
    params: { id },
  });
  unwrap(response);
}

export async function batchCreateStrategies(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>('/api/strategies/batch-create', data);
  return unwrap(response);
}

export async function batchStartStrategies(strategyIds: number[]): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>('/api/strategies/batch-start', {
    strategy_ids: strategyIds,
  });
  return unwrap(response);
}

export async function batchStopStrategies(strategyIds: number[]): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>('/api/strategies/batch-stop', {
    strategy_ids: strategyIds,
  });
  return unwrap(response);
}

export async function batchDeleteStrategies(strategyIds: number[]): Promise<Record<string, unknown>> {
  const response = await api.delete<ZingResponse<Record<string, unknown>>>('/api/strategies/batch-delete', {
    data: { strategy_ids: strategyIds },
  });
  return unwrap(response);
}

export async function getStrategyTrades(id: number): Promise<{ trades: unknown[]; items: unknown[] }> {
  const response = await api.get<ZingResponse<{ trades: unknown[]; items: unknown[] }>>(
    '/api/strategies/trades',
    { params: { id } }
  );
  return unwrap(response) ?? { trades: [], items: [] };
}

export async function getStrategyPositions(id: number): Promise<{ positions: unknown[]; items: unknown[] }> {
  const response = await api.get<ZingResponse<{ positions: unknown[]; items: unknown[] }>>(
    '/api/strategies/positions',
    { params: { id } }
  );
  return unwrap(response) ?? { positions: [], items: [] };
}

export async function getEquityCurve(id: number): Promise<{ points: { time: number; equity: number }[] }> {
  const response = await api.get<ZingResponse<{ points?: { time: number; equity: number }[] } | { time: number; equity: number }[]>>(
    '/api/strategies/equityCurve',
    { params: { id } }
  );
  const data = unwrap(response);
  const points = Array.isArray(data)
    ? (data as { time: number; equity: number }[])
    : ((data as { points?: { time: number; equity: number }[] })?.points ?? []);
  return { points };
}

export async function previewCompileStrategy(config: Record<string, unknown>): Promise<{ code?: string }> {
  const response = await api.post<ZingResponse<{ code?: string }>>(
    '/api/strategies/preview-compile',
    config
  );
  return unwrap(response) ?? {};
}

export async function getStrategyNotifications(params?: {
  strategyId?: number;
  limit?: number;
  sinceId?: number;
}): Promise<{ items: unknown[] }> {
  const q: Record<string, number | undefined> = {};
  if (params?.strategyId != null) q.id = params.strategyId;
  if (params?.limit != null) q.limit = params.limit;
  if (params?.sinceId != null) q.since_id = params.sinceId;
  const response = await api.get<ZingResponse<{ items?: unknown[] }>>('/api/strategies/notifications', {
    params: q,
  });
  const data = unwrap(response);
  return { items: (data as { items?: unknown[] })?.items ?? [] };
}

export async function markNotificationRead(id: number): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/strategies/notifications/read', { id });
  unwrap(response);
}

export async function testConnection(exchangeConfig: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/strategies/test-connection',
    exchangeConfig
  );
  return unwrap(response) ?? {};
}
