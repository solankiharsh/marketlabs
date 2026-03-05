'use strict';

import { api, unwrap } from './client';
import type { ZingResponse } from './client';
import type {
  PortfolioPosition,
  PortfolioSummaryData,
  PortfolioMonitor,
  AddPositionPayload,
  CreateMonitorPayload,
} from './portfolio-types';

export async function getPortfolioPositions(refresh?: boolean): Promise<PortfolioPosition[]> {
  const params: Record<string, string | boolean> = {};
  if (refresh) params.refresh = true;
  const response = await api.get<ZingResponse<PortfolioPosition[]>>('/api/portfolio/positions', { params });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function addPosition(data: AddPositionPayload | Record<string, unknown>): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/portfolio/positions', data);
  unwrap(response);
}

export async function updatePosition(id: number, data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>(
    `/api/portfolio/positions/${id}`,
    data
  );
  unwrap(response);
}

export async function deletePosition(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>(`/api/portfolio/positions/${id}`);
  unwrap(response);
}

export async function getPortfolioSummary(refresh?: boolean): Promise<PortfolioSummaryData> {
  const params: Record<string, string | boolean> = {};
  if (refresh) params.refresh = true;
  const response = await api.get<ZingResponse<PortfolioSummaryData>>('/api/portfolio/summary', {
    params,
  });
  return unwrap(response) ?? {};
}

export async function getMonitors(): Promise<PortfolioMonitor[]> {
  const response = await api.get<ZingResponse<PortfolioMonitor[]>>('/api/portfolio/monitors');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function createMonitor(data: CreateMonitorPayload | Record<string, unknown>): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/portfolio/monitors', data);
  unwrap(response);
}

export async function updateMonitor(id: number, data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>(
    `/api/portfolio/monitors/${id}`,
    data
  );
  unwrap(response);
}

export async function deleteMonitor(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>(`/api/portfolio/monitors/${id}`);
  unwrap(response);
}

export async function runMonitor(id: number, opts?: Record<string, unknown>): Promise<unknown> {
  const response = await api.post<ZingResponse<unknown>>(`/api/portfolio/monitors/${id}/run`, opts ?? {});
  return unwrap(response);
}

export async function getAlerts(): Promise<unknown[]> {
  const response = await api.get<ZingResponse<unknown[]>>('/api/portfolio/alerts');
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function createAlert(data: Record<string, unknown>): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/portfolio/alerts', data);
  unwrap(response);
}

export async function updateAlert(id: number, data: Record<string, unknown>): Promise<void> {
  const response = await api.put<ZingResponse<null>>(
    `/api/portfolio/alerts/${id}`,
    data
  );
  unwrap(response);
}

export async function deleteAlert(id: number): Promise<void> {
  const response = await api.delete<ZingResponse<null>>(`/api/portfolio/alerts/${id}`);
  unwrap(response);
}

export async function getPortfolioGroups(): Promise<string[]> {
  const response = await api.get<ZingResponse<{ groups?: string[] }>>('/api/portfolio/groups');
  const data = unwrap(response);
  return (data?.groups ?? []) as string[];
}

export async function renamePortfolioGroup(oldName: string, newName: string): Promise<void> {
  const response = await api.post<ZingResponse<null>>('/api/portfolio/groups/rename', {
    oldName,
    newName,
  });
  unwrap(response);
}
