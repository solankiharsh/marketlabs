'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface DashboardSummary {
  ai_strategy_count?: number;
  indicator_strategy_count?: number;
  total_equity?: number;
  total_pnl?: number;
  total_realized_pnl?: number;
  total_unrealized_pnl?: number;
  daily_pnl_chart?: { date: string; profit: number }[];
  strategy_pnl_chart?: { name: string; value: number }[];
  monthly_returns?: { month: string; profit: number }[];
  recent_trades?: Record<string, unknown>[];
  current_positions?: Record<string, unknown>[];
  [key: string]: unknown;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<ZingResponse<DashboardSummary>>('/api/dashboard/summary');
  return unwrap(response) ?? {};
}

export async function getPendingOrders(page: number = 1, pageSize: number = 20): Promise<{
  items: unknown[];
  total?: number;
}> {
  const response = await api.get<ZingResponse<{ list?: unknown[]; total?: number }>>(
    '/api/dashboard/pendingOrders',
    { params: { page, pageSize } }
  );
  const data = unwrap(response) ?? {};
  return { items: data.list ?? [], total: data.total };
}

export async function deletePendingOrder(orderId: string | number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>(
    `/api/dashboard/pendingOrders/${orderId}`
  );
  unwrap(response);
}
