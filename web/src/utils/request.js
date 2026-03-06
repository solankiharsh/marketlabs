import axios from 'axios'
// import store from '@/store'
import storage from 'store'
import notification from 'ant-design-vue/es/notification'
import { VueAxios } from './axios'
import { ACCESS_TOKEN, USER_INFO, USER_ROLES } from '@/store/mutation-types'

// PHPSESSID storage key
const PHPSESSID_KEY = 'PHPSESSID'
// Locale storage key used by vue-i18n (see src/locales/index.js)
const LOCALE_KEY = 'lang'

// Prevent multiple concurrent 401 redirects
let isRedirectingToLogin = false

/**
 * Get token, handling cases where token may be a string or object
 */
function getToken () {
  let token = storage.get(ACCESS_TOKEN)
  if (!token) {
    return null
  }
  if (typeof token !== 'string') {
    // If it's an object, try to get the token property
    if (token && typeof token === 'object') {
      token = token.token || token.value || null
    } else {
      token = null
    }
  }
  // Ensure token is a non-empty string
  return (typeof token === 'string' && token.length > 0) ? token : null
}

// Create axios instance
const request = axios.create({
  // Default prefix for API requests
  // Production should be handled by Nginx, development by devServer proxy
  baseURL: '/',
  timeout: 30000, // Default request timeout 30s
  withCredentials: true // Allow sending cookies
})

// Extended timeout for long-running AI analysis APIs
export const ANALYSIS_TIMEOUT = 180000 // 3 minutes for AI analysis

// Error interceptor handler
const errorHandler = (error) => {
  if (error.response) {
    const data = error.response.data
    if (error.response.status === 403) {
      notification.error({
        message: '(Demo Mode)',
        description: data.msg || data.message || 'Read-only in demo mode'
      })
    }
    if (error.response.status === 401 && !(data.result && data.result.isLogin)) {
      // Token invalid/expired: MUST clear local auth state, otherwise route guard will
      // detect a stale token and immediately bounce user away from login page.
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        try {
          storage.remove(ACCESS_TOKEN)
          storage.remove(USER_INFO)
          storage.remove(USER_ROLES)
          storage.remove(PHPSESSID_KEY)
        } catch (e) {}

        notification.error({
          message: 'Unauthorized',
          description: data.msg || data.message || 'Token invalid or expired, please login again.'
        })

        // Project uses hash mode, need to redirect to /#/user/login
        const curHash = window.location.hash || ''
        if (!curHash.includes('/user/login')) {
          const redirect = encodeURIComponent(curHash.replace('#', '') || '/')
          window.location.assign(`/#/user/login?redirect=${redirect}`)
        }
      }
    }
  }
  return Promise.reject(error)
}

// request interceptor
request.interceptors.request.use(config => {
  // Use unified token getter
  const token = getToken()
  const lang = storage.get(LOCALE_KEY) || 'en-US'

  // Tell backend which UI language user is using, so AI reports can match it.
  // We keep both a custom header and the standard Accept-Language for compatibility.
  config.headers['X-App-Lang'] = lang
  config.headers['Accept-Language'] = lang

  // If token exists, add it to request headers
  if (token) {
    // Use Authorization header in Bearer {token} format
    config.headers['Authorization'] = `Bearer ${token}`
    // Also keep the original Access-Token header (if backend needs it)
    config.headers[ACCESS_TOKEN] = token
    // Compatible with backend token header requirement
    config.headers['token'] = token
  } else {
    // Debug: if token doesn't exist, log it
    if (config.url && config.url.includes('/api/auth/info')) {
      const rawToken = storage.get(ACCESS_TOKEN)
      console.warn('Token missing for /api/auth/info request')
      console.warn('Raw token from storage:', rawToken)
      console.warn('Token type:', typeof rawToken)
      console.warn('Token value:', rawToken)
    }
  }

  // Prevent caching-related 304: add no-cache headers to requests
  config.headers['Cache-Control'] = 'no-cache'
  config.headers['Pragma'] = 'no-cache'
  config.headers['If-Modified-Since'] = '0'

  // Add timestamp parameter to GET requests to avoid caching
  if ((config.method || 'get').toLowerCase() === 'get') {
    const ts = Date.now()
    config.params = Object.assign({}, config.params || {}, { _t: ts })
  }

  // Manually set PHPSESSID cookie to ensure same session across requests
  // Note: browsers don't allow manually setting Cookie headers, need to use document.cookie
  // However, due to cross-origin restrictions, cookies may not be settable directly; primarily rely on withCredentials: true
  const phpsessid = storage.get(PHPSESSID_KEY)
  if (phpsessid && typeof document !== 'undefined') {
    // Check current PHPSESSID in document.cookie
    const currentCookies = document.cookie
    const currentPhpsessidMatch = currentCookies.match(/PHPSESSID=([^;]+)/i)
    const currentPhpsessid = currentPhpsessidMatch ? currentPhpsessidMatch[1].trim() : null

    // If current cookie PHPSESSID differs from saved one, try to update
    // Note: may fail in cross-origin scenarios, depends on CORS configuration
    if (!currentPhpsessid || currentPhpsessid !== phpsessid) {
      // Try setting cookie (may fail due to cross-origin, but doesn't affect withCredentials)
      try {
        // Try setting cookie with domain (only works on same domain)
        if (window.location.hostname.includes('marketlabs.com')) {
          document.cookie = `PHPSESSID=${phpsessid}; path=/; domain=.marketlabs.com; SameSite=None; Secure`
        } else {
          // In cross-origin scenarios, can only rely on withCredentials: true and server settings
          // Try setting here, but may not succeed
          document.cookie = `PHPSESSID=${phpsessid}; path=/; SameSite=None; Secure`
        }
      } catch (e) {
        // Setting failure is expected (cross-origin restriction), primarily rely on withCredentials
      }
    }
  }

  return config
}, errorHandler)

// response interceptor
request.interceptors.response.use((response) => {
  // Extract PHPSESSID from response and save
  // Due to browser security restrictions, can't read set-cookie header directly, need to use document.cookie
  try {
    if (typeof document !== 'undefined') {
      // Get PHPSESSID from document.cookie (set automatically by browser)
      const cookies = document.cookie
      const phpsessidMatch = cookies.match(/PHPSESSID=([^;]+)/i)
      if (phpsessidMatch && phpsessidMatch[1]) {
        const phpsessid = phpsessidMatch[1].trim()
        // Save PHPSESSID to storage, valid for 24 hours
        const savedPhpsessid = storage.get(PHPSESSID_KEY)
        // If PHPSESSID has changed, update the saved value
        if (!savedPhpsessid || savedPhpsessid !== phpsessid) {
          storage.set(PHPSESSID_KEY, phpsessid, new Date().getTime() + 24 * 60 * 60 * 1000)
        }
      }
    }
  } catch (e) {
  }

  return response.data
}, errorHandler)

const installer = {
  vm: {},
  install (Vue) {
    Vue.use(VueAxios, request)
  }
}

export default request

export {
  installer as VueAxios,
  request as axios
}
