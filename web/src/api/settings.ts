import { client } from './client'

export function getSettingsSchema() {
  return client.get('/api/settings/schema')
}

export function getSettingsValues() {
  return client.get('/api/settings/values')
}

export function saveSettings(data: Record<string, unknown>) {
  return client.post('/api/settings/save', data)
}

export function testConnection(service: string, params: Record<string, unknown> = {}) {
  return client.post('/api/settings/test-connection', { service, ...params })
}

export function getOpenRouterBalance() {
  return client.get('/api/settings/openrouter-balance')
}
