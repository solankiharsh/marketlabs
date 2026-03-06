/**
 * Project default configuration
 * primaryColor - Default theme color. If color changes do not take effect, clear localStorage
 * navTheme - Sidebar theme ['dark', 'light'] two themes
 * colorWeak - Color blind mode
 * layout - Overall layout ['sidemenu', 'topmenu'] two layouts
 * fixedHeader - Fixed Header : boolean
 * fixSiderbar - Fixed left sidebar : boolean
 * contentWidth - Content area layout: Fluid | Fixed
 *
 * storageOptions: {} - Vue-ls plugin options (localStorage/sessionStorage)
 *
 */

export const PYTHON_API_BASE_URL = process.env.VUE_APP_PYTHON_API_BASE_URL || 'http://localhost:5000'

export default {
  navTheme: 'light', // theme for nav menu
  primaryColor: '#13C2C2', // '#F5222D', // primary color of ant design
  layout: 'sidemenu', // nav menu position: `sidemenu` or `topmenu`
  contentWidth: 'Fluid', // layout of content: `Fluid` or `Fixed`, only works when layout is topmenu
  fixedHeader: true, // sticky header - Fixed top navigation bar
  fixSiderbar: true, // sticky siderbar - Fixed left sidebar
  colorWeak: false,
  menu: {
    locale: true
  },
  title: 'MarketLabs',
  pwa: false,
  iconfontUrl: '',
  production: process.env.NODE_ENV === 'production' && process.env.VUE_APP_PREVIEW !== 'true'

}
