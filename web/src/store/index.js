import Vue from 'vue'
import Vuex from 'vuex'

import app from './modules/app'
import user from './modules/user'

// dynamic router permission control
// Dynamic routing mode (supports role-based menu filtering)
import permission from './modules/async-router'

// static router permission control (NO filtering)
// Static routing mode (no menu filtering, deprecated)
// import permission from './modules/static-router'

import getters from './getters'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    app,
    user,
    permission
  },
  state: {},
  mutations: {},
  actions: {},
  getters
})
