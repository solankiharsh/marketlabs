import router, {
  resetRouter
} from './router'
import store from './store'
import storage from 'store'
import NProgress from 'nprogress' // progress bar
import '@/components/NProgress/nprogress.less' // progress bar custom style
import {
  setDocumentTitle,
  domTitle
} from '@/utils/domUtil'
import {
  ACCESS_TOKEN
} from '@/store/mutation-types'
import {
  i18nRender
} from '@/locales'

NProgress.configure({
  showSpinner: false
}) // NProgress Configuration

const allowList = ['login', 'About', 'AboutPublic'] // no redirect allowList
const loginRoutePath = '/user/login'
const defaultRoutePath = '/dashboard'

router.beforeEach((to, from, next) => {
  NProgress.start() // start progress bar
  to.meta && typeof to.meta.title !== 'undefined' && setDocumentTitle(`${i18nRender(to.meta.title)} - ${domTitle}`)

  // Check whether we have a token (local-only auth).
  // Handle case where token may be a string or object
  let token = storage.get(ACCESS_TOKEN)
  if (token && typeof token !== 'string') {
    token = token.token || token.value || (typeof token === 'object' ? null : token)
  }
  token = typeof token === 'string' ? token : null

  if (token) {
    // Has token, allow access to all pages
    // If accessing login page, redirect to default page
    if (to.path === loginRoutePath) {
      next({ path: defaultRoutePath })
      NProgress.done()
    } else {
      // Check if user info has been loaded
      if (store.getters.roles.length === 0) {
        store.dispatch('GetInfo')
          .then(res => {
            // Successfully fetched user info
            // const roles = res && res.role
            // Generate routes
            store.dispatch('GenerateRoutes', { token }).then(() => {
              // Dynamically add accessible route table
              resetRouter() // Reset router
              store.getters.addRouters.forEach(r => {
                router.addRoute(r)
              })
              // When request has redirect parameter, auto-redirect to that address after login
              const redirect = decodeURIComponent(from.query.redirect || to.path)
              if (to.path === redirect) {
                // Hack to ensure addRoutes has completed, set replace: true so navigation won't leave a history record
                next({ ...to, replace: true })
              } else {
                // Navigate to destination route
                next({ path: redirect })
              }
            })
          })
          .catch((err) => {
            // If token is invalid/expired, clear local auth and redirect to login.
            const status = err && err.response && err.response.status
            if (status === 401) {
              store.dispatch('Logout').finally(() => {
                next({ path: loginRoutePath, query: { redirect: to.fullPath } })
                NProgress.done()
              })
              return
            }

            // Do NOT hard-logout on transient failures (backend down, proxy issue, etc).
            // Instead, degrade gracefully with a default role and continue.
            store.commit('SET_ROLES', [{ id: 'default', permissionList: [] }])
            store.dispatch('GenerateRoutes', { token }).then(() => {
              resetRouter()
              store.getters.addRouters.forEach(r => router.addRoute(r))
              next({ ...to, replace: true })
            }).catch(() => {
              next()
            })
          })
      } else {
        // Check if routes have been initialized
        const addRouters = store.getters.addRouters
        // If routes are not initialized, initialize them first
        if (!addRouters || addRouters.length === 0) {
          store.dispatch('GenerateRoutes', { token }).then(() => {
            // Dynamically add accessible route table
            resetRouter() // Reset router to prevent duplicate route additions after logout/re-login or token expiry without page refresh
            store.getters.addRouters.forEach(r => {
              router.addRoute(r)
            })
            // Re-enter current route to avoid blank page on first refresh
            next({ ...to, replace: true })
          }).catch(() => {
            next()
          })
        } else {
          next()
        }
      }
    }
  } else {
    // No token
    if (allowList.includes(to.name)) {
      // In the login-free allowlist, proceed directly
      next()
    } else {
      // Redirect to login page
      next({ path: loginRoutePath, query: { redirect: to.fullPath } })
      NProgress.done() // if current page is login will not trigger afterEach hook, so manually handle it
    }
  }
})

router.afterEach(() => {
  NProgress.done() // finish progress bar
})
