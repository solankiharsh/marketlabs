import apiClient from './client'

export interface LoginParams {
  username: string
  password: string
  remember_me?: boolean
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  role: {
    id: string
    permissions: string[]
  }
  status: string
  credits: number
  vip_expires_at: string | null
  vip_plan: string
  is_demo?: boolean
}

export interface LoginResponse {
  code: number
  msg: string
  data: {
    token: string
    userinfo: UserInfo
  }
}

export function login(params: LoginParams): Promise<LoginResponse> {
  return apiClient.post('/api/auth/login', params)
}

export function logout(): Promise<unknown> {
  return apiClient.post('/api/auth/logout')
}

export function getUserInfo(): Promise<{ code: number; msg: string; data: UserInfo }> {
  return apiClient.get('/api/auth/info')
}

export function getSecurityConfig(): Promise<{ code: number; data: Record<string, unknown> }> {
  return apiClient.get('/api/auth/security-config')
}
