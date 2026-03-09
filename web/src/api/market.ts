import apiClient from './client'

export function getMarketSymbols(market: string) {
  return apiClient.get(`/api/market/symbols`, { params: { market } })
}

export function searchSymbols(query: string, market?: string) {
  return apiClient.get(`/api/market/search`, { params: { q: query, market } })
}
