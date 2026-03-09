import { client } from './client'

export function getStrategyList(params = {}) {
  return client.get('/api/strategies', { params })
}

export function getStrategyDetail(id: number) {
  return client.get('/api/strategies/detail', { params: { id } })
}

export function createStrategy(data: Record<string, unknown>) {
  return client.post('/api/strategies/create', data)
}

export function batchCreateStrategies(data: { strategy_name: string; symbols: string[];[key: string]: unknown }) {
  return client.post('/api/strategies/batch-create', data)
}

export function updateStrategy(id: number, data: Record<string, unknown>) {
  return client.put('/api/strategies/update', data, { params: { id } })
}

export function startStrategy(id: number) {
  return client.post('/api/strategies/start', null, { params: { id } })
}

export function stopStrategy(id: number) {
  return client.post('/api/strategies/stop', null, { params: { id } })
}

export function deleteStrategy(id: number) {
  return client.delete('/api/strategies/delete', { params: { id } })
}

export function batchStartStrategies(data: { strategy_ids?: number[]; strategy_group_id?: string }) {
  return client.post('/api/strategies/batch-start', data)
}

export function batchStopStrategies(data: { strategy_ids?: number[]; strategy_group_id?: string }) {
  return client.post('/api/strategies/batch-stop', data)
}

export function batchDeleteStrategies(data: { strategy_ids?: number[]; strategy_group_id?: string }) {
  return client.delete('/api/strategies/batch-delete', { data })
}

export function getStrategyTrades(id: number) {
  return client.get('/api/strategies/trades', { params: { id } })
}

export function getStrategyPositions(id: number) {
  return client.get('/api/strategies/positions', { params: { id } })
}

export function getStrategyNotifications(params: { id?: number; limit?: number; since_id?: number } = {}) {
  return client.get('/api/strategies/notifications', { params })
}
