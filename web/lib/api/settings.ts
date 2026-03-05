'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export async function getSettingsSchema(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/settings/schema'
  );
  return unwrap(response) ?? {};
}

export async function getSettingsValues(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/settings/values'
  );
  return unwrap(response) ?? {};
}

export async function saveSettings(data: Record<string, unknown>): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/settings/save', data);
  unwrap(response);
}

export async function getOpenrouterBalance(): Promise<Record<string, unknown>> {
  const response = await api.get<ZingResponse<Record<string, unknown>>>(
    '/api/settings/openrouter-balance'
  );
  return unwrap(response) ?? {};
}

export async function testServiceConnection(
  service: string,
  apiKey?: string
): Promise<Record<string, unknown>> {
  const response = await api.post<ZingResponse<Record<string, unknown>>>(
    '/api/settings/test-connection',
    { service, apiKey }
  );
  return unwrap(response) ?? {};
}
