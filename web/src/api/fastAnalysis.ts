import { client } from './client'

const BASE = '/api/fast-analysis'

export function fastAnalyze(params: { market: string; symbol: string; language?: string; timeframe?: string }) {
  return client.post(`${BASE}/analyze`, params, { timeout: 60000 })
}

export function getAnalysisHistory(params: { market?: string; symbol?: string; days?: number; limit?: number }) {
  return client.get(`${BASE}/history`, { params })
}

export function getAllAnalysisHistory(params: { page?: number; pagesize?: number }) {
  return client.get(`${BASE}/history/all`, { params })
}

export function deleteAnalysisHistory(memoryId: number) {
  return client.delete(`${BASE}/history/${memoryId}`)
}

export function submitFeedback(params: { memory_id: number; feedback: string }) {
  return client.post(`${BASE}/feedback`, params)
}

export function getPerformanceStats(params: { market?: string; symbol?: string; days?: number }) {
  return client.get(`${BASE}/performance`, { params })
}
