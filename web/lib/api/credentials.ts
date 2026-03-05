'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';

export interface CredentialItem {
  id: number;
  name?: string;
  exchange_id?: string;
  api_key_hint?: string;
  created_at?: string;
  [key: string]: unknown;
}

export async function getCredentials(): Promise<CredentialItem[]> {
  const response = await api.get<ZingResponse<{ items: CredentialItem[] }>>('/api/credentials/list');
  const data = unwrap(response);
  return (data?.items ?? []) as CredentialItem[];
}

export async function getCredentialDetail(id: number): Promise<CredentialItem | null> {
  const items = await getCredentials();
  return items.find((c) => c.id === id) ?? null;
}

export async function createCredential(data: Record<string, unknown>): Promise<{ id?: number }> {
  const response = await api.post<ZingResponse<{ id?: number }>>('/api/credentials/create', data);
  return unwrap(response) ?? {};
}

export async function deleteCredential(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>('/api/credentials/delete', { params: { id } });
  unwrap(response);
}
