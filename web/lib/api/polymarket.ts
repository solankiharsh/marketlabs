'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function analyzePolymarket(
  input: string,
  language?: string,
  model?: string
): Promise<{ analysis?: string }> {
  const response = await api.post<ZingResponse<{ analysis?: string }>>(
    '/api/polymarket/analyze',
    { input, language, model }
  );
  return unwrap(response) ?? {};
}

export async function getPolymarketHistory(
  page?: number,
  pageSize?: number
): Promise<{ items: unknown[]; total?: number }> {
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/polymarket/history',
    { params: { page, pageSize } }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}
