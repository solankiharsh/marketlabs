'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function getProfile(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>('/api/users/profile');
  return unwrap(response) ?? {};
}

export async function updateProfile(data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>('/api/users/profile/update', data);
  unwrap(response);
}

export async function getMyCreditsLog(page?: number, pageSize?: number): Promise<{
  items: unknown[];
  total?: number;
}> {
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/users/my-credits-log',
    { params: { page, pageSize } }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}

export async function getMyReferrals(page?: number, pageSize?: number): Promise<{
  items: unknown[];
  total?: number;
}> {
  const response = await api.get<ZingResponse<{ items?: unknown[]; total?: number }>>(
    '/api/users/my-referrals',
    { params: { page, pageSize } }
  );
  const data = unwrap(response) ?? {};
  return { items: data.items ?? [], total: data.total };
}

export async function getNotificationSettings(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/users/notification-settings'
  );
  return unwrap(response) ?? {};
}

export async function updateNotificationSettings(data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>(
    '/api/users/notification-settings',
    data
  );
  unwrap(response);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/users/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  unwrap(response);
}
