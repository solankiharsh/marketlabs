'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface IndicatorItem {
  id: number;
  name?: string;
  description?: string;
  code?: string;
  createtime?: string;
  [key: string]: unknown;
}

export async function getIndicators(): Promise<IndicatorItem[]> {
  const response = await api.get<ZingResponse<IndicatorItem[]>>('/api/indicator/getIndicators');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function saveIndicator(data: Record<string, unknown>): Promise<{ id?: number }> {
  const response = await api.post<ZingResponse<{ id?: number }>>('/api/indicator/saveIndicator', data);
  return unwrap(response) ?? {};
}

export async function deleteIndicator(id: number): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/indicator/deleteIndicator', { id });
  unwrap(response);
}

/** Param definition from backend (parsed from indicator code @param declarations) */
export interface IndicatorParamDef {
  name: string;
  type: 'int' | 'float' | 'bool' | 'str';
  default: number | boolean | string;
  description?: string;
}

export async function getIndicatorParams(indicatorId: number): Promise<IndicatorParamDef[]> {
  const response = await api.get<ZingResponse<IndicatorParamDef[]>>(
    '/api/indicator/getIndicatorParams',
    { params: { indicator_id: indicatorId } }
  );
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function verifyIndicatorCode(code: string): Promise<{ valid?: boolean }> {
  const response = await api.post<ZingResponse<{ valid?: boolean }>>('/api/indicator/verifyCode', {
    code,
  });
  return unwrap(response) ?? {};
}

export async function aiGenerateIndicator(
  prompt: string,
  existingCode?: string
): Promise<{ code?: string }> {
  const response = await api.post<ZingResponse<{ code?: string }>>('/api/indicator/aiGenerate', {
    prompt,
    existingCode,
  });
  return unwrap(response) ?? {};
}

export async function callIndicator(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/indicator/callIndicator',
    data
  );
  return unwrap(response) ?? {};
}

/** Execute indicator code against OHLCV; returns output with plots and signals for chart */
export interface IndicatorPlot {
  name: string;
  data: number[];
  color: string;
  overlay: boolean;
}
export interface IndicatorSignal {
  type: 'buy' | 'sell';
  text: string;
  data: (number | null)[];
  color: string;
}
export interface ExecuteIndicatorOutput {
  name: string;
  plots: IndicatorPlot[];
  signals: IndicatorSignal[];
}

/** Kline row for callIndicator: array of { open, high, low, close, volume } (and optional time) */
export type KlineDataRow = Record<string, number>;

/**
 * Execute indicator by ID with OHLCV data and optional params.
 * Fetches are done by the caller; pass klineData in the format the backend expects.
 */
export async function executeIndicatorWithKline(
  indicatorId: number,
  klineData: KlineDataRow[],
  params: Record<string, number | string | boolean> = {}
): Promise<{ output: ExecuteIndicatorOutput }> {
  const raw = await callIndicator({
    indicatorRef: indicatorId,
    klineData,
    params,
    currentIndicatorId: indicatorId,
  });
  const output = raw?.output as ExecuteIndicatorOutput | undefined;
  if (!output || typeof output.name !== 'string') {
    return { output: { name: 'Indicator', plots: [], signals: [] } };
  }
  return { output };
}
