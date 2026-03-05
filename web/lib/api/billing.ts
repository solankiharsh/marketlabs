'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function getBillingPlans(): Promise<{
  plans: unknown[];
  billing?: Record<string, unknown>;
}> {
  const response = await api.get<ZingResponse<{ plans: unknown[]; billing?: Record<string, unknown> }>>(
    '/api/billing/plans'
  );
  return unwrap(response) ?? { plans: [] };
}

export async function purchasePlan(plan: string): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/billing/purchase',
    { plan }
  );
  return unwrap(response) ?? {};
}

export async function createUsdtOrder(plan: string): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/billing/usdt/create',
    { plan }
  );
  return unwrap(response) ?? {};
}

export async function getUsdtOrder(
  orderId: string,
  refresh?: boolean
): Promise<Record<string, unknown>> {
  const params = refresh !== undefined ? { refresh: refresh ? '1' : '0' } : {};
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    `/api/billing/usdt/order/${encodeURIComponent(orderId)}`,
    { params }
  );
  return unwrap(response) ?? {};
}
