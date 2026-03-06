<template>
  <div :class="['basic-layout-wrapper', settings.theme]">
    <pro-layout
      :menus="menus"
      :collapsed="collapsed"
      :mediaQuery="query"
      :isMobile="isMobile"
      :handleMediaQuery="handleMediaQuery"
      :handleCollapse="handleCollapse"
      :i18nRender="i18nRender"
      v-bind="settings"
    >

      <template #menuHeaderRender>
        <div>
          <img src="/slogo.png" />
          <h1>{{ title }}</h1>
        </div>
      </template>
      <!-- 1.0.0+ pro-layout API,
          adds custom content area on the left side of the Header
    -->
      <template #headerContentRender>
        <div>
          <a-tooltip :title="$t('menu.header.refreshPage')">
            <a-icon type="reload" style="font-size: 18px;cursor: pointer;" @click="handleRefresh" />
          </a-tooltip>
        </div>
      </template>

      <!-- User agreement modal -->
      <a-modal :visible="showLegalModal" :footer="null" :title="$t('menu.footer.userAgreement')" @cancel="showLegalModal = false" :width="800">
        <div style="max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.8; padding: 16px;">
          {{ menuFooterConfig.legal.user_agreement || $t('user.login.legal.content') }}
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <a-button type="primary" @click="showLegalModal = false">OK</a-button>
        </div>
      </a-modal>

      <!-- Privacy policy modal -->
      <a-modal :visible="showPrivacyModal" :footer="null" :title="$t('menu.footer.privacyPolicy')" @cancel="showPrivacyModal = false" :width="800">
        <div style="max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.8; padding: 16px;">
          {{ menuFooterConfig.legal.privacy_policy || $t('user.login.privacy.content') }}
        </div>
        <div style="margin-top: 12px; text-align: right;">
          <a-button type="primary" @click="showPrivacyModal = false">OK</a-button>
        </div>
      </a-modal>

      <setting-drawer ref="settingDrawer" :settings="settings" @change="handleSettingChange">
        <div style="margin: 12px 0;">
          This is SettingDrawer custom footer content.
        </div>
      </setting-drawer>
      <template #rightContentRender>
        <right-content :top-menu="settings.layout === 'topmenu'" :is-mobile="isMobile" :theme="settings.theme" />
      </template>
      <!-- custom footer removed -->
      <template #footerRender>
        <div style="display: none;"></div>
      </template>
      <router-view :key="refreshKey" />
    </pro-layout>

    <!-- Menu footer - written directly, not dependent on slots -->
    <div class="custom-menu-footer" :class="{ 'collapsed': collapsed, 'drawer-open': isMobile && isDrawerOpen, 'drawer-animating': isMobile && isDrawerAnimating }">
      <div v-if="!collapsed" class="menu-footer-content">
        <!-- Contact us -->
        <div class="footer-section">
          <div class="section-title">{{ $t('menu.footer.contactUs') }}</div>
          <div class="section-links">
            <a :href="menuFooterConfig.contact.feature_request_url" target="_blank">{{ $t('menu.footer.support') }}</a>
            <span class="separator">|</span>
            <a :href="menuFooterConfig.contact.feature_request_url" target="_blank">{{ $t('menu.footer.featureRequest') }}</a>
          </div>
        </div>

        <!-- Get support -->
        <div class="footer-section">
          <div class="section-title">{{ $t('menu.footer.getSupport') }}</div>
          <div class="section-links">
            <a :href="'mailto:' + menuFooterConfig.contact.email">{{ $t('menu.footer.email') }}</a>
          </div>
        </div>

        <!-- Social accounts -->
        <div class="footer-section" v-if="menuFooterConfig.social_accounts && menuFooterConfig.social_accounts.length > 0">
          <div class="section-title">{{ $t('menu.footer.socialAccounts') }}</div>
          <div class="social-icons">
            <a
              v-for="(account, index) in menuFooterConfig.social_accounts"
              :key="index"
              :href="account.url"
              target="_blank"
              rel="noopener noreferrer"
              :title="account.name"
              class="social-icon"
            >
              <Icon :icon="`simple-icons:${account.icon}`" class="social-icon-svg" />
            </a>
          </div>
        </div>

        <!-- User agreement and privacy policy -->
        <div class="footer-section">
          <div class="section-links">
            <a @click="showLegalModal = true">{{ $t('menu.footer.userAgreement') }}</a>
            <span class="separator">&</span>
            <a @click="showPrivacyModal = true">{{ $t('menu.footer.privacyPolicy') }}</a>
          </div>
        </div>

        <!--  -->
        <div class="footer-section copyright">
          {{ menuFooterConfig.copyright }}
        </div>
        <!-- Version -->
        <div class="footer-section version">
          V0.0.1
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { updateTheme } from '@/components/SettingDrawer/settingConfig'
import { i18nRender } from '@/locales'
import { mapState } from 'vuex'
import {
  CONTENT_WIDTH_TYPE,
  SIDEBAR_TYPE,
  TOGGLE_MOBILE_TYPE,
  TOGGLE_NAV_THEME,
  TOGGLE_LAYOUT,
  TOGGLE_FIXED_HEADER,
  TOGGLE_FIXED_SIDEBAR,
  TOGGLE_CONTENT_WIDTH,
  TOGGLE_HIDE_HEADER,
  TOGGLE_COLOR,
  TOGGLE_WEAK,
  TOGGLE_MULTI_TAB
} from '@/store/mutation-types'

import defaultSettings from '@/config/defaultSettings'
import RightContent from '@/components/GlobalHeader/RightContent'
import SettingDrawer from '@/components/SettingDrawer/SettingDrawer'
import { Icon } from '@iconify/vue2'

export default {
  name: 'BasicLayout',
  components: {
    SettingDrawer,
    RightContent,
    Icon
    // GlobalFooter,
    // Ads
  },
  data () {
    return {
      // preview.pro.antdv.com only use.
      isProPreviewSite: process.env.VUE_APP_PREVIEW === 'true' && process.env.NODE_ENV !== 'development',
      // end
      isDev: process.env.NODE_ENV === 'development' || process.env.VUE_APP_PREVIEW === 'true',

      // base - menus moved to computed property
      // Sidebar collapsed state
      collapsed: false,
      title: defaultSettings.title,
      settings: {
        // Layout type
        layout: defaultSettings.layout, // 'sidemenu', 'topmenu'
        // CONTENT_WIDTH_TYPE
        contentWidth: defaultSettings.layout === 'sidemenu' ? CONTENT_WIDTH_TYPE.Fluid : defaultSettings.contentWidth,
        // Theme 'dark' | 'light'
        theme: defaultSettings.navTheme,
        // Primary color
        primaryColor: defaultSettings.primaryColor,
        fixedHeader: defaultSettings.fixedHeader,
        fixSiderbar: defaultSettings.fixSiderbar,
        colorWeak: defaultSettings.colorWeak,

        hideHintAlert: false,
        hideCopyButton: false
      },
      // Media query
      query: {},

      // Whether in mobile mode
      isMobile: false,
      // Legal disclaimer modal visibility state
      showLegalModal: false,
      showPrivacyModal: false,
      // Key used to refresh the content area
      refreshKey: 0,
      // Whether drawer is open (mobile)
      isDrawerOpen: false,
      // Whether drawer is animating (mobile)
      isDrawerAnimating: false,
      // Static footer config (local OSS build)
      menuFooterConfig: {
        contact: {
          feature_request_url: 'https://github.com/solankiharsh/marketlabs/issues',
          email: 'hvsolanki27@gmail.com'
        },
        social_accounts: [
          { name: 'GitHub', icon: 'github', url: 'https://github.com/solankiharsh/marketlabs/issues' },
          { name: 'X', icon: 'x', url: 'https://x.com/b63a7ad1ca92484' },
          { name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@Harsh-y1v8v' }
        ],
        legal: {
          user_agreement: '',
          privacy_policy: ''
        },
        copyright: '© 2025-2026 MarketLabs. All rights reserved.'
      },
      // Whether this is the first theme color initialization (used to decide whether to show "Switching theme" message)
      isInitialThemeColorLoad: true
    }
  },
  computed: {
    ...mapState({
      // Dynamic main routes
      mainMenu: state => state.permission.addRouters
    }),
    // Responsive menu - dynamically updated based on addRouters
    menus () {
      const routes = this.mainMenu.find(item => item.path === '/')
      return (routes && routes.children) || []
    }
  },
  created () {
    // menus is now a computed property - no need to set here
    // Sync theme settings from store (restored from localStorage)
    this.settings.theme = this.$store.state.app.theme
    this.settings.primaryColor = this.$store.state.app.color || defaultSettings.primaryColor
    // Handle sidebar collapse state
    this.$watch('collapsed', () => {
      this.$store.commit(SIDEBAR_TYPE, this.collapsed)
    })
    this.$watch('isMobile', () => {
      this.$store.commit(TOGGLE_MOBILE_TYPE, this.isMobile)
    })
    // Watch theme changes in store, sync to settings and body class
    this.$watch('$store.state.app.theme', (val) => {
      this.settings.theme = val
      if (val === 'dark' || val === 'realdark') {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
      } else {
        document.body.classList.remove('dark')
        document.body.classList.add('light')
      }
    }, { immediate: true })
    // Watch theme color changes in store, sync to settings
    this.$watch('$store.state.app.color', (val) => {
      if (val) {
        this.settings.primaryColor = val
        // Apply theme color
        if (process.env.NODE_ENV !== 'production' || process.env.VUE_APP_PREVIEW === 'true') {
          // Silently update on first load, do not show "Switching theme" message
          updateTheme(val, this.isInitialThemeColorLoad)
          // After first call, set flag to false
          if (this.isInitialThemeColorLoad) {
            this.isInitialThemeColorLoad = false
          }
        }
      }
    }, { immediate: true })
    // Watch settings.theme changes, sync body class (as extra safeguard)
    this.$watch('settings.theme', (val) => {
      if (val === 'dark' || val === 'realdark') {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
      } else {
        document.body.classList.remove('dark')
        document.body.classList.add('light')
      }
    }, { immediate: true })
  },
  mounted () {
    const userAgent = navigator.userAgent
    if (userAgent.indexOf('Edge') > -1) {
      this.$nextTick(() => {
        this.collapsed = !this.collapsed
        setTimeout(() => {
          this.collapsed = !this.collapsed
        }, 16)
      })
    }

    // first update color
    // TIPS: THEME COLOR HANDLER!! PLEASE CHECK THAT!!
    // Note: theme color update is handled in created() watch, no need to call again here
    // Avoid showing the "Switching theme" message twice

    // Listen for show settings drawer event
    this.$root.$on('show-setting-drawer', () => {
      if (this.$refs.settingDrawer) {
        this.$refs.settingDrawer.showDrawer()
      }
    })

    // Footer config is static for local OSS build

    // Update menu footer position (delayed to ensure DOM is rendered)
    this.$nextTick(() => {
      setTimeout(() => {
        this.updateMenuFooterPosition()
      }, 200)
    })

    // Listen for window resize
    window.addEventListener('resize', this.updateMenuFooterPosition)

    // Desktop: periodically check and update footer position (ensure it is visible)
    if (!this.isMobile) {
      this._desktopFooterInterval = setInterval(() => {
        this.updateMenuFooterPosition()
      }, 1000)
    }

    // Listen for mobile menu drawer open/close
    // Use MutationObserver to watch drawer show/hide
    const observer = new MutationObserver(() => {
      if (this.isMobile) {
        // Check if drawer is open
        const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
        const wasOpen = this.isDrawerOpen
        const isOpen = !!drawer

        this.isDrawerOpen = isOpen

        // If state changed, update footer position
        if (wasOpen !== this.isDrawerOpen) {
          if (this.isDrawerOpen) {
            // Drawer just opened, mark as animating, delay showing footer
            this.isDrawerAnimating = true
            // Wait for drawer animation to complete (Ant Design Drawer animation is 0.3s)
            setTimeout(() => {
              this.isDrawerAnimating = false
              this.updateMenuFooterPosition()
            }, 300)
          } else {
            // Drawer closed, hide footer immediately
            this.isDrawerAnimating = false
            this.updateMenuFooterPosition()
          }
        }
      }
    })

    // Observe body changes, detect drawer addition/removal and class changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    // Save observer for cleanup
    this._menuFooterObserver = observer

    // Periodic check (as fallback, ensure footer position is correct)
    this._menuFooterInterval = setInterval(() => {
      if (this.isMobile) {
        const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
        const currentState = !!drawer
        if (this.isDrawerOpen !== currentState) {
          this.isDrawerOpen = currentState
          // If drawer just opened, mark as animating
          if (currentState) {
            this.isDrawerAnimating = true
            setTimeout(() => {
              this.isDrawerAnimating = false
              this.updateMenuFooterPosition()
            }, 300)
          } else {
            this.isDrawerAnimating = false
            this.updateMenuFooterPosition()
          }
        } else if (currentState && !this.isDrawerAnimating) {
          // Drawer is open and not animating, update position (prevent drawer position drift)
          this.updateMenuFooterPosition()
        }
      }
    }, 200)
  },
  beforeDestroy () {
    // Remove event listeners
    this.$root.$off('show-setting-drawer')
    window.removeEventListener('resize', this.updateMenuFooterPosition)

    // Cleanup MutationObserver
    if (this._menuFooterObserver) {
      this._menuFooterObserver.disconnect()
    }

    // Cleanup timer
    if (this._menuFooterInterval) {
      clearInterval(this._menuFooterInterval)
    }

    // Cleanup desktop timer
    if (this._desktopFooterInterval) {
      clearInterval(this._desktopFooterInterval)
    }
  },
  methods: {
    i18nRender,
    updateMenuFooterPosition () {
      this.$nextTick(() => {
        // Use requestAnimationFrame to update before the next repaint, avoiding CSS transition interruption
        requestAnimationFrame(() => {
          const menuFooter = this.$el?.querySelector('.custom-menu-footer')
          if (!menuFooter) return

          // Mobile: find drawer menu container
          if (this.isMobile) {
            const drawer = document.querySelector('.ant-drawer.ant-drawer-open')
            this.isDrawerOpen = !!drawer

            if (drawer && !this.isDrawerAnimating) {
              // const drawerRect = drawer.getBoundingClientRect()
              menuFooter.style.position = 'fixed'
              // menuFooter.style.left = `${drawerRect.left}px`
              // Width is controlled by CSS .collapsed class, not set here
              menuFooter.style.bottom = '0px'
              menuFooter.style.zIndex = '1001'
              menuFooter.style.display = 'block'
              menuFooter.style.opacity = '1'

              // Dynamically calculate footer height and set drawer body padding
              const footerHeight = menuFooter.offsetHeight || 280
              const drawerBody = drawer.querySelector('.ant-drawer-body')
              if (drawerBody) {
                // Set CSS variable for use in styles
                drawer.style.setProperty('--footer-height', `${footerHeight}px`)
                // Set padding-bottom directly to ensure menu content is not obscured
                drawerBody.style.paddingBottom = `${footerHeight + 10}px`
                // Ensure drawer body can scroll
                drawerBody.style.overflowY = 'auto'
                drawerBody.style.overflowX = 'hidden'
                drawerBody.style.webkitOverflowScrolling = 'touch'
              }

              return
            } else if (drawer && this.isDrawerAnimating) {
              // Drawer is animating, footer should be hidden or transparent
              menuFooter.style.opacity = '0'
              menuFooter.style.display = 'block'
              return
            } else {
              menuFooter.style.display = 'none'
              menuFooter.style.opacity = '0'
              // Clear drawer body padding
              const drawer = document.querySelector('.ant-drawer')
              if (drawer) {
                const drawerBody = drawer.querySelector('.ant-drawer-body')
                if (drawerBody) {
                  drawerBody.style.paddingBottom = ''
                  drawerBody.style.overflowY = ''
                  drawerBody.style.overflowX = ''
                }
              }
              return
            }
          }

          // Desktop: find normal menu container
          const sider = this.$el?.querySelector('.ant-pro-sider') || document.querySelector('.ant-pro-sider')
          if (sider) {
            const siderRect = sider.getBoundingClientRect()
          const footerHeight = menuFooter.offsetHeight || 220
            menuFooter.style.position = 'fixed'
            menuFooter.style.left = `${siderRect.left}px`
            // Width is controlled by CSS .collapsed class, not set here
            menuFooter.style.bottom = '0px'
            menuFooter.style.zIndex = '100'
            menuFooter.style.display = 'block'
          // Write footer height to CSS variable for use in styles
          sider.style.setProperty('--menu-footer-height', `${footerHeight}px`)
          // Reserve footer height for sidebar body and allow scrolling
          const siderChildren = sider.querySelector('.ant-layout-sider-children')
          if (siderChildren) {
            siderChildren.style.paddingBottom = `${footerHeight + 12}px`
            siderChildren.style.overflowY = 'auto'
            siderChildren.style.overflowX = 'hidden'
            siderChildren.style.webkitOverflowScrolling = 'touch'
          }
          // Further limit menu area height to prevent footer overlap
          const menuScroll = sider.querySelector('.ant-pro-sider-menu') ||
            sider.querySelector('.ant-menu-root') ||
            sider.querySelector('.ant-menu')
          if (menuScroll) {
            const availableHeight = Math.max(siderRect.height - footerHeight - 12, 120)
            menuScroll.style.maxHeight = `${availableHeight}px`
            menuScroll.style.overflowY = 'auto'
            menuScroll.style.overflowX = 'hidden'
            menuScroll.style.webkitOverflowScrolling = 'touch'
          }
          } else {
            // If menu not found, use default position
            menuFooter.style.position = 'fixed'
            menuFooter.style.left = '0px'
            // Width controlled by CSS .collapsed class
            menuFooter.style.bottom = '0px'
            menuFooter.style.zIndex = '100'
            menuFooter.style.display = 'block'
          }
        })
      })
    },
    handleRefresh () {
      // Only refresh the content area by changing the key to force re-render of router-view
      this.refreshKey += 1
    },
    handleMediaQuery (val) {
      this.query = val
      if (this.isMobile && !val['screen-xs']) {
        this.isMobile = false
        this.$nextTick(() => {
          this.updateMenuFooterPosition()
        })
        return
      }
      if (!this.isMobile && val['screen-xs']) {
        this.isMobile = true
        this.collapsed = false
        this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fluid
        // this.settings.fixSiderbar = false
        this.$nextTick(() => {
          this.updateMenuFooterPosition()
        })
      }
    },
    handleCollapse (val) {
      this.collapsed = val
      // When menu collapse state changes, update footer position
      // CSS transition will automatically handle smooth width and position transitions
      this.$nextTick(() => {
        this.updateMenuFooterPosition()
      })
    },
    handleMobileMenuToggle () {
      // Listen for mobile menu open/close
      this.$nextTick(() => {
        setTimeout(() => {
          this.updateMenuFooterPosition()
        }, 300) // Wait for drawer animation to complete
      })
    },
    handleSettingChange ({ type, value }) {
      type && (this.settings[type] = value)
      switch (type) {
        case 'theme':
          this.$store.commit(TOGGLE_NAV_THEME, value)
          break
        case 'primaryColor':
          this.$store.commit(TOGGLE_COLOR, value)
          break
        case 'layout':
          this.$store.commit(TOGGLE_LAYOUT, value)
          if (value === 'sidemenu') {
            this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fluid
          } else {
            this.settings.fixSiderbar = false
            this.settings.contentWidth = CONTENT_WIDTH_TYPE.Fixed
          }
          break
        case 'contentWidth':
          this.settings[type] = value
          this.$store.commit(TOGGLE_CONTENT_WIDTH, value)
          break
        case 'fixedHeader':
          this.$store.commit(TOGGLE_FIXED_HEADER, value)
          break
        case 'autoHideHeader':
          this.$store.commit(TOGGLE_HIDE_HEADER, value)
          break
        case 'fixSiderbar':
          this.$store.commit(TOGGLE_FIXED_SIDEBAR, value)
          break
        case 'colorWeak':
          this.$store.commit(TOGGLE_WEAK, value)
          break
        case 'multiTab':
          this.$store.commit(TOGGLE_MULTI_TAB, value)
          break
      }
    }
  }
}
</script>

<style lang="less">
@import "./BasicLayout.less";
.ant-pro-sider-menu-sider.light .ant-menu-light {
  height: 60vh!important;
}
/* Completely hide all footers */
.basic-layout-wrapper {
  .ant-layout-footer {
    display: none !important;
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }
}

/* Menu footer styles - positioned directly at the bottom of the menu */
.basic-layout-wrapper {
  position: relative;

  /* Custom menu footer - positioned to the menu area via CSS selector */
  .custom-menu-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
    width: 256px; /* Unified fixed width 256px */
    background: #001529; /* Default dark background */
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    /* Sync with menu drawer animation: same transition duration and easing function */
    /* Ant Design Vue Drawer uses 0.3s and cubic-bezier(0.78, 0.14, 0.15, 0.86) */
    transition: left 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                max-width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                opacity 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86);
    max-width: 256px;
    display: block; /* Visible by default */
    opacity: 1;

    &.collapsed {
      width: 80px; /* Menu width when collapsed */
      max-width: 80px;
    }

    /* Mobile: when menu is in a drawer, a higher z-index is needed */
    @media (max-width: 768px) {
      z-index: 1001; /* drawer z-index is usually 1000 */

      /* When drawer is not open, hide footer */
      &:not(.drawer-open) {
        display: none !important;
        opacity: 0;
      }

      /* When drawer is animating, footer should be transparent, waiting for animation to complete */
      &.drawer-animating {
        opacity: 0;
        transition: opacity 0.1s ease-out;
      }

      /* Footer is only visible when drawer is fully open and not animating */
      &.drawer-open:not(.drawer-animating) {
        opacity: 1;
        transition: left 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    max-width 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86),
                    opacity 0.3s cubic-bezier(0.78, 0.14, 0.15, 0.86) 0.1s; /* Delay 0.1s to ensure drawer appears first */
      }
    }

    /* Light theme */
    body.light &,
    .ant-pro-layout.light & {
      background: #fff;
      border-top-color: #e8e8e8;
      color: rgba(0, 0, 0, 0.85);

      .menu-footer-content {
        .footer-section {
          .section-links a {
            color: rgba(0, 0, 0, 0.65);
          }
        }
        .social-icon {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(0, 0, 0, 0.65);
          &:hover {
            background: rgba(0, 0, 0, 0.1);
            color: rgba(0, 0, 0, 0.85);
          }
          .social-icon-svg {
            color: currentColor;
          }
        }
      }
    }

    /* Dark theme */
    body.dark &,
    body.realdark &,
    .ant-pro-layout.dark &,
    .ant-pro-layout.realdark & {
      background: #001529;
      border-top-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.65);

      .menu-footer-content {
        .footer-section {
          .section-links a {
            color: rgba(255, 255, 255, 0.65);
          }
        }
        .social-icon {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.65);
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.85);
          }
          .social-icon-svg {
            color: currentColor;
          }
        }
      }
    }

    .menu-footer-content {
      padding: 12px 16px;
      font-size: 11px;
      color: inherit;
      max-height: 30vh;
      overflow-y: auto;
      overflow-x: hidden;

      /* Hide scrollbar but keep scroll functionality */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      .footer-section {
        margin-bottom: 12px;
        text-align: center;

        &:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 6px;
          opacity: 0.8;
          color: inherit;
        }

        .section-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
          font-size: 10px;
          opacity: 0.7;

          a {
            cursor: pointer;
            color: inherit;
            text-decoration: underline;
            transition: opacity 0.2s;

            &:hover {
              opacity: 1;
            }
          }

          .separator {
            opacity: 0.5;
            margin: 0 2px;
          }
        }

        .social-icons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;

          .social-icon {
            width: 15px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.05);
            text-decoration: none;
            overflow: hidden;

            &:hover {
              opacity: 1;
              background: rgba(255, 255, 255, 0.1);
              transform: translateY(-2px);
            }

            .social-icon-svg {
              width: 15x;
              height: 15px;
              color: currentColor;
            }

            .anticon {
              font-size: 16px;
            }

            .social-logo {
              width: 15px;
              height: 15px;
              object-fit: contain;
            }

            .social-icon-text {
              font-size: 10px;
              font-weight: bold;
            }
          }
        }

        &.copyright {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          opacity: 0.6;
          font-size: 10px;
        }

        &.version {
          margin-top: 4px;
          font-size: 9px;
          opacity: 0.4;
          text-align: center;
          letter-spacing: 1px;
        }
      }
    }

    .menu-footer-content-collapsed {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      opacity: 0.6;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      .anticon {
        font-size: 16px;
      }

      &:hover {
        opacity: 1;
      }
    }
  }

  /* Listen for menu collapse state, dynamically adjust width */
  ::v-deep .ant-pro-layout {
    &.ant-pro-sider-collapsed ~ .custom-menu-footer,
    .ant-pro-sider-collapsed ~ .custom-menu-footer {
      width: 80px;
    }
  }
}

/* Sidebar menu scroll & reserve space for custom footer */
.basic-layout-wrapper {
  .ant-layout-sider-children {
    padding-bottom: calc(var(--menu-footer-height, 220px) + 12px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.15) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 3px;
    }

    body.dark &,
    body.realdark &,
    .ant-pro-layout.dark &,
    .ant-pro-layout.realdark & {
      scrollbar-color: rgba(255, 255, 255, 0.25) transparent;

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  /* Force sidebar and menu area to be scrollable, preventing footer overlap */
  .ant-pro-sider {
    height: 100vh;
    display: flex;
    flex-direction: column;

    .ant-layout-sider-children {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .ant-pro-sider-menu,
    .ant-menu-root,
    .ant-menu {
      flex: 1 1 auto;
      min-height: 0;
      max-height: calc(100vh - var(--menu-footer-height, 220px) - 24px);
      overflow-y: auto !important;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
  }
}

/* Dark theme styles */
.basic-layout-wrapper.dark,
.basic-layout-wrapper.realdark {
  /* Header adaptation */
  .ant-pro-global-header {
    background: #001529 !important;
    color: rgba(255, 255, 255, 0.85) !important;

    .ant-pro-global-header-trigger {
      color: rgba(255, 255, 255, 0.85) !important;
      &:hover {
        background: rgba(255, 255, 255, 0.03) !important;
      }
    }

    .action {
      color: rgba(255, 255, 255, 0.85) !important;
      &:hover {
        background: rgba(255, 255, 255, 0.03) !important;
      }
    }
  }

  /* Content adaptation */
  .ant-pro-basicLayout-content {
    background-color: #141414 !important;
  }

  /* Ensure Layout itself is also dark */
  .ant-layout {
    background-color: #141414 !important;
  }
}

/* Mobile: fix footer overlapping menu issue */
@media (max-width: 768px) {
  /* Allow drawer body to scroll, add bottom padding to prevent footer overlap */
  .ant-drawer.ant-drawer-open {
    /* Ensure drawer container displays normally */
    .ant-drawer-content-wrapper {
      overflow: visible;
    }

    .ant-drawer-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: visible;
    }

    .ant-drawer-wrapper-body {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: visible;
    }

    .ant-drawer-body {
      /* Allow menu content to scroll */
      overflow-y: auto !important;
      overflow-x: hidden !important;
      /* Add bottom padding equal to footer height (dynamically set by JS) */
      /* Default 280px as fallback */
      padding-bottom: var(--footer-height, 280px) !important;
      /* Ensure smooth scrolling */
      -webkit-overflow-scrolling: touch;
      /* Hide scrollbar but keep scroll functionality */
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
      /* Ensure menu content area has sufficient height */
      min-height: 0;
      flex: 1;
    }
  }
}

</style>
