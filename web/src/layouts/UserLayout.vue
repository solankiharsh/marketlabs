<template>
  <div id="userLayout" :class="['user-layout-wrapper', isMobile && 'mobile']">
    <div class="container">
      <!-- Magenta orb grid background (white + grid lines + radial gradient) -->
      <div class="grid-bg" aria-hidden="true" />
      <div class="user-layout-content">
        <div class="top">
          <div class="header">
            <a href="/" class="brand-link">
              <img src="/slogo.png" class="logo" alt="MarketLabs">
              <h1 class="brand-name">MarketLabs</h1>
              <p class="brand-tagline">INSIGHT FROM COMPLEXITY</p>
            </a>
          </div>
        </div>

        <div class="main-content">
          <router-view />
        </div>

        <div class="footer">
          <div class="copyright">
            Copyright &copy; 2025-2026 MarketLabs. All rights reserved.
            <div class="footer-risk-wrap">
              <a @click="toggleRisk" class="footer-risk-toggle">
                {{ showRisk ? $t('user.login.privacy.collapse') : $t('user.login.privacy.view') }}
              </a>
              <div v-if="showRisk" class="footer-risk-content">
                <div class="footer-risk-title">{{ $t('user.login.privacy.title') }}</div>
                {{ $t('user.login.privacy.content') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { deviceMixin } from '@/store/device-mixin'

export default {
  name: 'UserLayout',
  components: {},
  mixins: [deviceMixin],
  data () {
    return {
      showRisk: false
    }
  },
  methods: {
    toggleRisk () {
      this.showRisk = !this.showRisk
    }
  },
  mounted () {
    document.body.classList.add('userLayout')
  },
  beforeDestroy () {
    document.body.classList.remove('userLayout')
  }
}
</script>

<style lang="less" scoped>
#userLayout.user-layout-wrapper {
  height: 100%;

  &.mobile {
    .container {
      .main {
        max-width: 368px;
        width: 98%;
      }
    }
  }

  .container {
    width: 100%;
    min-height: 100vh;
    position: relative;
    background: #fff;

    /* Magenta orb grid: grid lines + radial gradient (matches grid-background.tsx) */
    .grid-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: #fff;
      background-image:
        linear-gradient(to right, rgba(71, 85, 105, 0.15) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(71, 85, 105, 0.15) 1px, transparent 1px),
        radial-gradient(circle at 50% 60%, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.05) 40%, transparent 70%);
      background-size: 40px 40px, 40px 40px, 100% 100%;
    }

    .user-layout-content {
      padding: 24px 0 20px;
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 40px);
      position: relative;
      z-index: 1;

      .top {
        text-align: center;

        .header {
          padding: 16px 0 12px;

          .brand-link {
            display: block;
            text-decoration: none;
            color: inherit;
          }

          .logo {
            display: block;
            margin: 0 auto 8px;
            max-height: 80px;
            width: auto;
            max-width: 180px;
            object-fit: contain;
            border: none;
          }

          .brand-name {
            margin: 0 0 2px;
            font-size: 28px;
            font-weight: 700;
            color: rgba(0, 0, 0, 0.88);
            font-family: Avenir, 'Helvetica Neue', Arial, Helvetica, sans-serif;
            letter-spacing: -0.02em;
          }

          .brand-tagline {
            margin: 0;
            font-size: 12px;
            font-weight: 500;
            color: rgba(0, 0, 0, 0.45);
            letter-spacing: 0.08em;
          }
        }
      }

      .main {
        min-width: 320px;
        width: 480px;
        margin: 0 auto;
      }

      .main-content {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        padding-top: 8px;
      }

      .footer {
        width: 100%;
        padding: 0 16px;
        margin-top: auto;
        margin-bottom: 16px;
        text-align: center;

        .links {
          margin-bottom: 8px;
          font-size: 14px;
          a {
            color: rgba(0, 0, 0, 0.45);
            transition: all 0.3s;
            &:not(:last-child) {
              margin-right: 40px;
            }
          }
        }
        .copyright {
          color: rgba(0, 0, 0, 0.45);
          font-size: 14px;

          .footer-risk-wrap {
            width: 70%;
            margin: 10px auto 0;
            text-align: center;
          }
          .footer-risk-toggle {
            color: #1890ff;
            cursor: pointer;
            &:hover { text-decoration: underline; }
          }
          .footer-risk-content {
            margin-top: 10px;
            font-size: 12px;
            line-height: 1.6;
            text-align: left;
            color: rgba(0, 0, 0, 0.65);
          }
          .footer-risk-title {
            font-weight: 600;
            margin-bottom: 6px;
          }
        }
      }
    }

    a {
      text-decoration: none;
    }

  }
}

@media (max-width: 576px) {
  #userLayout.user-layout-wrapper .container .user-layout-content .top .header .logo {
    max-height: 64px;
    max-width: 140px;
  }
  #userLayout.user-layout-wrapper .container .user-layout-content .top .header .brand-name {
    font-size: 24px;
  }
  #userLayout.user-layout-wrapper .container .user-layout-content .main {
    width: 92vw;
  }
  #userLayout.user-layout-wrapper .container .user-layout-content .footer .copyright .footer-risk-wrap {
    width: 90%;
  }
}
</style>
