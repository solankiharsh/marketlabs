'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function runBacktest(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/indicator/backtest',
    data
  );
  return unwrap(response) ?? {};
}

export async function getBacktestHistory(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ items: unknown[]; total?: number }> {
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/indicator/backtest/history',
    { params: params ?? {} }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}

export async function getBacktestResult(runId: string | number): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/indicator/backtest/get',
    { params: { runId } }
  );
  return unwrap(response) ?? {};
}

export async function getBacktestPrecisionInfo(
  market: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/indicator/backtest/precision-info',
    { params: { market, startDate, endDate } }
  );
  return unwrap(response) ?? {};
}

export async function aiAnalyzeBacktest(
  runIds: (string | number)[],
  lang?: string
): Promise<{ analysis?: string }> {
  const response = await api.post<ZingResponse<{ analysis?: string }>>(
    '/api/indicator/backtest/aiAnalyze',
    { runIds, lang }
  );
  return unwrap(response) ?? {};
}
