import store from '@/store'
import storage from 'store'
import {
  ACCESS_TOKEN,
  APP_LANGUAGE,
  TOGGLE_CONTENT_WIDTH,
  TOGGLE_FIXED_HEADER,
  TOGGLE_FIXED_SIDEBAR, TOGGLE_HIDE_HEADER,
  TOGGLE_LAYOUT, TOGGLE_NAV_THEME, TOGGLE_WEAK,
  TOGGLE_COLOR, TOGGLE_MULTI_TAB,
  USER_INFO,
  USER_ROLES
} from '@/store/mutation-types'
import { printANSI } from '@/utils/screenLog'
import defaultSettings from '@/config/defaultSettings'

// When false, auth is not restored on full page load (hard refresh = logout). Default true = persist in localStorage.
const PERSIST_AUTH = process.env.VUE_APP_PERSIST_AUTH !== 'false'

export default function Initializer () {
  printANSI() // please remove this line

  store.commit(TOGGLE_LAYOUT, storage.get(TOGGLE_LAYOUT, defaultSettings.layout))
  store.commit(TOGGLE_FIXED_HEADER, storage.get(TOGGLE_FIXED_HEADER, defaultSettings.fixedHeader))
  store.commit(TOGGLE_FIXED_SIDEBAR, storage.get(TOGGLE_FIXED_SIDEBAR, defaultSettings.fixSiderbar))
  store.commit(TOGGLE_CONTENT_WIDTH, storage.get(TOGGLE_CONTENT_WIDTH, defaultSettings.contentWidth))
  store.commit(TOGGLE_HIDE_HEADER, storage.get(TOGGLE_HIDE_HEADER, defaultSettings.autoHideHeader))
  store.commit(TOGGLE_NAV_THEME, storage.get(TOGGLE_NAV_THEME, defaultSettings.navTheme))
  store.commit(TOGGLE_WEAK, storage.get(TOGGLE_WEAK, defaultSettings.colorWeak))
  store.commit(TOGGLE_COLOR, storage.get(TOGGLE_COLOR, defaultSettings.primaryColor))
  store.commit(TOGGLE_MULTI_TAB, storage.get(TOGGLE_MULTI_TAB, defaultSettings.multiTab))
  // Auth: persist in localStorage by default, so hard refresh keeps you logged in. Set VUE_APP_PERSIST_AUTH=false to clear auth on every load.
  if (!PERSIST_AUTH) {
    storage.remove(ACCESS_TOKEN)
    storage.remove(USER_INFO)
    storage.remove(USER_ROLES)
  }
  let token = PERSIST_AUTH ? storage.get(ACCESS_TOKEN) : null
  if (token && typeof token !== 'string') {
    token = token.token || token.value || (typeof token === 'object' ? null : token)
  }
  token = typeof token === 'string' ? token : null
  store.commit('SET_TOKEN', token)

  store.dispatch('setLang', storage.get(APP_LANGUAGE, 'en-US'))
  // last step
}
