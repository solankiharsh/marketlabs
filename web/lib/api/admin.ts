'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function adminListUsers(
  page?: number,
  pageSize?: number,
  search?: string
): Promise<{ items: unknown[]; total?: number }> {
  const params: Record<string, number | string> = {};
  if (page != null) params.page = page;
  if (pageSize != null) params.pageSize = pageSize;
  if (search != null) params.search = search;
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/users/list',
    { params }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}

export async function adminGetUser(id: number): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/users/detail',
    { params: { id } }
  );
  return unwrap(response) ?? {};
}

export async function adminCreateUser(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/users/create',
    data
  );
  return unwrap(response) ?? {};
}

export async function adminUpdateUser(
  id: number,
  data: Record<string, unknown>
): Promise<void> {
  const response = await api.put<ZingResponse<null>>('/api/users/update', data, {
    params: { id },
  });
  unwrap(response);
}

export async function adminDeleteUser(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>('/api/users/delete', {
    params: { id },
  });
  unwrap(response);
}

export async function adminResetPassword(userId: number, newPassword: string): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/users/reset-password', {
    user_id: userId,
    new_password: newPassword,
  });
  unwrap(response);
}

export async function adminGetRoles(): Promise<unknown[]> {
  const response = await api.get<ZingResponse<unknown[]>>('/api/users/roles');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function adminSetCredits(
  userId: number,
  credits: number,
  remark?: string
): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/users/set-credits', {
    user_id: userId,
    credits,
    remark,
  });
  unwrap(response);
}

export async function adminSetVip(
  userId: number,
  data: Record<string, unknown>
): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/users/set-vip', {
    user_id: userId,
    ...data,
  });
  unwrap(response);
}

export async function adminGetCreditsLog(
  userId: number,
  page?: number,
  pageSize?: number
): Promise<{ items: unknown[] }> {
  const response = await api.get<ZingResponse<{ items?: unknown[] }>>(
    '/api/users/credits-log',
    { params: { userId, page, pageSize } }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [] };
}

export async function adminGetSystemStrategies(params?: Record<string, unknown>): Promise<unknown[]> {
  const response = await api.get<ZingResponse<unknown[]>>(
    '/api/users/system-strategies',
    { params: params ?? {} }
  );
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function adminGetOrders(params?: Record<string, unknown>): Promise<{
  items: unknown[];
  total?: number;
}> {
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/users/admin-orders',
    { params: params ?? {} }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}

export async function adminGetAiStats(params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/settings/ai-stats',
    { params: params ?? {} }
  );
  return unwrap(response) ?? {};
}
