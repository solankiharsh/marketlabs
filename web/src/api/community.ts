import { client } from './client'

const BASE = '/api/community'

export function getIndicators(params: { page?: number; pagesize?: number; keyword?: string; pricingType?: string; sortBy?: string }) {
  return client.get(`${BASE}/indicators`, { params })
}

export function getIndicatorDetail(id: number) {
  return client.get(`${BASE}/indicators/${id}`)
}

export function purchaseIndicator(id: number) {
  return client.post(`${BASE}/indicators/${id}/purchase`)
}

export function getMyPurchases() {
  return client.get(`${BASE}/my-purchases`)
}

export function getComments(indicatorId: number, params: { page?: number } = {}) {
  return client.get(`${BASE}/indicators/${indicatorId}/comments`, { params })
}

export function addComment(indicatorId: number, data: { content: string; rating?: number }) {
  return client.post(`${BASE}/indicators/${indicatorId}/comments`, data)
}

// Admin review
export function getPendingIndicators(params: { status?: string; page?: number } = {}) {
  return client.get(`${BASE}/admin/review`, { params })
}

export function reviewIndicator(id: number, data: { action: 'approve' | 'reject'; reason?: string }) {
  return client.post(`${BASE}/admin/review/${id}`, data)
}
