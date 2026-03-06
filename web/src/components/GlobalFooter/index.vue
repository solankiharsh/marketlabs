<template>
  <div :class="footerCls">
    <global-footer class="footer custom-render">
      <template v-slot:links>
        <a @click="showLegal = true" style="cursor: pointer;">{{ $t('user.login.legal.title') }} © 2025-2026 MarketLabs</a>
      </template>
    </global-footer>

    <a-modal :visible="showLegal" :title="$t('user.login.legal.title')" :footer="null" @cancel="showLegal = false">
      <div :class="['legal-content', { 'legal-content-dark': isDarkTheme }]">
        {{ $t('user.login.legal.content') }}
      </div>
      <div style="margin-top: 12px; text-align: right;">
        <a-button type="primary" @click="showLegal = false">OK</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { GlobalFooter } from '@ant-design-vue/pro-layout'
import { baseMixin } from '@/store/app-mixin'

export default {
  name: 'ProGlobalFooter',
  components: {
    GlobalFooter
  },
  mixins: [baseMixin],
  data () {
    return {
      showLegal: false
    }
  },
  computed: {
    // Check if dark theme is active
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    // Footer container class name
    footerCls () {
      return {
        'footer-wrapper': true,
        'footer-wrapper-dark': this.isDarkTheme
      }
    }
  }
}
</script>

<style lang="less">
/* Not using scoped, directly overriding global styles */
.footer-wrapper {
  /* Adjust inner padding */
  .ant-pro-global-footer {
    padding: 4px 16px 8px;
    margin: 0;
  }
  .ant-pro-global-footer-links {
    margin-bottom: 2px;
    padding: 0;
  }
  .ant-pro-global-footer-copyright {
    margin-top: 2px;
    padding: 0;
  }
}

/* Light theme (default) - ensure text is dark */
.footer-wrapper {
  .ant-pro-global-footer {
    background: transparent !important;
    color: rgba(0, 0, 0, 0.65) !important;
  }

  /* Link color */
  .ant-pro-global-footer-links {
    a {
      color: rgba(0, 0, 0, 0.65) !important;

      &:hover {
        color: #1890ff !important;
      }
    }
  }

  /* Copyright text color */
  .ant-pro-global-footer-copyright {
    color: rgba(0, 0, 0, 0.65) !important;
  }
}

/* Light theme (default) */
.legal-content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.85);
}

/* Dark theme - controlled via outer component class name */
.footer-wrapper-dark {
  .ant-pro-global-footer {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.65) !important;
    border-top: none !important;
  }

  /* Link color */
  .ant-pro-global-footer-links {
    a {
      color: rgba(255, 255, 255, 0.65) !important;

      &:hover {
        color: #1890ff !important;
      }
    }
  }

  /* Copyright text color */
  .ant-pro-global-footer-copyright {
    color: rgba(255, 255, 255, 0.65) !important;
  }

  /* Modal content color */
  .legal-content {
    color: rgba(255, 255, 255, 0.85) !important;
  }
}
</style>
