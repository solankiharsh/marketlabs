import { client } from './client'

export function getMembershipPlans() {
  return client.get('/api/billing/plans')
}

export function purchaseMembership(plan: string) {
  return client.post('/api/billing/purchase', { plan })
}

export function createUsdtOrder(plan: string) {
  return client.post('/api/billing/usdt/create', { plan })
}

export function getUsdtOrder(orderId: string, refresh = true) {
  return client.get(`/api/billing/usdt/order/${orderId}`, { params: { refresh: refresh ? 1 : 0 } })
}
