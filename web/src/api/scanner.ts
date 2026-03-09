import apiClient from './client'

export interface ScannerStrategy {
  id: number
  user_id: number
  name: string
  webhook_id: string
  is_active: boolean
  market_type: string
  strategy_type: string
  start_time: string | null
  end_time: string | null
  squareoff_time: string | null
  default_action: string
  default_order_type: string
  created_at: string
  updated_at: string
}

export interface SymbolMapping {
  id: number
  strategy_id: number
  source_symbol: string
  market: string
  symbol: string
  quantity: number
  execution_mode: string
  created_at: string
}

export interface WebhookLog {
  id: number
  strategy_id: number
  payload: unknown
  symbols_processed: string
  orders_queued: number
  status: string
  error: string | null
  created_at: string
}

type ApiResponse<T> = { code: number; msg: string; data: T }

export function getStrategies(): Promise<ApiResponse<ScannerStrategy[]>> {
  return apiClient.get('/api/scanner/strategies')
}

export function getStrategy(id: number): Promise<ApiResponse<ScannerStrategy & { mappings: SymbolMapping[] }>> {
  return apiClient.get(`/api/scanner/strategies/${id}`)
}

export function createStrategy(data: Partial<ScannerStrategy>): Promise<ApiResponse<ScannerStrategy>> {
  return apiClient.post('/api/scanner/strategies', data)
}

export function updateStrategy(id: number, data: Partial<ScannerStrategy>): Promise<ApiResponse<ScannerStrategy>> {
  return apiClient.put(`/api/scanner/strategies/${id}`, data)
}

export function deleteStrategy(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete(`/api/scanner/strategies/${id}`)
}

export function toggleStrategy(id: number): Promise<ApiResponse<ScannerStrategy>> {
  return apiClient.post(`/api/scanner/strategies/${id}/toggle`)
}

export function addSymbolMapping(strategyId: number, data: Partial<SymbolMapping>): Promise<ApiResponse<SymbolMapping>> {
  return apiClient.post(`/api/scanner/strategies/${strategyId}/symbols`, data)
}

export function bulkAddSymbols(strategyId: number, data: { csv: string }): Promise<ApiResponse<SymbolMapping[]>> {
  return apiClient.post(`/api/scanner/strategies/${strategyId}/symbols/bulk`, data)
}

export function removeSymbolMapping(strategyId: number, mappingId: number): Promise<ApiResponse<null>> {
  return apiClient.delete(`/api/scanner/strategies/${strategyId}/symbols/${mappingId}`)
}

export function getWebhookLogs(strategyId: number): Promise<ApiResponse<WebhookLog[]>> {
  return apiClient.get(`/api/scanner/strategies/${strategyId}/logs`)
}
