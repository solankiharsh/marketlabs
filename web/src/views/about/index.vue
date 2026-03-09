<template>
  <div class="about-page" :class="{ 'theme-dark': isDarkTheme }">

    <!-- Hero Header -->
    <div class="hero-header">
      <h1 class="hero-title">About MarketLabs</h1>
      <p class="hero-subtitle">AI-Native Quantitative Trading Platform</p>
    </div>

    <!-- Community & Social Links -->
    <div class="section-header">
      <h2><a-icon type="global" /> Community &amp; Social</h2>
      <p>Connect with us across platforms</p>
    </div>

    <a-row :gutter="16" class="community-row">
      <a-col :xs="24" :sm="12" :md="6" v-for="link in communityLinks" :key="link.title">
        <a-card :bordered="false" class="community-card">
          <div class="community-icon" :style="{ background: link.iconBg }">
            <a-icon :type="link.icon" :style="{ color: '#fff', fontSize: '28px' }" />
            <a-icon v-if="link.locked" type="lock" class="lock-badge" />
          </div>
          <div class="community-info">
            <h3>{{ link.title }}</h3>
            <p class="community-sub">{{ link.subtitle }}</p>
            <p class="community-desc">{{ link.description }}</p>
            <a v-if="link.url" :href="link.url" target="_blank" rel="noopener noreferrer" class="community-link">
              <a-icon type="link" /> {{ link.url }}
            </a>
            <span v-else class="community-lock-text">
              <a-icon type="lock" /> {{ link.lockText }}
            </span>
          </div>
          <div class="qr-placeholder">
            <a-icon type="qrcode" style="font-size: 24px; color: #888;" />
            <span>QR Code</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-divider />

    <!-- Features Showcase -->
    <div class="section-header">
      <h2><a-icon type="appstore" /> Features Showcase</h2>
      <p>Everything you need for quantitative trading</p>
    </div>

    <div
      v-for="(feature, idx) in features"
      :key="feature.name"
      class="feature-section"
      :class="{ 'feature-reverse': idx % 2 === 1 }"
    >
      <a-row :gutter="32" type="flex" align="middle">
        <a-col :xs="24" :md="12" :class="{ 'feature-img-col': true }">
          <div class="screenshot-placeholder">
            <a-icon type="camera" style="font-size: 32px; margin-bottom: 8px;" />
            <span>{{ feature.screenshotHint }}</span>
          </div>
        </a-col>
        <a-col :xs="24" :md="12">
          <div class="feature-content">
            <a-tag color="#13C2C2">{{ feature.badge }}</a-tag>
            <h3 class="feature-name">{{ feature.name }}</h3>
            <p class="feature-tagline">{{ feature.tagline }}</p>
            <p class="feature-desc">{{ feature.description }}</p>
            <ul class="feature-bullets">
              <li v-for="(bullet, bIdx) in feature.bullets" :key="bIdx">{{ bullet }}</li>
            </ul>
          </div>
        </a-col>
      </a-row>
    </div>

    <a-divider />

    <!-- Closing Section -->
    <div class="closing-section">
      <h2>Trade with Clarity</h2>
      <ul class="closing-bullets">
        <li><a-icon type="filter" /> Removes noise from market data</li>
        <li><a-icon type="desktop" /> Brings all critical insights onto one screen</li>
        <li><a-icon type="bulb" /> AI-powered analysis replaces guesswork</li>
        <li><a-icon type="clock-circle" /> Automated strategies execute while you sleep</li>
        <li><a-icon type="global" /> Multi-market coverage in one platform</li>
      </ul>
    </div>

  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'AboutPage',
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    }
  },
  data () {
    return {
      communityLinks: [
        {
          icon: 'message',
          iconBg: '#0088cc',
          title: 'Telegram',
          subtitle: 'Open Community',
          description: 'Join our free community for market discussions, strategy sharing, and platform updates.',
          url: 'https://t.me/marketlabs',
          locked: false
        },
        {
          icon: 'message',
          iconBg: 'linear-gradient(135deg, #0088cc, #005580)',
          title: 'Telegram',
          subtitle: 'Members Only',
          description: 'Exclusive channel with premium signals, early features, and direct support.',
          url: null,
          locked: true,
          lockText: 'Subscribe to get access'
        },
        {
          icon: 'youtube',
          iconBg: '#FF0000',
          title: 'YouTube',
          subtitle: 'Free Learning',
          description: 'Tutorials, strategy breakdowns, and platform walkthroughs updated weekly.',
          url: 'https://youtube.com/@marketlabs',
          locked: false
        },
        {
          icon: 'instagram',
          iconBg: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)',
          title: 'Instagram',
          subtitle: 'Daily Market Pulse',
          description: 'Quick market updates, chart highlights, and trading tips every day.',
          url: 'https://instagram.com/marketlabs',
          locked: false
        }
      ],
      features: [
        {
          badge: 'Monitors',
          name: 'Dashboard',
          tagline: 'Your Trading Command Center',
          description: 'Get a bird\'s eye view of your entire trading operation in one place.',
          bullets: [
            'KPIs: total equity, active strategies, P&L, win rate',
            'Pending orders overview',
            'Real-time portfolio performance tracking'
          ],
          screenshotHint: 'Navigate to /dashboard after creating a strategy'
        },
        {
          badge: 'Analyzes',
          name: 'AI Analysis',
          tagline: 'AI-Powered Market Intelligence',
          description: 'Harness AI to understand market sentiment, trends, and opportunities across global markets.',
          bullets: [
            'Global market heatmaps (Crypto, US, Forex, India)',
            'Financial news, economic calendar, sentiment',
            'Per-asset AI analysis with confidence scores'
          ],
          screenshotHint: 'Navigate to /ai-analysis, run analysis on BTC/USDT'
        },
        {
          badge: 'Creates',
          name: 'Indicator Analysis',
          tagline: 'Build Custom Trading Indicators',
          description: 'Write, test, and deploy custom indicators using a full Python sandbox.',
          bullets: [
            'Python sandbox with pandas/numpy',
            'Backtest with historical data',
            'Publish to marketplace'
          ],
          screenshotHint: 'Navigate to /indicator-analysis, open an indicator'
        },
        {
          badge: 'Discovers',
          name: 'Indicator Marketplace',
          tagline: 'Community-Powered Strategies',
          description: 'Explore indicators built by the community — free and premium.',
          bullets: [
            'Browse free & paid indicators',
            'Search, filter, rate, comment'
          ],
          screenshotHint: 'Navigate to /indicator-community'
        },
        {
          badge: 'Executes',
          name: 'Trading Assistant',
          tagline: 'Automated Strategy Execution',
          description: 'Connect to 20+ exchanges and automate your strategies with confidence.',
          bullets: [
            '20+ exchanges: Binance, IBKR, MT5, Zerodha, etc.',
            'Paper & live trading modes',
            'Market & maker order types'
          ],
          screenshotHint: 'Navigate to /trading-assistant, create a strategy'
        },
        {
          badge: 'Tracks',
          name: 'Portfolio',
          tagline: 'Real-Time Position Tracking',
          description: 'Track manual positions across all markets with live P&L updates.',
          bullets: [
            'Manual positions across all markets',
            'Live P&L with price feeds',
            'AI monitoring & alerts'
          ],
          screenshotHint: 'Navigate to /portfolio, add a position'
        },
        {
          badge: 'Unifies',
          name: 'AI Asset Analysis',
          tagline: 'Unified Analysis Workflow',
          description: 'Combine asset pools, instant analysis, and scheduled monitoring in one view.',
          bullets: [
            'Asset pool management',
            'Instant analysis in one click',
            'Scheduled monitoring tasks'
          ],
          screenshotHint: 'Navigate to /ai-asset-analysis'
        }
      ]
    }
  }
}
</script>

<style lang="less" scoped>
.about-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Hero Header */
.hero-header {
  text-align: center;
  padding: 48px 0 32px;
}
.hero-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1a1a1a;
}
.hero-subtitle {
  font-size: 18px;
  color: #666;
  margin: 0;
}

/* Section Headers */
.section-header {
  margin-bottom: 24px;
  h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #1a1a1a;
  }
  p {
    color: #888;
    margin: 0;
  }
}

/* Community Cards */
.community-row {
  margin-bottom: 24px;
}
.community-card {
  text-align: center;
  border-radius: 12px;
  margin-bottom: 16px;
  background: #f7f8fa;
  .community-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    position: relative;
  }
  .lock-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 14px;
    color: #faad14;
    background: #fff;
    border-radius: 50%;
    padding: 2px;
  }
  .community-info {
    h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 2px;
      color: #1a1a1a;
    }
    .community-sub {
      font-size: 12px;
      color: #13C2C2;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .community-desc {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
      min-height: 54px;
    }
    .community-link {
      font-size: 12px;
      color: #13C2C2;
      word-break: break-all;
    }
    .community-lock-text {
      font-size: 12px;
      color: #faad14;
    }
  }
  .qr-placeholder {
    margin-top: 12px;
    width: 120px;
    height: 120px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 12px;
    span {
      margin-top: 4px;
    }
  }
}

/* Feature Sections */
.feature-section {
  margin-bottom: 48px;
}
.feature-reverse {
  .ant-row-flex {
    flex-direction: row-reverse;
  }
}
.screenshot-placeholder {
  width: 100%;
  height: 300px;
  border: 2px dashed #555;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 14px;
  background: #f0f0f0;
}
.feature-content {
  .feature-name {
    font-size: 22px;
    font-weight: 600;
    margin: 8px 0 4px;
    color: #1a1a1a;
  }
  .feature-tagline {
    font-size: 16px;
    color: #13C2C2;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .feature-desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }
  .feature-bullets {
    padding-left: 20px;
    li {
      font-size: 14px;
      color: #555;
      margin-bottom: 6px;
    }
  }
}

/* Closing Section */
.closing-section {
  text-align: center;
  padding: 32px 0 48px;
  h2 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 20px;
    color: #1a1a1a;
  }
  .closing-bullets {
    list-style: none;
    padding: 0;
    display: inline-block;
    text-align: left;
    li {
      font-size: 16px;
      color: #555;
      margin-bottom: 12px;
      i {
        color: #13C2C2;
        margin-right: 8px;
      }
    }
  }
}

/* Responsive — Tablet */
@media (max-width: 768px) {
  .about-page {
    padding: 16px;
  }
  .hero-header {
    padding: 32px 0 20px;
  }
  .hero-title {
    font-size: 28px;
  }
  .hero-subtitle {
    font-size: 15px;
  }
  .section-header h2 {
    font-size: 20px;
  }
  .feature-section {
    margin-bottom: 32px;
  }
  .feature-reverse .ant-row-flex {
    flex-direction: column;
  }
  .screenshot-placeholder {
    height: 200px;
    margin-bottom: 16px;
  }
  .feature-content {
    .feature-name { font-size: 18px; }
    .feature-tagline { font-size: 14px; }
  }
  .closing-section {
    padding: 24px 0 32px;
    h2 { font-size: 22px; }
    .closing-bullets li { font-size: 14px; }
  }
}

/* Responsive — Phone */
@media (max-width: 576px) {
  .about-page {
    padding: 12px;
  }
  .hero-header {
    padding: 20px 0 16px;
  }
  .hero-title {
    font-size: 22px;
  }
  .hero-subtitle {
    font-size: 13px;
  }
  .section-header {
    margin-bottom: 16px;
    h2 { font-size: 18px; }
    p { font-size: 12px; }
  }
  .community-card {
    .qr-placeholder {
      width: 80px;
      height: 80px;
    }
    .community-info .community-desc {
      min-height: auto;
      font-size: 12px;
    }
  }
  .feature-section {
    margin-bottom: 24px;
  }
  .screenshot-placeholder {
    height: 160px;
  }
  .feature-content {
    .feature-name { font-size: 16px; }
    .feature-desc { font-size: 13px; }
    .feature-bullets li { font-size: 13px; }
  }
  .closing-section {
    padding: 16px 0 24px;
    h2 { font-size: 20px; }
    .closing-bullets li { font-size: 13px; margin-bottom: 8px; }
  }
}

/* Dark Theme */
.theme-dark {
  .hero-title,
  .section-header h2,
  .closing-section h2 {
    color: #f0f0f0;
  }
  .hero-subtitle,
  .section-header p {
    color: #aaa;
  }
  .community-card {
    background: #1e1e2d;
    .community-info {
      h3 { color: #f0f0f0; }
      .community-desc { color: #aaa; }
    }
    .qr-placeholder {
      border-color: #555;
      color: #aaa;
    }
  }
  .screenshot-placeholder {
    background: #1e1e2d;
    border-color: #555;
    color: #aaa;
  }
  .feature-content {
    .feature-name { color: #f0f0f0; }
    .feature-desc { color: #aaa; }
    .feature-bullets li { color: #bbb; }
  }
  .closing-section .closing-bullets li {
    color: #bbb;
  }
}
</style>
