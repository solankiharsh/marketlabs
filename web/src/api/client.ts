import axios from 'axios'

const ACCESS_TOKEN_KEY = 'ml_access_token'

function getToken(): string | null {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return null
    // Handle case where token might be JSON-stringified
    try {
      const parsed = JSON.parse(token)
      return typeof parsed === 'string' ? parsed : parsed?.token || null
    } catch {
      return token
    }
  } catch {
    return null
  }
}

export function setToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem('ml_user_info')
}

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 30000,
  withCredentials: true,
})

// Extended timeout for AI analysis
export const ANALYSIS_TIMEOUT = 180000

// Prevent multiple concurrent 401 redirects
let isRedirectingToLogin = false

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  const lang = localStorage.getItem('ml_lang') || 'en-US'

  config.headers['X-App-Lang'] = lang
  config.headers['Accept-Language'] = lang
  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
    config.headers['Access-Token'] = token
    config.headers['token'] = token
  }

  // Cache-bust GET requests
  if ((config.method || 'get').toLowerCase() === 'get') {
    config.params = { ...config.params, _t: Date.now() }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true
      clearToken()
      const currentPath = window.location.pathname
      if (!currentPath.includes('/login')) {
        const redirect = encodeURIComponent(currentPath || '/')
        window.location.assign(`/login?redirect=${redirect}`)
      }
      setTimeout(() => { isRedirectingToLogin = false }, 3000)
    }
    return Promise.reject(error)
  }
)

export { apiClient as client }
export default apiClient
