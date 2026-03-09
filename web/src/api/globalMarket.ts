import { client } from './client'

const BASE = '/api/global-market'

export function getMarketOverview() {
  return client.get(`${BASE}/overview`)
}

export function getMarketHeatmap() {
  return client.get(`${BASE}/heatmap`)
}

export function getMarketNews(lang = 'all') {
  return client.get(`${BASE}/news`, { params: { lang } })
}

export function getEconomicCalendar() {
  return client.get(`${BASE}/calendar`)
}

export function getMarketSentiment() {
  return client.get(`${BASE}/sentiment`)
}

export function refreshMarketData() {
  return client.post(`${BASE}/refresh`)
}
