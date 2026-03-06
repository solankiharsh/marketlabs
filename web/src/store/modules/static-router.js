import { asyncRouterMap, constantRouterMap } from '@/config/router.config'
import cloneDeep from 'lodash.clonedeep'

/**
 * For single account with multiple roles, use this method to filter out menus for non-existent roles
 *
 * @param roles
 * @param route
 * @returns {*}
 */
// eslint-disable-next-line
function hasRole(roles, route) {
  if (route.meta && route.meta.roles) {
    return route.meta.roles.includes(roles.id)
  } else {
    return true
  }
}

function filterAsyncRouter (routerMap, role) {
  // No permission filtering, return all routes directly (backend validates token)
  return routerMap.map(route => {
    if (route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, role)
    }
    return route
  })
}

const permission = {
  state: {
    routers: constantRouterMap,
    addRouters: []
  },
  mutations: {
    SET_ROUTERS: (state, routers) => {
      state.addRouters = routers
      state.routers = constantRouterMap.concat(routers)
    }
  },
  actions: {
    GenerateRoutes ({ commit }, data) {
      return new Promise(resolve => {
        const routerMap = cloneDeep(asyncRouterMap)
        // No permission filtering, return all routes directly (backend validates token)
        const accessedRouters = filterAsyncRouter(routerMap, null)
        commit('SET_ROUTERS', accessedRouters)
        resolve()
      })
    }
  }
}

export default permission
