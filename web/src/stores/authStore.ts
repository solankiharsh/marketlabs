import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout, getUserInfo, type UserInfo, type LoginParams } from '@/api/auth'
import { setToken, clearToken } from '@/api/client'

interface AuthState {
  token: string
  user: UserInfo | null
  roles: string[]
  isAuthenticated: boolean
  isLoading: boolean

  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
  fetchUserInfo: () => Promise<UserInfo>
  setUser: (user: UserInfo) => void
  reset: () => void
}

function loadInitialState() {
  try {
    const token = localStorage.getItem('ml_access_token') || ''
    const userStr = localStorage.getItem('ml_user_info')
    const user = userStr ? JSON.parse(userStr) : null
    return {
      token,
      user,
      isAuthenticated: !!token,
      roles: user?.role?.permissions || [],
    }
  } catch {
    return { token: '', user: null, isAuthenticated: false, roles: [] }
  }
}

const initial = loadInitialState()

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  roles: initial.roles,
  isAuthenticated: initial.isAuthenticated,
  isLoading: false,

  login: async (params: LoginParams) => {
    set({ isLoading: true })
    try {
      const res = await apiLogin(params)
      if (res.code === 1 && res.data) {
        const { token, userinfo } = res.data
        setToken(token)
        localStorage.setItem('ml_user_info', JSON.stringify(userinfo))
        set({
          token,
          user: userinfo,
          roles: userinfo.role?.permissions || ['dashboard'],
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
        throw new Error(res.msg || 'Login failed')
      }
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // Continue even if API call fails
    }
    clearToken()
    set({
      token: '',
      user: null,
      roles: [],
      isAuthenticated: false,
    })
  },

  fetchUserInfo: async () => {
    const res = await getUserInfo()
    if (res.code === 1 && res.data) {
      const user = res.data
      localStorage.setItem('ml_user_info', JSON.stringify(user))
      set({
        user,
        roles: user.role?.permissions || ['dashboard'],
      })
      return user
    }
    throw new Error('Failed to fetch user info')
  },

  setUser: (user: UserInfo) => {
    localStorage.setItem('ml_user_info', JSON.stringify(user))
    set({
      user,
      roles: user.role?.permissions || ['dashboard'],
    })
  },

  reset: () => {
    clearToken()
    set({
      token: '',
      user: null,
      roles: [],
      isAuthenticated: false,
    })
  },
}))
