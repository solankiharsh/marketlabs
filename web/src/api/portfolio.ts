import { client } from './client'

const BASE = '/api/portfolio'

// Positions
export function getPositions(params = {}) {
  return client.get(`${BASE}/positions`, { params })
}

export function addPosition(data: Record<string, unknown>) {
  return client.post(`${BASE}/positions`, data)
}

export function updatePosition(id: number, data: Record<string, unknown>) {
  return client.put(`${BASE}/positions/${id}`, data)
}

export function deletePosition(id: number) {
  return client.delete(`${BASE}/positions/${id}`)
}

export function getPortfolioSummary(params = {}) {
  return client.get(`${BASE}/summary`, { params })
}

// Groups
export function getGroups() {
  return client.get(`${BASE}/groups`)
}

export function renameGroup(data: { old_name: string; new_name: string }) {
  return client.post(`${BASE}/groups/rename`, data)
}

// Monitors
export function getMonitors() {
  return client.get(`${BASE}/monitors`)
}

export function addMonitor(data: Record<string, unknown>) {
  return client.post(`${BASE}/monitors`, data)
}

export function deleteMonitor(id: number) {
  return client.delete(`${BASE}/monitors/${id}`)
}

// Alerts
export function getAlerts() {
  return client.get(`${BASE}/alerts`)
}

export function addAlert(data: Record<string, unknown>) {
  return client.post(`${BASE}/alerts`, data)
}

export function deleteAlert(id: number) {
  return client.delete(`${BASE}/alerts/${id}`)
}
