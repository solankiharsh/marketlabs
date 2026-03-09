import apiClient from './client'

export interface Workflow {
  id: number
  user_id: number
  name: string
  description: string
  nodes: unknown[]
  edges: unknown[]
  is_active: boolean
  webhook_token: string | null
  webhook_secret: string | null
  webhook_enabled: boolean
  webhook_auth_type: string
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: number
  workflow_id: number
  status: string
  started_at: string | null
  completed_at: string | null
  logs: unknown[]
  error: string | null
  created_at: string
}

type ApiResponse<T> = { code: number; msg: string; data: T }

export function getWorkflows(): Promise<ApiResponse<Workflow[]>> {
  return apiClient.get('/api/flow/workflows')
}

export function getWorkflow(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.get(`/api/flow/workflows/${id}`)
}

export function createWorkflow(data: { name: string; description?: string }): Promise<ApiResponse<Workflow>> {
  return apiClient.post('/api/flow/workflows', data)
}

export function updateWorkflow(
  id: number,
  data: { name?: string; description?: string; nodes?: unknown[]; edges?: unknown[] }
): Promise<ApiResponse<Workflow>> {
  return apiClient.put(`/api/flow/workflows/${id}`, data)
}

export function deleteWorkflow(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete(`/api/flow/workflows/${id}`)
}

export function activateWorkflow(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.post(`/api/flow/workflows/${id}/activate`)
}

export function deactivateWorkflow(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.post(`/api/flow/workflows/${id}/deactivate`)
}

export function executeWorkflow(id: number): Promise<ApiResponse<WorkflowExecution>> {
  return apiClient.post(`/api/flow/workflows/${id}/execute`)
}

export function getExecutions(id: number): Promise<ApiResponse<WorkflowExecution[]>> {
  return apiClient.get(`/api/flow/workflows/${id}/executions`)
}

export function getWebhookConfig(id: number): Promise<ApiResponse<{ webhook_token: string; webhook_enabled: boolean; webhook_auth_type: string }>> {
  return apiClient.get(`/api/flow/workflows/${id}/webhook`)
}

export function enableWebhook(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.post(`/api/flow/workflows/${id}/webhook/enable`)
}

export function disableWebhook(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.post(`/api/flow/workflows/${id}/webhook/disable`)
}

export function regenerateWebhookToken(id: number): Promise<ApiResponse<Workflow>> {
  return apiClient.post(`/api/flow/workflows/${id}/webhook/regenerate`)
}

export function exportWorkflow(id: number): Promise<ApiResponse<unknown>> {
  return apiClient.get(`/api/flow/workflows/${id}/export`)
}

export function importWorkflow(data: unknown): Promise<ApiResponse<Workflow>> {
  return apiClient.post('/api/flow/workflows/import', data)
}
