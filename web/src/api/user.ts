import { client } from './client'

// Admin APIs
export function getUserList(params: { page?: number; page_size?: number; search?: string }) {
  return client.get('/api/users/list', { params })
}

export function createUser(data: { username: string; password: string; email?: string; nickname?: string; role?: string }) {
  return client.post('/api/users/create', data)
}

export function updateUser(id: number, data: Record<string, unknown>) {
  return client.put('/api/users/update', data, { params: { id } })
}

export function deleteUser(id: number) {
  return client.delete('/api/users/delete', { params: { id } })
}

export function resetUserPassword(data: { user_id: number; new_password: string }) {
  return client.post('/api/users/reset-password', data)
}

export function setUserCredits(data: { user_id: number; credits: number; remark?: string }) {
  return client.post('/api/users/set-credits', data)
}

export function setUserVip(data: { user_id: number; vip_days?: number; vip_expires_at?: string; remark?: string }) {
  return client.post('/api/users/set-vip', data)
}

// Self-service APIs
export function getProfile() {
  return client.get('/api/users/profile')
}

export function updateProfile(data: { nickname?: string; email?: string; avatar?: string }) {
  return client.put('/api/users/profile/update', data)
}

export function changePassword(data: { old_password: string; new_password: string }) {
  return client.post('/api/users/change-password', data)
}

export function getMyCreditsLog(params: { page?: number; page_size?: number }) {
  return client.get('/api/users/my-credits-log', { params })
}

export function getMyReferrals(params: { page?: number; page_size?: number }) {
  return client.get('/api/users/my-referrals', { params })
}
