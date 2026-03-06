<template>
  <div class="chart-left" :class="{ 'theme-dark': chartTheme === 'dark' }">
    <div class="chart-wrapper">
      <!-- Drawing tools toolbar -->
      <div class="drawing-toolbar">
        <a-tooltip
          v-for="tool in drawingTools"
          :key="tool.name"
          :title="tool.title"
          placement="right"
        >
          <div
            class="drawing-tool-btn"
            :class="{ active: activeDrawingTool === tool.name }"
            @click="selectDrawingTool(tool.name)"
          >
            <a-icon :type="tool.icon" />
          </div>
        </a-tooltip>
        <a-divider type="vertical" />
        <a-tooltip :title="$t('dashboard.indicator.drawing.clearAll')" placement="right">
          <div class="drawing-tool-btn" @click="clearAllDrawings">
            <a-icon type="delete" />
          </div>
        </a-tooltip>
      </div>
      <!-- Chart content area -->
      <div class="chart-content-area">
        <!-- Indicator toolbar -->
        <div class="indicator-toolbar">
          <div
            v-for="indicator in indicatorButtons"
            :key="indicator.id"
            class="indicator-btn"
            :class="{ active: isIndicatorActive(indicator.id) }"
            @click="toggleIndicator(indicator)"
            :title="indicator.name"
          >
            {{ indicator.shortName }}
          </div>
        </div>
        <div
          id="kline-chart-container"
          class="kline-chart-container"
        ></div>
      </div>

      <div v-if="loading" class="chart-overlay">
        <a-spin size="large">
          <a-icon slot="indicator" type="loading" style="font-size: 24px; color: #13c2c2" spin />
        </a-spin>
      </div>

      <div v-if="error" class="chart-overlay">
        <div class="error-box">
          <a-icon type="warning" style="font-size: 24px; color: #ef5350; margin-bottom: 10px" />
          <span>{{ error }}</span>
          <a-button type="primary" size="small" ghost @click="handleRetry" style="margin-top: 12px">
            {{ $t('dashboard.indicator.retry') }}
          </a-button>
        </div>
      </div>

      <!-- Pyodide load failure notice -->
      <div v-if="pyodideLoadFailed" class="chart-overlay pyodide-warning">
        <div class="warning-box">
          <a-icon type="warning" style="font-size: 32px; color: #faad14; margin-bottom: 12px" />
          <div class="warning-title">{{ $t('dashboard.indicator.warning.pyodideLoadFailed') }}</div>
          <div class="warning-desc">{{ $t('dashboard.indicator.warning.pyodideLoadFailedDesc') }}</div>
        </div>
      </div>

      <!-- Initial hint overlay -->
      <div v-if="!symbol && !loading && !error && !pyodideLoadFailed" class="chart-overlay initial-hint">
        <div class="hint-box">
          <a-icon type="line-chart" style="font-size: 48px; color: #1890ff; margin-bottom: 16px" />
          <div class="hint-title">{{ $t('dashboard.indicator.hint.selectSymbol') }}</div>
          <div class="hint-desc">{{ $t('dashboard.indicator.hint.selectSymbolDesc') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, shallowRef, getCurrentInstance } from 'vue'
import { init, registerIndicator, registerOverlay } from 'klinecharts'
import request from '@/utils/request'
import { decryptCodeAuto, needsDecrypt } from '@/utils/codeDecrypt'

export default {
  name: 'KlineChart',
  props: {
    symbol: {
      type: String,
      default: ''
    },
    market: {
      type: String,
      default: ''
    },
    timeframe: {
      type: String,
      default: '1H'
    },
    theme: {
      type: String,
      default: 'light'
    },
    activeIndicators: {
      type: Array,
      default: () => []
    },
    realtimeEnabled: {
      type: Boolean,
      default: false
    },
    userId: {
      type: Number,
      default: null
    }
  },
  emits: ['retry', 'price-change', 'load', 'indicator-toggle'],
  setup (props, { emit }) {
    // K-line data
    const klineData = shallowRef([])
    const loading = ref(false)
    const error = ref(null)
    const loadingHistory = ref(false)
    const hasMoreHistory = ref(true)
    // Track ongoing load requests to prevent duplicates
    let loadingHistoryPromise = null
    // Flag whether chart initialization is complete to avoid triggering loads during init
    const chartInitialized = ref(false)

    // Chart instance
    const chartRef = shallowRef(null)
    const chartTheme = ref(props.theme || 'light')

    // Realtime update settings
    const realtimeTimer = ref(null)
    const realtimeInterval = ref(5000)

    // Indicator refresh lock: prevent updateIndicators re-entry when realtime timer fires (Python indicators may be slow)
    const indicatorsUpdating = ref(false)
    // Indicator refresh throttle: K-line/price can refresh frequently, but indicator calculations can refresh less often (default 10s)
    const indicatorRefreshInterval = ref(10000)
    const lastIndicatorRefreshTs = ref(0)

    // When K-line refreshes frequently, indicator calculations need not sync at the same rate; throttle here (with re-entry lock).
    const maybeUpdateIndicators = (force = false) => {
      if (!chartRef.value) return
      const now = Date.now()
      const iv = Number(indicatorRefreshInterval.value || 10000)
      if (force || !lastIndicatorRefreshTs.value || (now - lastIndicatorRefreshTs.value) >= iv) {
        lastIndicatorRefreshTs.value = now
        updateIndicators()
      }
    }

    // List of added indicator IDs (for cleanup)
    const addedIndicatorIds = ref([])
    // List of added signal overlay IDs (for cleanup)
    const addedSignalOverlayIds = ref([])
    // List of added drawing overlay IDs (for cleanup and management)
    const addedDrawingOverlayIds = ref([])
    // Currently active drawing tool
    const activeDrawingTool = ref(null)

    // Drawing tool definitions (using computed for i18n support)
    const { proxy } = getCurrentInstance()

    const drawingTools = computed(() => [
      { name: 'line', title: proxy.$t('dashboard.indicator.drawing.line'), icon: 'line' },
      { name: 'horizontalLine', title: proxy.$t('dashboard.indicator.drawing.horizontalLine'), icon: 'minus' },
      { name: 'verticalLine', title: proxy.$t('dashboard.indicator.drawing.verticalLine'), icon: 'column-width' },
      { name: 'ray', title: proxy.$t('dashboard.indicator.drawing.ray'), icon: 'arrow-right' },
      { name: 'straightLine', title: proxy.$t('dashboard.indicator.drawing.straightLine'), icon: 'menu' },
      { name: 'parallelStraightLine', title: proxy.$t('dashboard.indicator.drawing.parallelLine'), icon: 'menu' },
      { name: 'priceLine', title: proxy.$t('dashboard.indicator.drawing.priceLine'), icon: 'dollar' },
      { name: 'priceChannelLine', title: proxy.$t('dashboard.indicator.drawing.priceChannel'), icon: 'border' },
      { name: 'fibonacciLine', title: proxy.$t('dashboard.indicator.drawing.fibonacciLine'), icon: 'rise' }
    ])

    // Indicator button definitions
    const indicatorButtons = ref([
      { id: 'sma', name: 'SMA (Simple Moving Average)', shortName: 'SMA', type: 'line', defaultParams: { length: 20 } },
      { id: 'ema', name: 'EMA (Exponential Moving Average)', shortName: 'EMA', type: 'line', defaultParams: { length: 20 } },
      { id: 'rsi', name: 'RSI (Relative Strength Index)', shortName: 'RSI', type: 'line', defaultParams: { length: 14 } },
      { id: 'macd', name: 'MACD', shortName: 'MACD', type: 'macd', defaultParams: { fast: 12, slow: 26, signal: 9 } },
      { id: 'bb', name: 'Bollinger Bands', shortName: 'BB', type: 'band', defaultParams: { length: 20, mult: 2 } },
      { id: 'atr', name: 'ATR (Average True Range)', shortName: 'ATR', type: 'line', defaultParams: { period: 14 } },
      { id: 'cci', name: 'CCI (Commodity Channel Index)', shortName: 'CCI', type: 'line', defaultParams: { length: 20 } },
      { id: 'williams', name: 'Williams %R', shortName: 'W%R', type: 'line', defaultParams: { length: 14 } },
      { id: 'mfi', name: 'MFI (Money Flow Index)', shortName: 'MFI', type: 'line', defaultParams: { length: 14 } },
      { id: 'adx', name: 'ADX (Average Directional Index)', shortName: 'ADX', type: 'adx', defaultParams: { length: 14 } },
      { id: 'obv', name: 'OBV (On-Balance Volume)', shortName: 'OBV', type: 'line', defaultParams: {} },
      { id: 'adosc', name: 'ADOSC (Accumulation/Distribution Oscillator)', shortName: 'ADOSC', type: 'line', defaultParams: { fast: 3, slow: 10 } },
      { id: 'ad', name: 'AD (Accumulation/Distribution Line)', shortName: 'AD', type: 'line', defaultParams: {} },
      { id: 'kdj', name: 'KDJ (Stochastic Oscillator)', shortName: 'KDJ', type: 'line', defaultParams: { period: 9, k: 3, d: 3 } }
    ])

    // Check if indicator is active
    const isIndicatorActive = (indicatorId) => {
      return props.activeIndicators.some(ind => ind.id === indicatorId)
    }

    // Select drawing tool
    const selectDrawingTool = (toolName) => {
      if (!chartRef.value) {
        return
      }

      // Tool name mapping (UI tool name -> klinecharts internal overlay name)
      const toolMap = {
        line: 'segment',
        horizontalLine: 'horizontalStraightLine',
        verticalLine: 'verticalStraightLine',
        ray: 'rayLine',
        straightLine: 'straightLine',
        parallelStraightLine: 'parallelStraightLine',
        priceLine: 'priceLine',
        priceChannelLine: 'priceChannelLine',
        fibonacciLine: 'fibonacciLine'
      }

      const overlayName = toolMap[toolName] || toolName

      // If clicking the currently active tool, deactivate it
      if (activeDrawingTool.value === toolName) {
        activeDrawingTool.value = null
        // Cancel current drawing mode
        // KLineChart has no direct "cancelDrawing" API; typically remove the last incomplete overlay
        // Or cancel the ongoing action via overrideOverlay(null) (if supported)
        try {
          if (typeof chartRef.value.overrideOverlay === 'function') {
            chartRef.value.overrideOverlay(null)
          }
        } catch (e) {
        }
        return
      }

      // Activate new drawing tool
      activeDrawingTool.value = toolName

      try {
        // Prepare overlay config
        const overlayConfig = {
          name: overlayName,
          lock: false, // Allow editing
          extendData: {
            isDrawing: true // Mark as currently drawing
          }
        }

        // Call createOverlay without points; the library will automatically enter drawing mode
        const overlayId = chartRef.value.createOverlay(overlayConfig)

        if (overlayId) {
          addedDrawingOverlayIds.value.push(overlayId)
        } else {
          activeDrawingTool.value = null
        }
      } catch (err) {
        activeDrawingTool.value = null
      }
    }

    // Clear all drawings
    const clearAllDrawings = () => {
      if (!chartRef.value) return

      try {
        // Remove all added drawing overlays
        addedDrawingOverlayIds.value.forEach(overlayId => {
          try {
            if (typeof chartRef.value.removeOverlay === 'function') {
              chartRef.value.removeOverlay(overlayId)
            } else if (typeof chartRef.value.removeOverlayById === 'function') {
              chartRef.value.removeOverlayById(overlayId)
            }
          } catch (err) {
          }
        })
        addedDrawingOverlayIds.value = []
        activeDrawingTool.value = null

        // Cancel current drawing mode
        if (typeof chartRef.value.overrideOverlay === 'function') {
          chartRef.value.overrideOverlay(null)
        }
      } catch (err) {
      }
    }

    // Toggle indicator show/hide
    const toggleIndicator = (indicator) => {
      const isActive = isIndicatorActive(indicator.id)

      if (isActive) {
        // Remove indicator
        emit('indicator-toggle', {
          action: 'remove',
          indicator: { id: indicator.id }
        })
      } else {
        // Add indicator
        const indicatorToAdd = {
          ...indicator,
          params: { ...indicator.defaultParams },
          calculate: null // calculate function is resolved by id in updateIndicators
        }
        emit('indicator-toggle', {
          action: 'add',
          indicator: indicatorToAdd
        })
      }
    }

    // Pyodide related
    const pyodide = ref(null)
    const loadingPython = ref(false)
    const pythonReady = ref(false)
    const pyodideLoadFailed = ref(false)

    // Theme configuration
    const themeConfig = computed(() => {
      if (chartTheme.value === 'dark') {
        return {
          backgroundColor: '#131722',
          textColor: '#d1d4dc',
          textColorSecondary: '#787b86',
          borderColor: '#2a2e39',
          gridLineColor: '#1f2943',
          gridLineColorDashed: '#363c4e',
          tooltipBg: 'rgba(25, 27, 32, 0.95)',
          tooltipBorder: '#333',
          tooltipText: '#ccc',
          tooltipTextSecondary: '#888',
          axisLabelColor: '#787b86',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#2a2e39',
          dataZoomFiller: 'rgba(41, 98, 255, 0.15)',
          dataZoomHandle: '#13c2c2',
          dataZoomText: 'transparent',
          dataZoomBg: '#1f2943'
        }
      } else {
        return {
          backgroundColor: '#fff',
          textColor: '#333',
          textColorSecondary: '#666',
          borderColor: '#e8e8e8',
          gridLineColor: '#e8e8e8',
          gridLineColorDashed: '#e8e8e8',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: '#e8e8e8',
          tooltipText: '#333',
          tooltipTextSecondary: '#666',
          axisLabelColor: '#666',
          splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
          dataZoomBorder: '#e8e8e8',
          dataZoomFiller: 'rgba(24, 144, 255, 0.15)',
          dataZoomHandle: '#1890ff',
          dataZoomText: '#999',
          dataZoomBg: '#f0f2f5'
        }
      }
    })

    // Get indicator color based on theme
    const getIndicatorColor = (idx) => {
      if (chartTheme.value === 'dark') {
        return ['#13c2c2', '#e040fb', '#ffeb3b', '#00e676', '#ff6d00', '#9c27b0'][idx % 6]
      } else {
        return ['#13c2c2', '#9c27b0', '#f57c00', '#1976d2', '#c2185b', '#7b1fa2'][idx % 6]
      }
    }

    // ========== Pyodide Initialization ==========
    const loadPyodide = () => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.pyodide) {
          pyodide.value = window.pyodide
          pythonReady.value = true
          resolve(window.pyodide)
          return
        }

        loadingPython.value = true

        // Dynamically load Pyodide (production defaults to CDN-first to avoid 404 errors from missing local static assets)
        // Customizable via environment variables:
        // - VUE_APP_PYODIDE_CDN_BASE: Override CDN base path (must end with / or will be auto-appended)
        // - VUE_APP_PYODIDE_LOCAL_BASE: Override local base path (must end with / or will be auto-appended)
        // - VUE_APP_PYODIDE_PREFER_CDN: 'true'/'false' to force priority
        const PYODIDE_VERSION = '0.25.0'
        const _ensureTrailingSlash = (s) => (s && s.endsWith('/')) ? s : (s ? (s + '/') : s)
        const defaultLocalBase = `/assets/pyodide/v${PYODIDE_VERSION}/full/`
        const defaultCdnBase = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
        const localBase = _ensureTrailingSlash(process.env.VUE_APP_PYODIDE_LOCAL_BASE || defaultLocalBase)
        const cdnBase = _ensureTrailingSlash(process.env.VUE_APP_PYODIDE_CDN_BASE || defaultCdnBase)
        const preferCdnEnv = (process.env.VUE_APP_PYODIDE_PREFER_CDN || '').toString().toLowerCase()
        const preferCdn = preferCdnEnv
          ? (preferCdnEnv === 'true' || preferCdnEnv === '1' || preferCdnEnv === 'yes')
          : (process.env.NODE_ENV === 'production')

        const loadScript = (src) => new Promise((resolve, reject) => {
          // If script already inserted, reuse it
          const existing = document.querySelector(`script[data-pyodide-src="${src}"]`)
          if (existing) {
            // If already loaded, resolve immediately.
            if (typeof window.loadPyodide === 'function') return resolve()
            // Otherwise wait for load/error.
            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener('error', () => reject(new Error('Pyodide script failed to load')), { once: true })
            return
          }

          const s = document.createElement('script')
          s.dataset.pyodideSrc = src
          s.src = src
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Pyodide script failed to load'))
          document.head.appendChild(s)
        })

        const initFromBase = async (baseUrl) => {
          if (typeof window.loadPyodide !== 'function') {
            throw new Error('loadPyodide function not found')
          }
          window.pyodide = await window.loadPyodide({ indexURL: baseUrl })

              // Preload pandas and numpy
              await window.pyodide.loadPackage(['pandas', 'numpy'])

              pyodide.value = window.pyodide
              pythonReady.value = true
              loadingPython.value = false
              resolve(window.pyodide)
        }

        (async () => {
          const tryLoad = async (base) => {
            await loadScript(base + 'pyodide.js')
            await initFromBase(base)
          }

          try {
            if (preferCdn) {
              // 1) CDN-first (production default)
              await tryLoad(cdnBase)
            } else {
              // 1) Local-first (dev convenience)
              await tryLoad(localBase)
            }
          } catch (firstErr) {
            try {
              // 2) Fallback
              await tryLoad(preferCdn ? localBase : cdnBase)
            } catch (secondErr) {
              throw secondErr || firstErr
            }
          }
        })().catch((err) => {
          loadingPython.value = false
          pyodideLoadFailed.value = true
          reject(err)
        })
      })
    }

    // ========== Python Code Parsing ==========
    // Parse Python code and extract parameter information
    const parsePythonStrategy = (code) => {
      if (!code || typeof code !== 'string') {
        return null
      }

      try {
        // Simple parameter extraction: look for @param or #param comments, or function parameters
        // Extract possible parameters
        const params = {}

        // Try to extract parameters from code (if any)
        // e.g., look for parameters like span=144
        const paramMatches = code.match(/(\w+)\s*=\s*(\d+\.?\d*)/g)
        if (paramMatches) {
          paramMatches.forEach(match => {
            const parts = match.split('=')
            if (parts.length === 2) {
              const key = parts[0].trim()
              const value = parseFloat(parts[1].trim())
              if (!isNaN(value)) {
                params[key] = value
              }
            }
          })
        }

        // Return parsed result
        return {
          params: params,
          plots: [], // Cannot extract plots directly from code; determined at execution time
          success: true
        }
      } catch (err) {
        // Even if parsing fails, return a basic object to allow execution
        return {
          params: {},
          plots: [],
          success: false
        }
      }
    }

    // ========== Python Execution Engine ==========
    const executePythonStrategy = async (userCode, klineData, params = {}, indicatorInfo = {}) => {
      if (!pythonReady.value || !pyodide.value) {
        // If currently loading, wait and retry
        if (loadingPython.value) {
          // Wait up to 15 seconds (30 times * 500ms)
          let waitCount = 0
          while (loadingPython.value && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 500))
            waitCount++
            // If loading is complete, exit the loop
            if (pythonReady.value && pyodide.value) {
              break
            }
          }
        }

        // If still not ready, check if loading failed
        if (!pythonReady.value || !pyodide.value) {
          // If not loading, it means loading failed or timed out
          if (!loadingPython.value) {
            pyodideLoadFailed.value = true
          } else {
            // If still loading but timed out, also mark as failed
            loadingPython.value = false
            pyodideLoadFailed.value = true
          }
          throw new Error('Python engine not ready, please wait for loading to complete')
        }
      }

      try {
        // Check if code needs decryption (purchased indicators)
        let finalCode = userCode
        const isEncrypted = indicatorInfo.is_encrypted || indicatorInfo.isEncrypted || 0
        if (isEncrypted || needsDecrypt(userCode, isEncrypted)) {
          // Get user ID (priority: indicatorInfo > props > params)
          const userId = indicatorInfo.user_id || indicatorInfo.userId || props.userId || params.userId
          // Use original database ID (originalId), fallback to id
          const indicatorId = indicatorInfo.originalId || indicatorInfo.id || params.indicatorId

          if (userId && indicatorId) {
            try {
              finalCode = await decryptCodeAuto(finalCode, userId, indicatorId)
            } catch (decryptError) {
              throw new Error('Code decryption failed, cannot run indicator: ' + (decryptError.message || 'Unknown error'))
            }
          } else {
            throw new Error('Missing required decryption parameters (user ID or indicator ID), cannot execute encrypted indicator')
          }
        }
        // 1. Data conversion: convert JS klineData / params to JSON strings
        // klineData may be in internal format (time) or KLineChart format (timestamp)
        const rawData = klineData.map(item => {
          // Compatible with both formats
          let timeValue = item.timestamp || item.time
          // If timestamp is in seconds, convert to milliseconds
          if (timeValue < 1e10) {
            timeValue = timeValue * 1000
          }
          return {
            time: Math.floor(timeValue / 1000), // Python side uses seconds-level timestamps
            open: parseFloat(item.open) || 0,
            high: parseFloat(item.high) || 0,
            low: parseFloat(item.low) || 0,
            close: parseFloat(item.close) || 0,
            volume: parseFloat(item.volume) || 0
          }
        })
        const rawDataJson = JSON.stringify(rawData)
        const paramsJson = JSON.stringify(params || {})

        // 2. Build Python execution code
        // Escape special characters in JSON strings
        const escapedJson = rawDataJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        const escapedParams = paramsJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')

        const pythonCode = `
import json
import pandas as pd
import numpy as np

# Recursive function to clean NaN values
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(item) for item in obj]
    elif isinstance(obj, (pd.Series, np.ndarray)):
        return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x for x in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif pd.isna(obj):
        return None
    else:
        return obj

# Receive JSON data
raw_data = json.loads('${escapedJson}')
params = json.loads('${escapedParams}')

# Inject frontend params as variables directly usable by indicator code (align with backtest/live execution environment)
# Compatible with multiple naming conventions (snake_case / camelCase)
def _get_param(key, default=None):
    if key in params:
        return params.get(key, default)
    # camelCase fallback
    camel = ''.join([key.split('_')[0]] + [p.capitalize() for p in key.split('_')[1:]])
    return params.get(camel, default)

try:
    leverage = float(_get_param('leverage', 1) or 1)
except Exception:
    leverage = 1

trade_direction = _get_param('trade_direction', _get_param('tradeDirection', 'both')) or 'both'

try:
    initial_position = int(_get_param('initial_position', 0) or 0)
except Exception:
    initial_position = 0

try:
    initial_avg_entry_price = float(_get_param('initial_avg_entry_price', 0.0) or 0.0)
except Exception:
    initial_avg_entry_price = 0.0

try:
    initial_position_count = int(_get_param('initial_position_count', 0) or 0)
except Exception:
    initial_position_count = 0

try:
    initial_last_add_price = float(_get_param('initial_last_add_price', 0.0) or 0.0)
except Exception:
    initial_last_add_price = 0.0

try:
    initial_highest_price = float(_get_param('initial_highest_price', 0.0) or 0.0)
except Exception:
    initial_highest_price = 0.0

# Convert to DataFrame
df = pd.DataFrame(raw_data)

# Convert data types
df['open'] = df['open'].astype(float)
df['high'] = df['high'].astype(float)
df['low'] = df['low'].astype(float)
df['close'] = df['close'].astype(float)
df['volume'] = df['volume'].astype(float)

# User code (decrypted)
${finalCode}

# Construct output (if user did not define output, try to get from result_json)
if 'output' not in locals():
    if 'result_json' in locals():
        output = json.loads(result_json)
    else:
        output = {"plots": []}
else:
    # Ensure output is a dictionary
    if isinstance(output, str):
        output = json.loads(output)

# Clean all NaN values in output
output = clean_nan(output)

# Return JSON string
json.dumps(output)
`

        // 3. Execute Python code
        const resultJson = await pyodide.value.runPythonAsync(pythonCode)

        // Check return result
        if (!resultJson || typeof resultJson !== 'string') {
          throw new Error(`Python code did not return a valid JSON string after execution, return type: ${typeof resultJson}`)
        }

        let result
        try {
          result = JSON.parse(resultJson)
        } catch (parseError) {
          throw new Error(`JSON parsing failed: ${parseError.message}. The data may contain NaN or other invalid values.`)
        }

        // 4. Validate and format output
        if (!result) {
          return { plots: [], signals: [], calculatedVars: {} }
        }

        // Ensure plots exists and is an array
        if (!result.plots || !Array.isArray(result.plots)) {
          result.plots = []
        }

        // 5. Process each plot data, converting NaN to null
        result.plots = result.plots.map(plot => {
          if (plot.data && Array.isArray(plot.data)) {
            plot.data = plot.data.map(val => {
              if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                return null
              }
              return val
            })
          }
          return plot
        })

        // 6. Process signals (if any)
        if (result.signals && Array.isArray(result.signals)) {
          result.signals = result.signals.map(signal => {
            if (signal.data && Array.isArray(signal.data)) {
              signal.data = signal.data.map(val => {
                if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
                  return null
                }
                return val
              })
            }
            return signal
          })
        }

        // 7. Ensure calculatedVars exists
        if (!result.calculatedVars) {
          result.calculatedVars = {}
        }

        return result
      } catch (err) {
        throw new Error(`Python execution failed: ${err.message}`)
      }
    }

    // --- Indicator Calculation Functions ---
    // These functions may be called indirectly via indicator.calculate, so ESLint may not recognize them

    // eslint-disable-next-line no-unused-vars
    function calculateSMA (data, length) {
      const result = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          result.push(null)
        } else {
          let sum = 0
          for (let j = i - length + 1; j <= i; j++) {
            sum += data[j].close
          }
          result.push(sum / length)
        }
      }
      return result
    }

    function calculateEMA (data, length) {
      const result = []
      const multiplier = 2 / (length + 1)
      let ema = null
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          ema = data[i].close
        } else {
          ema = (data[i].close - ema) * multiplier + ema
        }
        result.push(ema)
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateBollingerBands (data, length, mult) {
      // Internal SMA calculation
      const sma = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          sma.push(null)
        } else {
          let sum = 0
          for (let j = i - length + 1; j <= i; j++) {
            sum += data[j].close
          }
          sma.push(sum / length)
        }
      }

      const result = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          result.push({ upper: null, middle: null, lower: null })
          continue
        }
        let sum = 0
        for (let j = i - length + 1; j <= i; j++) {
          sum += Math.pow(data[j].close - sma[i], 2)
        }
        const std = Math.sqrt(sum / length)
        result.push({
          upper: sma[i] + mult * std,
          middle: sma[i],
          lower: sma[i] - mult * std
        })
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateRSI (data, length) {
      const result = []
      let avgGain = 0
      let avgLoss = 0

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          result.push(null)
          continue
        }

        const change = data[i].close - data[i - 1].close
        const gain = change > 0 ? change : 0
        const loss = change < 0 ? Math.abs(change) : 0

        if (i < length) {
          // First length-1 values: accumulate but do not calculate RSI
          result.push(null)
        } else if (i === length) {
          // At the length-th value, calculate initial averages
          let sumGain = 0
          let sumLoss = 0
          for (let j = 1; j <= length; j++) {
            const chg = data[j].close - data[j - 1].close
            if (chg > 0) sumGain += chg
            else sumLoss += Math.abs(chg)
          }
          avgGain = sumGain / length
          avgLoss = sumLoss / length
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          result.push(100 - (100 / (1 + rs)))
        } else {
          // Subsequent values: use smoothed moving average
          avgGain = (avgGain * (length - 1) + gain) / length
          avgLoss = (avgLoss * (length - 1) + loss) / length
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          result.push(100 - (100 / (1 + rs)))
        }
      }
      return result
    }

    // eslint-disable-next-line no-unused-vars
    function calculateMACD (data, fast, slow, signal) {
      const fastEMA = calculateEMA(data, fast)
      const slowEMA = calculateEMA(data, slow)
      const macdLine = []

      // Calculate MACD line
      for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] == null || slowEMA[i] == null) {
          macdLine.push(null)
        } else {
          macdLine.push(fastEMA[i] - slowEMA[i])
        }
      }

      // Calculate Signal line (EMA of MACD)
      // Need to maintain original array length, handle null values specially
      const signalLine = []
      const histogram = []
      let signalEMA = null
      let signalStartIdx = -1

      // Find the first non-null MACD value as the starting point for signal calculation
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null && signalStartIdx === -1) {
          signalStartIdx = i
          signalEMA = macdLine[i]
          break
        }
      }

      // If starting point found, continue calculating signal
      if (signalStartIdx >= 0) {
        const multiplier = 2 / (signal + 1)
        for (let i = 0; i < macdLine.length; i++) {
          if (i < signalStartIdx + signal - 1) {
            // Signal needs enough MACD values first
            signalLine.push(null)
            histogram.push(null)
          } else if (macdLine[i] === null) {
            signalLine.push(null)
            histogram.push(null)
          } else {
            if (i === signalStartIdx + signal - 1) {
              // First signal value: average of the first N MACD values
              let sum = 0
              let count = 0
              for (let j = signalStartIdx; j <= i; j++) {
                if (macdLine[j] !== null) {
                  sum += macdLine[j]
                  count++
                }
              }
              signalEMA = sum / count
            } else {
              // Subsequent values: use EMA formula
              signalEMA = (macdLine[i] - signalEMA) * multiplier + signalEMA
            }
            signalLine.push(signalEMA)
            histogram.push(macdLine[i] - signalEMA)
          }
        }
      } else {
        // If no valid MACD values, set all to null
        for (let i = 0; i < macdLine.length; i++) {
          signalLine.push(null)
          histogram.push(null)
        }
      }

      return { macd: macdLine, signal: signalLine, histogram }
    }

    // Calculate ATR (Average True Range)
    function calculateATR (data, period) {
      const tr = [] // True Range
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          tr.push(data[i].high - data[i].low)
        } else {
          const hl = data[i].high - data[i].low
          const hc = Math.abs(data[i].high - data[i - 1].close)
          const lc = Math.abs(data[i].low - data[i - 1].close)
          tr.push(Math.max(hl, hc, lc))
        }
      }

      // Calculate ATR (SMA of TR)
      const atr = []
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          atr.push(null)
        } else {
          let sum = 0
          for (let j = i - period + 1; j <= i; j++) {
            sum += tr[j]
          }
          atr.push(sum / period)
        }
      }
      return atr
    }

    // Calculate CCI (Commodity Channel Index)
    function calculateCCI (data, length) {
      const cci = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          cci.push(null)
        } else {
          // Calculate Typical Price (TP)
          const tp = []
          for (let j = i - length + 1; j <= i; j++) {
            tp.push((data[j].high + data[j].low + data[j].close) / 3)
          }
          // Calculate SMA of TP
          const sma = tp.reduce((sum, val) => sum + val, 0) / length
          // Calculate Mean Deviation
          const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / length
          // Calculate CCI
          const currentTP = (data[i].high + data[i].low + data[i].close) / 3
          const cciValue = meanDev === 0 ? 0 : (currentTP - sma) / (0.015 * meanDev)
          cci.push(cciValue)
        }
      }
      return cci
    }

    // Calculate Williams %R
    function calculateWilliamsR (data, length) {
      const williamsR = []
      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          williamsR.push(null)
        } else {
          let highest = -Infinity
          let lowest = Infinity
          for (let j = i - length + 1; j <= i; j++) {
            highest = Math.max(highest, data[j].high)
            lowest = Math.min(lowest, data[j].low)
          }
          const wr = (highest - lowest) === 0 ? -50 : ((highest - data[i].close) / (highest - lowest)) * -100
          williamsR.push(wr)
        }
      }
      return williamsR
    }

    // Calculate MFI (Money Flow Index)
    function calculateMFI (data, length) {
      const mfi = []
      for (let i = 0; i < data.length; i++) {
        if (i < length) {
          mfi.push(null)
        } else {
          let positiveFlow = 0
          let negativeFlow = 0
          for (let j = i - length + 1; j <= i; j++) {
            const typicalPrice = (data[j].high + data[j].low + data[j].close) / 3
            const rawMoneyFlow = typicalPrice * data[j].volume
            if (j > i - length + 1) {
              const prevTypicalPrice = (data[j - 1].high + data[j - 1].low + data[j - 1].close) / 3
              if (typicalPrice > prevTypicalPrice) {
                positiveFlow += rawMoneyFlow
              } else if (typicalPrice < prevTypicalPrice) {
                negativeFlow += rawMoneyFlow
              }
            }
          }
          const moneyFlowRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
          const mfiValue = 100 - (100 / (1 + moneyFlowRatio))
          mfi.push(mfiValue)
        }
      }
      return mfi
    }

    // Calculate ADX (Average Directional Index) and DMI (+DI, -DI)
    function calculateADX (data, length) {
      const plusDI = []
      const minusDI = []
      const adx = []

      // Calculate True Range (TR) and Directional Movement (+DM, -DM)
      const tr = []
      const plusDM = []
      const minusDM = []

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          tr.push(data[i].high - data[i].low)
          plusDM.push(0)
          minusDM.push(0)
        } else {
          const hl = data[i].high - data[i].low
          const hc = Math.abs(data[i].high - data[i - 1].close)
          const lc = Math.abs(data[i].low - data[i - 1].close)
          tr.push(Math.max(hl, hc, lc))

          const upMove = data[i].high - data[i - 1].high
          const downMove = data[i - 1].low - data[i].low

          if (upMove > downMove && upMove > 0) {
            plusDM.push(upMove)
          } else {
            plusDM.push(0)
          }

          if (downMove > upMove && downMove > 0) {
            minusDM.push(downMove)
          } else {
            minusDM.push(0)
          }
        }
      }

      // Calculate smoothed TR, +DM, -DM
      const smoothTR = []
      const smoothPlusDM = []
      const smoothMinusDM = []

      for (let i = 0; i < data.length; i++) {
        if (i < length - 1) {
          smoothTR.push(null)
          smoothPlusDM.push(null)
          smoothMinusDM.push(null)
          plusDI.push(null)
          minusDI.push(null)
          adx.push(null)
        } else if (i === length - 1) {
          // Initial value: simple summation
          let sumTR = 0
          let sumPlusDM = 0
          let sumMinusDM = 0
          for (let j = 0; j <= i; j++) {
            sumTR += tr[j]
            sumPlusDM += plusDM[j]
            sumMinusDM += minusDM[j]
          }
          smoothTR.push(sumTR)
          smoothPlusDM.push(sumPlusDM)
          smoothMinusDM.push(sumMinusDM)
        } else {
          // Smoothing calculation: Wilder's smoothing
          smoothTR.push(smoothTR[i - 1] - (smoothTR[i - 1] / length) + tr[i])
          smoothPlusDM.push(smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / length) + plusDM[i])
          smoothMinusDM.push(smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / length) + minusDM[i])
        }

        if (i >= length - 1) {
          const trVal = smoothTR[i]
          const plusDMVal = smoothPlusDM[i]
          const minusDMVal = smoothMinusDM[i]

          if (trVal === 0) {
            plusDI.push(0)
            minusDI.push(0)
          } else {
            plusDI.push((plusDMVal / trVal) * 100)
            minusDI.push((minusDMVal / trVal) * 100)
          }

          // Calculate DX
          if (i >= length - 1) {
            const diSum = plusDI[i] + minusDI[i]
            const dx = diSum === 0 ? 0 : Math.abs(plusDI[i] - minusDI[i]) / diSum * 100

            // Calculate ADX (smoothed DX)
            if (i === length - 1) {
              adx.push(dx)
            } else if (i === length) {
              // Second ADX value: average of first two DX values
              const prevDX = Math.abs(plusDI[i - 1] - minusDI[i - 1]) / (plusDI[i - 1] + minusDI[i - 1]) * 100
              adx.push((prevDX + dx) / 2)
            } else {
              // ADX smoothing: Wilder's smoothing
              adx.push((adx[i - 1] * (length - 1) + dx) / length)
            }
          }
        }
      }

      return { adx, plusDI, minusDI }
    }

    // Calculate OBV (On-Balance Volume)
    function calculateOBV (data) {
      const obv = []
      let obvValue = 0

      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          obvValue = data[i].volume
        } else {
          if (data[i].close > data[i - 1].close) {
            obvValue += data[i].volume
          } else if (data[i].close < data[i - 1].close) {
            obvValue -= data[i].volume
          }
          // If close price is the same, OBV remains unchanged
        }
        obv.push(obvValue)
      }
      return obv
    }

    // Calculate AD (Accumulation/Distribution Line)
    function calculateAD (data) {
      const ad = []
      let adValue = 0

      for (let i = 0; i < data.length; i++) {
        const high = data[i].high
        const low = data[i].low
        const close = data[i].close
        const volume = data[i].volume

        if (high !== low) {
          const clv = ((close - low) - (high - close)) / (high - low)
          adValue += clv * volume
        }
        ad.push(adValue)
      }
      return ad
    }

    // Calculate ADOSC (Accumulation/Distribution Oscillator) = Fast EMA of AD - Slow EMA of AD
    function calculateADOSC (data, fast, slow) {
      const ad = calculateAD(data)
      const fastEMA = []
      const slowEMA = []
      const adosc = []

      const fastMultiplier = 2 / (fast + 1)
      const slowMultiplier = 2 / (slow + 1)

      let fastEMAValue = ad[0]
      let slowEMAValue = ad[0]

      for (let i = 0; i < ad.length; i++) {
        if (i === 0) {
          fastEMA.push(ad[0])
          slowEMA.push(ad[0])
          adosc.push(0)
        } else {
          fastEMAValue = (ad[i] - fastEMAValue) * fastMultiplier + fastEMAValue
          slowEMAValue = (ad[i] - slowEMAValue) * slowMultiplier + slowEMAValue

          fastEMA.push(fastEMAValue)
          slowEMA.push(slowEMAValue)
          adosc.push(fastEMAValue - slowEMAValue)
        }
      }

      return adosc
    }

    // Calculate KDJ (Stochastic Oscillator)
    function calculateKDJ (data, period, kPeriod, dPeriod) {
      const kValues = []
      const dValues = []
      const jValues = []

      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          kValues.push(null)
          dValues.push(null)
          jValues.push(null)
        } else {
          // Find highest high and lowest low within the period
          let highest = -Infinity
          let lowest = Infinity
          for (let j = i - period + 1; j <= i; j++) {
            highest = Math.max(highest, data[j].high)
            lowest = Math.min(lowest, data[j].low)
          }

          // Calculate RSV
          const rsv = (highest - lowest) === 0 ? 50 : ((data[i].close - lowest) / (highest - lowest)) * 100

          // Calculate K value (moving average of RSV)
          if (kValues[i - 1] === null) {
            kValues.push(rsv)
          } else {
            kValues.push((rsv * 2 + kValues[i - 1] * (kPeriod - 2)) / kPeriod)
          }

          // Calculate D value (moving average of K)
          if (dValues[i - 1] === null) {
            dValues.push(kValues[i])
          } else {
            dValues.push((kValues[i] * 2 + dValues[i - 1] * (dPeriod - 2)) / dPeriod)
          }

          // Calculate J value
          jValues.push(3 * kValues[i] - 2 * dValues[i])
        }
      }

      return { k: kValues, d: dValues, j: jValues }
    }

    // ========== Register Custom Signal Overlay (Signal Tag) ==========
    // A custom overlay that draws "dot + text box with background color"
// ========== Register Custom Signal Overlay (Signal Tag) ==========
registerOverlay({
      name: 'signalTag',
      // [Key change 1] Must be set to 1. Tell the chart this graphic only needs one point to complete.
      // As long as this is 1, the chart will not draw the blue "editing" handle.
      totalStep: 1,

      // [Key change 2] Completely prevent this Overlay from responding to any mouse events
      // This prevents the blue selection box when hovering
      lock: true,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,

      // [Recommended] Further ensure events are not intercepted
      checkEventOn: () => false,

      createPointFigures: ({ coordinates, overlay }) => {
        const { text } = overlay.extendData || {}
        const color = overlay.extendData?.color || '#555555'

        // 1. Get signal point coordinates
        if (!coordinates[0]) return []
        const x = coordinates[0].x
        const signalY = coordinates[0].y // Point 0: Label position calculated in Python (includes vertical spacing)

        // 2. Get K-line extreme coordinates (for drawing dots)
        const anchorY = coordinates[1] ? coordinates[1].y : signalY // Point 1: K-line high/low

        const boxPaddingX = 8
        const boxPaddingY = 4
        const fontSize = 12
        const textStr = String(text || '')
        // Simple character width estimation
        const textWidth = textStr.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 12 : 7), 0)
        const boxWidth = textWidth + boxPaddingX * 2
        const boxHeight = fontSize + boxPaddingY * 2

        // Compatibility: old overlays used extendData.type='buy'/'sell', new overlays use extendData.side='buy'/'sell'
        const side = overlay.extendData?.side || overlay.extendData?.type || 'buy'
        const isBuy = side === 'buy'

        // 3. Calculate Box Y-axis position
        // [Key change] Use signalY directly (position already adjusted in Python), no longer use fixed margin
        // signalY already includes vertical spacing adjustment for reversal signals
        const boxY = isBuy ? signalY : (signalY - boxHeight)

        // Calculate line segment connection points
        // Dot drawn at K-line extreme position (anchorY), adjacent to K-line
        // Line connects from dot to label box
        const circleY = anchorY // Dot position: K-line High or Low
        const lineStartY = circleY // Line start: dot position
        const lineEndY = isBuy ? boxY : (boxY + boxHeight) // Line end: label box edge

        return [
          // 1. Dashed line (from dot to label box)
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: lineStartY }, // From dot (K-line extreme position)
                { x, y: lineEndY } // To label box edge
              ]
            },
            styles: { style: 'stroke', color: color, dashedValue: [2, 2] },
            ignoreEvent: true
          },
          // 2. Dot (drawn at K-line extreme position, adjacent to K-line)
          {
            type: 'circle',
            attrs: { x, y: circleY, r: 4 },
            styles: { style: 'fill', color: color },
            ignoreEvent: true
          },
          // 3. Background box (based on boxY)
          {
            type: 'rect',
            attrs: {
              x: x - boxWidth / 2,
              y: boxY,
              width: boxWidth,
              height: boxHeight,
              r: 4
            },
            styles: { style: 'fill', color: color, borderSize: 0 },
            ignoreEvent: true
          },
          // 4. Text
          {
            type: 'text',
            attrs: {
              x: x,
              y: boxY + boxHeight / 2,
              text: textStr,
              align: 'center',
              baseline: 'middle'
            },
            styles: { color: '#ffffff', size: fontSize, weight: 'bold', backgroundColor: color, borderRadius: 5 },
            ignoreEvent: true
          }
        ]
      }
    })

    // --- Data Loading Functions ---
    // Format data for KLineChart (timestamp must be in milliseconds)
    const formatKlineData = (data) => {
      return data.map(item => {
        let timeValue = item.time || item.timestamp
        if (typeof timeValue === 'string') {
          timeValue = parseInt(timeValue)
        }
        // KLineChart needs millisecond timestamps; convert from seconds if needed
        if (timeValue < 1e10) {
          timeValue = timeValue * 1000
        }
        return {
          timestamp: timeValue,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        }
      }).filter(item => item.timestamp && !isNaN(item.open) && !isNaN(item.high) && !isNaN(item.low) && !isNaN(item.close))
        .sort((a, b) => a.timestamp - b.timestamp)
    }

    const updatePricePanel = (data) => {
      if (data.length > 0) {
        const last = data[data.length - 1]
        if (data.length > 1) {
          const prev = data[data.length - 2]
          const price = last.close.toFixed(2)
          const change = ((last.close - prev.close) / prev.close) * 100
          emit('price-change', { price, change })
        } else {
          const price = last.close.toFixed(2)
          emit('price-change', { price, change: 0 })
        }
      }
    }

    // Convert KLineChart format data to internal format (for isSameTimeframe etc.)
    const convertToInternalFormat = (data) => {
      return data.map(item => ({
        time: Math.floor(item.timestamp / 1000), // Convert back to seconds for comparison
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }))
    }

    const isSameTimeframe = (time1, time2, tf) => {
      const date1 = new Date(time1 * 1000)
      const date2 = new Date(time2 * 1000)

      switch (tf) {
        case '1m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 date1.getMinutes() === date2.getMinutes()
        case '5m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 5) === Math.floor(date2.getMinutes() / 5)
        case '15m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 15) === Math.floor(date2.getMinutes() / 15)
        case '30m':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours() &&
                 Math.floor(date1.getMinutes() / 30) === Math.floor(date2.getMinutes() / 30)
        case '1H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 date1.getHours() === date2.getHours()
        case '4H':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate() &&
                 Math.floor(date1.getHours() / 4) === Math.floor(date2.getHours() / 4)
        case '1D':
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate()
        case '1W':
          const week1 = Math.floor((date1.getTime() - new Date(date1.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          const week2 = Math.floor((date2.getTime() - new Date(date2.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
          return date1.getFullYear() === date2.getFullYear() && week1 === week2
        default:
          return time1 === time2
      }
    }

    const loadKlineData = async (silent = false) => {
      if (!props.symbol) return
      if (loading.value && !silent) return

      loading.value = true
      error.value = null

      try {
        let formattedData = []
        try {
          const response = await request({
            url: '/api/indicator/kline',
            method: 'get',
            params: {
              market: props.market,
              symbol: props.symbol,
              timeframe: props.timeframe,
              limit: 500
            }
          })

          if (response.code === 1 && response.data && Array.isArray(response.data)) {
            formattedData = formatKlineData(response.data)
          } else {
            // Special handling for Tiingo subscription limit notice
            let errMsg = response.msg || 'Failed to fetch kline data'
            if (response.hint === 'tiingo_subscription') {
              errMsg = proxy.$t('dashboard.indicator.error.tiingoSubscription') || 'Forex 1-minute data requires Tiingo paid subscription'
            }
            throw new Error(errMsg)
          }
        } catch (apiErr) {
          throw apiErr
        }

        // Check if data is empty
        if (!formattedData || formattedData.length === 0) {
          throw new Error('Failed to retrieve K-line data')
        }

        klineData.value = formattedData
        hasMoreHistory.value = true
        const internalData = convertToInternalFormat(formattedData)
        updatePricePanel(internalData)

        nextTick(() => {
          if (!chartRef.value) {
            initChart()
          } else {
            // Ensure data format is correct
            const validData = klineData.value.filter(item =>
              item.timestamp &&
              !isNaN(item.open) &&
              !isNaN(item.high) &&
              !isNaN(item.low) &&
              !isNaN(item.close)
            )

            if (validData.length > 0 && chartRef.value) {
              // Initialize with applyNewData
              try {
                chartRef.value.applyNewData(validData)
              } catch (e) {
                chartRef.value.applyNewData(validData)
              }

              // Delay indicator update
              setTimeout(() => {
                if (chartRef.value) {
                  updateIndicators()
                }
              }, 100)
            }
          }

          if (props.realtimeEnabled) {
            stopRealtime()
            startRealtime()
          }
        })
      } catch (err) {
        error.value = proxy.$t('dashboard.indicator.error.loadDataFailed') + ': ' + (err.message || proxy.$t('dashboard.indicator.error.loadDataFailedDesc'))
        // Clear K-line data, hide chart
        klineData.value = []
        // If chart instance exists, clear data
        if (chartRef.value) {
          try {
            chartRef.value.applyNewData([])
          } catch (e) {
          }
        }
      } finally {
        loading.value = false
      }
    }

    // Load more historical data (for scroll loading, preserving scroll position)
    const loadMoreHistoryDataForScroll = async (timestamp) => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      // [Core fix] Prevent duplicate requests: return immediately if a request is already in progress
      if (loadingHistory.value || loadingHistoryPromise) {
        // If a request is in progress, wait for it to complete
        if (loadingHistoryPromise) {
          try {
            await loadingHistoryPromise
          } catch (e) {
          }
        }
        return
      }

      if (!hasMoreHistory.value) {
        // If no more data, notify the chart
        if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
          chartRef.value.noMoreData()
        }
        return
      }

      // Set loading state and create Promise immediately to prevent concurrent requests
      loadingHistory.value = true
      loadingHistoryPromise = (async () => {
        // Force trigger update
        await nextTick()

        try {
        // timestamp is in milliseconds, convert to seconds for API
        const beforeTime = Math.floor(timestamp / 1000)

        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 500,
            before_time: beforeTime // Get data before this time
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data)) {
          const newData = formatKlineData(response.data)

          if (newData.length === 0) {
            // No more data available
            hasMoreHistory.value = false
            if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
              chartRef.value.noMoreData()
            }
            return
          }

          // Ensure new data timestamps are earlier than the given timestamp
          const filteredNewData = newData.filter(item => item.timestamp < timestamp)

          if (filteredNewData.length === 0) {
            // No earlier data available
            hasMoreHistory.value = false
            if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
              chartRef.value.noMoreData()
            }
            return
          }

          // Save current visible range for restoring scroll position
          // klinecharts 9.x getVisibleRange() returns from/to as data indices (integers), not percentages
          let savedVisibleRange = null
          try {
            if (chartRef.value && typeof chartRef.value.getVisibleRange === 'function') {
              savedVisibleRange = chartRef.value.getVisibleRange()
            }
          } catch (e) {
          }

          // Record the number of new data items for offset calculation
          const newDataCount = filteredNewData.length

          // Insert new data before existing data
          klineData.value = [...filteredNewData, ...klineData.value]

          // Use applyNewData to add historical data (applyMoreData deprecated in v9.8.0)
          nextTick(() => {
            if (chartRef.value) {
              // Apply new data
              chartRef.value.applyNewData(klineData.value)

              // Restore scroll position
              // Since new data was prepended, original indices need to be offset by newDataCount
              if (savedVisibleRange && typeof savedVisibleRange.from === 'number') {
                // Calculate new visible range indices
                // Previously viewing indices from to to; now those indices become from + newDataCount to to + newDataCount
                const newFrom = savedVisibleRange.from + newDataCount
                const newTo = savedVisibleRange.to + newDataCount

                // Use setTimeout to ensure data has finished rendering
                setTimeout(() => {
                  try {
                    if (chartRef.value) {
                      // Try using scrollToDataIndex method (if available)
                      if (typeof chartRef.value.scrollToDataIndex === 'function') {
                        chartRef.value.scrollToDataIndex(newFrom)
                      } else if (typeof chartRef.value.setVisibleRange === 'function') {
                        // Use setVisibleRange to set visible range (params are data indices)
                        chartRef.value.setVisibleRange(newFrom, newTo)
                      }
                    }
                  } catch (e) {
                  }
                }, 50)
              }

              // Update indicators
              updateIndicators()
            }
          })
        } else {
          // API returned error, notify chart of load failure
          if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        }
        } catch (err) {
          // Load failed, notify chart
          if (chartRef.value && typeof chartRef.value.noMoreData === 'function') {
            chartRef.value.noMoreData()
          }
        } finally {
          loadingHistory.value = false
          loadingHistoryPromise = null // Clear request tracking
        }
      })() // Immediately execute Promise

      // Wait for request to complete
      try {
        await loadingHistoryPromise
      } catch (err) {
        // Error already handled in the inner catch; this just ensures the Promise completes
      }
    }

    // Load more historical data (keep original function for other scenarios)
    const loadMoreHistoryData = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return
      }

      if (loadingHistory.value || !hasMoreHistory.value) {
        return
      }

      loadingHistory.value = true

      try {
        // Get the earliest data time (convert to seconds for API)
        const earliestTimestamp = klineData.value[0].timestamp
        const earliestTime = Math.floor(earliestTimestamp / 1000) // Convert to seconds
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 500,
            before_time: earliestTime // Get data before this time
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data)) {
          const newData = formatKlineData(response.data)

          if (newData.length === 0) {
            // No more data available
            hasMoreHistory.value = false
            loadingHistory.value = false
            return
          }

          // Ensure new data time is earlier than existing earliest data
          const filteredNewData = newData.filter(item => item.timestamp < earliestTimestamp)

          if (filteredNewData.length === 0) {
            // No earlier data available
            hasMoreHistory.value = false
            loadingHistory.value = false
            return
          }

          // Insert new data before existing data
          klineData.value = [...filteredNewData, ...klineData.value]

          // Update chart
          nextTick(() => {
            if (chartRef.value) {
              chartRef.value.applyNewData(klineData.value)
              updateIndicators()
            }
          })
        } else {
          // API returned error, but may not mean no more data; could be a network issue
          // Do not set hasMoreHistory = false; allow user to retry
        }
      } catch (err) {
        // Load failure may be a network issue; should not immediately assume no more data
        // Only set hasMoreHistory = false when it is confirmed there is no earlier data
        // Do not set here; allow user to retry
      } finally {
        loadingHistory.value = false
      }
    }

    // Incrementally update K-line data (realtime update)
    const updateKlineRealtime = async () => {
      if (!props.symbol || !klineData.value || klineData.value.length === 0) {
        return // Skip incremental update if no existing data
      }

      try {
        // Only fetch the latest 5 K-lines for update
        const response = await request({
          url: '/api/indicator/kline',
          method: 'get',
          params: {
            market: props.market,
            symbol: props.symbol,
            timeframe: props.timeframe,
            limit: 5 // Only fetch the latest 5
          }
        })

        if (response.code === 1 && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const newData = formatKlineData(response.data)
          const existingData = [...klineData.value]

          if (newData.length > 0) {
            const lastNewTime = Math.floor(newData[newData.length - 1].timestamp / 1000) // Convert back to seconds for comparison
            const lastExistingTime = Math.floor(existingData[existingData.length - 1].timestamp / 1000)

            // Determine if they belong to the same time period
            if (isSameTimeframe(lastNewTime, lastExistingTime, props.timeframe)) {
              // Same time period: merge-update the last K-line data
              // K-line merge rules:
              // - open: Keep unchanged (price at period start)
              // - high: Take maximum (highest price in the period)
              // - low: Take minimum (lowest price in the period)
              // - close: Update to latest price (current price)
              // - volume: Use latest API value (API returns total volume for the period; no accumulation needed)
              const existingLast = existingData[existingData.length - 1]
              const newLast = newData[newData.length - 1]

              existingData[existingData.length - 1] = {
                timestamp: existingLast.timestamp, // Keep original timestamp (ms)
                open: existingLast.open, // Open price unchanged
                high: Math.max(existingLast.high, newLast.high), // Highest price: take max
                low: Math.min(existingLast.low, newLast.low), // Lowest price: take min
                close: newLast.close, // Close price: update to latest
                volume: newLast.volume // Volume: use latest API value (total volume for this period)
              }
              klineData.value = existingData

              // Update price panel (using internal format)
              const internalData = convertToInternalFormat(klineData.value)
              updatePricePanel(internalData)

              // Update KLineChart - use updateData method to preserve scroll position
              if (chartRef.value && typeof chartRef.value.updateData === 'function') {
                // Update last K-line data while preserving scroll position
                // updateData only needs one parameter: data object to update (v9.8.0+ no longer accepts callback)
                const lastIndex = klineData.value.length - 1
                chartRef.value.updateData(existingData[lastIndex])
                // Indicator calculation throttle: refresh every 10s by default (avoid CPU overload at 1s frequency)
                maybeUpdateIndicators(false)
              } else if (chartRef.value) {
                // Fallback: use applyNewData (resets scroll position)
                chartRef.value.applyNewData(klineData.value)
                maybeUpdateIndicators(false)
              }
            } else if (lastNewTime > lastExistingTime) {
              // New time period: append new data
              // First remove potentially duplicate K-lines (based on time period, not exact timestamp)
              const uniqueNewData = newData.filter(newItem => {
                const newItemTime = Math.floor(newItem.timestamp / 1000)
                // Check if it belongs to the same time period as any existing data
                return !existingData.some(existingItem => {
                  const existingItemTime = Math.floor(existingItem.timestamp / 1000)
                  return isSameTimeframe(newItemTime, existingItemTime, props.timeframe)
                })
              })

              if (uniqueNewData.length > 0) {
                klineData.value = [...existingData, ...uniqueNewData]
                // If data exceeds limit, keep the most recent data
                if (klineData.value.length > 500) {
                  klineData.value = klineData.value.slice(-500)
                }

                // Update price panel (using internal format)
                const internalData = convertToInternalFormat(klineData.value)
                updatePricePanel(internalData)

                // Update KLineChart - use applyMoreData to preserve scroll position
                if (chartRef.value && typeof chartRef.value.applyMoreData === 'function') {
                  // Append new K-lines using applyMoreData to preserve scroll position
                  chartRef.value.applyMoreData(uniqueNewData)
                  // Force refresh indicators once when new K-line appears
                  maybeUpdateIndicators(true)
                } else if (chartRef.value) {
                  // Fallback: use applyNewData (resets scroll position)
                  chartRef.value.applyNewData(klineData.value)
                  maybeUpdateIndicators(true)
                }
              }
            }
            // If new data is earlier, no update; keep existing data unchanged
          }
        }
      } catch (err) {
        // Silently handle incremental update failures without affecting existing data
      }
    }

    // Start realtime update
    const startRealtime = () => {
      // First clear existing timer
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
      }

      // Intelligently adjust update frequency based on timeframe
      const intervalMap = {
        '1m': 5000, // 1min K-line: update every 5s
        '5m': 10000, // 5min K-line: update every 10s
        '15m': 15000, // 15min K-line: update every 15s
        '30m': 30000, // 30min K-line: update every 30s
        '1H': 60000, // 1H K-line: update every 60s
        '4H': 300000, // 4H K-line: update every 5min
        '1D': 600000, // Daily K-line: update every 10min
        '1W': 1800000 // Weekly K-line: update every 30min
      }
      // UI experience first: allow high-frequency refresh to observe "price/K-line/indicator" sync effect.
      // Cap refresh interval to 1 second; if indicator calculations are slow, updateIndicators uses a lock to prevent re-entry.
      const base = intervalMap[props.timeframe] || 10000
      realtimeInterval.value = Math.min(base, 1000)

      // If realtime update is enabled and a symbol is selected
      if (props.realtimeEnabled && props.symbol && klineData.value.length > 0) {
        realtimeTimer.value = setInterval(() => {
          // Only perform incremental update when not loading and existing data is available
          if (!loading.value && props.symbol && klineData.value && klineData.value.length > 0) {
            updateKlineRealtime() // Incremental K-line update
          }
        }, realtimeInterval.value)
      }
    }

    // Stop realtime update
    const stopRealtime = () => {
      if (realtimeTimer.value) {
        clearInterval(realtimeTimer.value)
        realtimeTimer.value = null
      }
    }

    // --- Chart Initialization Function ---
    const initChart = () => {
      const container = document.getElementById('kline-chart-container')
      if (!container) return

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        let retryCount = 0
        const maxRetries = 10
        const checkAndInit = () => {
          const checkContainer = document.getElementById('kline-chart-container')
          if (checkContainer && checkContainer.clientWidth > 0 && checkContainer.clientHeight > 0) {
            initChart()
          } else if (retryCount < maxRetries) {
            retryCount++
            setTimeout(checkAndInit, 200)
          } else {
            initChart()
          }
        }
        setTimeout(checkAndInit, 200)
        return
      }

      // If chart already exists, destroy it first
      if (chartRef.value) {
        try {
          chartRef.value.destroy()
        } catch (e) {}
        chartRef.value = null
      }

      try {
        // Initialize KLineChart
        const container = document.getElementById('kline-chart-container')
        if (!container) {
          throw new Error('Container element does not exist')
        }

        // Try initializing with config options to see if built-in drawing toolbar is supported
        try {
          // Try passing config options as second parameter
          chartRef.value = init(container, {
            drawingBarVisible: true, // Try enabling built-in drawing toolbar
            overlay: {
              visible: true
            }
          })
        } catch (e) {
          // If config options not supported, use default initialization
          chartRef.value = init(container)
        }

        // If config options not supported, try calling methods to enable drawing toolbar
        if (chartRef.value && typeof chartRef.value.setDrawingBarVisible === 'function') {
          chartRef.value.setDrawingBarVisible(true)
        } else if (chartRef.value && typeof chartRef.value.setDrawingBar === 'function') {
          chartRef.value.setDrawingBar(true)
        } else if (chartRef.value && typeof chartRef.value.enableDrawing === 'function') {
          chartRef.value.enableDrawing(true)
        }

        if (!chartRef.value) {
          throw new Error('Chart initialization failed: unable to create chart instance')
        }

        // Debug: output all chart instance methods to check for drawing toolbar methods
        if (chartRef.value) {
          // Check for built-in drawing toolbar methods
          if (typeof chartRef.value.setDrawingBarVisible === 'function') {
            chartRef.value.setDrawingBarVisible(true)
          }
          if (typeof chartRef.value.setDrawingBar === 'function') {
            chartRef.value.setDrawingBar(true)
          }
          if (typeof chartRef.value.enableDrawing === 'function') {
            chartRef.value.enableDrawing(true)
          }
        }

        // Set theme styles
        updateChartTheme()

        // Listen for overlay creation events to auto-exit drawing mode
        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          // Listen for overlay creation event
          chartRef.value.subscribeAction('onOverlayCreated', (overlay) => {
            // If overlay was created via drawing tool, record ID and exit drawing mode
            if (activeDrawingTool.value && overlay && overlay.id) {
              addedDrawingOverlayIds.value.push(overlay.id)
              // Reset active state
              activeDrawingTool.value = null
              // Exit drawing mode
              try {
                if (typeof chartRef.value.overrideOverlay === 'function') {
                  chartRef.value.overrideOverlay(null)
                }
              } catch (e) {
              }
            }
          })

          // Listen for overlay drawing complete event (some versions may use this)
          if (typeof chartRef.value.subscribeAction === 'function') {
            try {
              chartRef.value.subscribeAction('onOverlayComplete', (overlay) => {
                if (activeDrawingTool.value && overlay && overlay.id) {
                  addedDrawingOverlayIds.value.push(overlay.id)
                  activeDrawingTool.value = null
                  // Exit drawing mode - do not call overrideOverlay(null) as it causes errors
                }
              })
            } catch (e) {
              // If onOverlayComplete does not exist, ignore error
            }
          }

          // Listen for overlay removal event
          chartRef.value.subscribeAction('onOverlayRemoved', (overlayId) => {
            // Remove from list
            const index = addedDrawingOverlayIds.value.indexOf(overlayId)
            if (index > -1) {
              addedDrawingOverlayIds.value.splice(index, 1)
            }
          })
        }

        // Use subscribeAction to listen for visible range changes and manually trigger load more
        // Replaces setLoadMoreDataCallback which may not fire in some versions
        if (chartRef.value && typeof chartRef.value.subscribeAction === 'function') {
          // Save last visible range to detect if scrolled to the leftmost
          let lastVisibleFrom = null
          // Flag whether the initial visible range change has been processed
          let initialRangeProcessed = false

          chartRef.value.subscribeAction('onVisibleRangeChange', async (data) => {
            if (data && typeof data.from === 'number') {
              // If this is the first visible range change during init, only record, do not trigger load
              if (!initialRangeProcessed) {
                lastVisibleFrom = data.from
                initialRangeProcessed = true
                // Delay marking chart init complete to ensure loads are only triggered after init finishes
                setTimeout(() => {
                  chartInitialized.value = true
                }, 1000)
                return
              }

              // If chart init is not yet complete, do not trigger load
              if (!chartInitialized.value) {
                lastVisibleFrom = data.from
                return
              }

              // If loading historical data and user tries to scroll further left, block scrolling
              if (loadingHistory.value && data.from <= 0) {
                // Try to keep visible range after the first data point to prevent further left scrolling
                try {
                  if (chartRef.value && typeof chartRef.value.setVisibleRange === 'function') {
                    const dataLength = klineData.value.length
                    if (dataLength > 0) {
                      // Get current visible range
                      const currentRange = chartRef.value.getVisibleRange()
                      if (currentRange) {
                        // Calculate the number of visible data bars
                        const visibleCount = Math.ceil((currentRange.to - currentRange.from) * dataLength / 100)
                        // Set new visible range starting from the first data point (index 0 = 0%, but we shift slightly right)
                        // Using percentage: first data point is ~0%, we set to 0.1% to prevent further left scrolling
                        const minFrom = 0.1
                        const newTo = Math.min(100, minFrom + (visibleCount / dataLength * 100))
                        chartRef.value.setVisibleRange(minFrom, newTo)
                      }
                    }
                  }
                } catch (e) {
                }
                return
              }

              // Trigger load when scrolled to leftmost (index near 0 or <= 5)
              // Only trigger on active left scroll (lastVisibleFrom > data.from means scrolling left)
              // [Key] Check both loadingHistory.value and loadingHistoryPromise to ensure no request is in progress
              if (data.from <= 5 && !loadingHistory.value && !loadingHistoryPromise && hasMoreHistory.value && chartInitialized.value) {
                // Check if user actively scrolled left (avoid triggering during init)
                if (lastVisibleFrom !== null && lastVisibleFrom > data.from) {
                  if (klineData.value.length > 0) {
                    const earliestTimestamp = klineData.value[0].timestamp
                    await loadMoreHistoryDataForScroll(earliestTimestamp)
                  }
                }
              }

              // Update last visible range
              lastVisibleFrom = data.from
            }
          })
        }

        // If data exists, apply it
        if (klineData.value && klineData.value.length > 0) {
          // Ensure data format is correct
          const validData = klineData.value.filter(item =>
            item.timestamp &&
            !isNaN(item.open) &&
            !isNaN(item.high) &&
            !isNaN(item.low) &&
            !isNaN(item.close)
          )

          if (validData.length > 0) {
            // Initialize with applyNewData
            try {
              chartRef.value.applyNewData(validData)
            } catch (e) {
              // Try fallback handling
              try {
                chartRef.value.applyNewData(validData)
              } catch (e2) {
              }
            }

            // Create volume indicator (shown by default)
            try {
              chartRef.value.createIndicator('VOL', false, { height: 100, dragEnabled: true })
            } catch (e) {
            }

            // Delay indicator update to ensure K-lines render first
            nextTick(() => {
              updateIndicators()
            })
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        error.value = proxy.$t('dashboard.indicator.error.chartInitFailed') + ': ' + (error.message || 'Unknown error')
      }
    }

    const handleResize = () => {
      if (chartRef.value) {
        setTimeout(() => {
          if (chartRef.value) {
            chartRef.value.resize()
          }
        }, 100)
      } else {
        const container = document.getElementById('kline-chart-container')
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          initChart()
        }
      }
    }

    // Update chart theme
    const updateChartTheme = () => {
      if (!chartRef.value) return

      const theme = themeConfig.value
      const isDark = chartTheme.value === 'dark'

      chartRef.value.setStyles({
        grid: {
          show: true,
          horizontal: {
            show: true,
            color: theme.gridLineColor,
            style: 'dashed',
            size: 1
          },
          vertical: {
            show: false
          }
        },
        candle: {
          priceMark: {
            show: true,
            high: {
              show: true,
              color: theme.axisLabelColor
            },
            low: {
              show: true,
              color: theme.axisLabelColor
            }
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
            labels: [
              proxy.$t('dashboard.indicator.tooltip.time'),
              proxy.$t('dashboard.indicator.tooltip.open'),
              proxy.$t('dashboard.indicator.tooltip.high'),
              proxy.$t('dashboard.indicator.tooltip.low'),
              proxy.$t('dashboard.indicator.tooltip.close'),
              proxy.$t('dashboard.indicator.tooltip.volume')
            ],
            values: (kLineData) => {
              const d = new Date(kLineData.timestamp)
              return [
                `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`,
                kLineData.open.toFixed(2),
                kLineData.high.toFixed(2),
                kLineData.low.toFixed(2),
                kLineData.close.toFixed(2),
                kLineData.volume.toFixed(0)
              ]
            }
          },
          bar: {
            upColor: isDark ? '#0ecb81' : '#13c2c2',
            downColor: isDark ? '#f6465d' : '#fa541c',
            noChangeColor: theme.borderColor
          }
        },
        indicator: {
          tooltip: {
            showRule: 'always',
            showType: 'standard'
          }
        },
        xAxis: {
          show: true,
          axisLine: {
            show: true,
            color: theme.borderColor
          }
        },
        yAxis: {
          show: true,
          axisLine: {
            show: false
          }
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          },
          vertical: {
            show: true,
            line: {
              show: true,
              style: 'dashed',
              color: theme.gridLineColor,
              size: 1
            }
          }
        },
        watermark: {
          show: false
        }
      })
    }

    // --- Register Custom Indicator Helper ---
    const registerCustomIndicator = (name, calcFunc, figures, calcParams = [], precision = 2, shouldOverlay = false) => {
      try {
        // KLineChart v9 uses series: 'price' to identify main chart indicators
        const indicatorConfig = {
          name,
          shortName: name, // Add shortName
          calc: calcFunc,
          figures,
          calcParams,
          precision,
          series: shouldOverlay ? 'price' : 'normal'
        }

        registerIndicator(indicatorConfig)
        // console.log(`Successfully registered indicator: ${name}, series: ${indicatorConfig.series}`)
        return true
      } catch (err) {
        // If already registered, ignore error
        if (err.message && err.message.includes('already registered')) {
          return true
        }
        return false
      }
    }

    // --- Update Indicators (KLineChart version) ---
    const updateIndicators = async () => {
      if (indicatorsUpdating.value) {
        return
      }
      // Use JSON serialize/deserialize to remove Vue 2 Observer interference
      if (!chartRef.value || klineData.value.length === 0) {
        return
      }

      indicatorsUpdating.value = true
      try {
      // 1. Remove all added signal overlays
      try {
        if (addedSignalOverlayIds.value.length > 0 && chartRef.value) {
          addedSignalOverlayIds.value.forEach(overlayId => {
            try {
              if (typeof chartRef.value.removeOverlay === 'function') {
                chartRef.value.removeOverlay(overlayId)
              } else if (typeof chartRef.value.removeOverlayById === 'function') {
                chartRef.value.removeOverlayById(overlayId)
              }
            } catch (err) {
            }
          })
          // Clear list
          addedSignalOverlayIds.value = []
        }
      } catch (e) {
      }

      // 2. Remove all added indicators
      try {
        if (addedIndicatorIds.value.length > 0) {
          addedIndicatorIds.value.forEach(info => {
            // info can be a { paneId, name } object or just a name string
            const name = typeof info === 'string' ? info : info.name
            const paneId = typeof info === 'string' ? undefined : info.paneId

            // Try to remove indicator
            // KLineChart v9: removeIndicator(paneId, name)
            if (paneId) {
              chartRef.value.removeIndicator(paneId, name)
            } else {
              // If no paneId, try removing from main chart
              chartRef.value.removeIndicator('candle_pane', name)
              // Can also try without passing paneId
              chartRef.value.removeIndicator(name)
            }
          })
          // Clear list
          addedIndicatorIds.value = []
        }
      } catch (e) {
      }

      // Convert data format (KLineChart needs internal format for calculations)
      const internalData = convertToInternalFormat(klineData.value)

      // Iterate through all active indicators
      for (let idx = 0; idx < props.activeIndicators.length; idx++) {
        const indicator = props.activeIndicators[idx]
        try {
          // Process Python indicators
          if (indicator.type === 'python') {
            if (!indicator.code) continue

            try {
              // If calculate function exists, use it (for Python indicators)
              if (indicator.calculate && typeof indicator.calculate === 'function') {
                const result = await indicator.calculate(internalData, indicator.params || {})

                // Process plots in result - merge all plots into one indicator
                // Note: signals are not added to the indicator but processed separately to avoid showing "n/a"
                let allPlots = []
                if (result && result.plots && Array.isArray(result.plots)) {
                  allPlots = [...result.plots]
                }

                // Process signals - display using KLineChart createOverlay (not added to indicator)
                if (result && result.signals && Array.isArray(result.signals)) {
                  for (const signal of result.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      // Count non-null values
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      // Find all non-null signal points
                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          // [Key change] Get current K-line High and Low
                          // Note: internalData is already in converted format; use directly
                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          // Buy-side labels are shown below candles; sell-side labels above candles.
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            // Determine anchor price: buy uses Low, sell uses High
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            // side is used for layout/styling; action preserves the original type (buy/sell).
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      // Use KLineChart createOverlay to add markers
                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            // Ensure timestamp is in milliseconds
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            // Only show buy or sell, no amount
                            const displaySimpleText = point.text

                            // === Use custom signalTag ===
                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                // [Key change] Pass in two points:
                                // Point 0: Signal trigger price (for drawing dot)
                                // Point 1: K-line extreme price (for positioning label)
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // Lock to prevent dragging
                              }, 'candle_pane') // Draw on main chart

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                            // === End of modification ===
                          } catch (overlayErr) {
                          }
                        }
                      } else {
                      }
                    }
                  }
                }

                // Only process plots (excluding signals)
                if (allPlots.length > 0) {
                  // Filter valid plots
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    // Build figures array containing all plots
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}_${idx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      // For regular plots, use original type or 'line'
                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    // Determine if overlay on main chart (overlay if all plots are overlay)
                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    // const customIndicatorName = `${indicator.id}_combined`
                    let customIndicatorName = `${indicator.id}_combined`
                    if (result && result.name) {
                      customIndicatorName = result.name
                    }
                    try {
                      // Register merged custom indicator
                      const registered = registerCustomIndicator(
                        customIndicatorName,
                        (kLineDataList) => {
                          const result = []
                          for (let i = 0; i < kLineDataList.length; i++) {
                            const dataPoint = {}
                            for (const figureKey in plotDataMap) {
                              const plotData = plotDataMap[figureKey]
                              dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                            }
                            result.push(dataPoint)
                          }
                          return result
                        },
                        figures,
                        [],
                        2,
                        allOverlay
                      )

                      if (registered) {
                        if (allOverlay) {
                          // Main chart indicator
                          const paneId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { id: 'candle_pane' }
                          )
                          if (paneId) {
                            addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                          } else {
                            addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                          }
                        } else {
                          // Sub-chart indicator
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              } else {
                // If no calculate function, use executePythonStrategy directly
                // Build decryption info
                const decryptInfo = {
                  id: indicator.originalId || indicator.id, // Prefer original database ID
                  user_id: indicator.user_id || indicator.userId,
                  is_encrypted: indicator.is_encrypted || indicator.isEncrypted || 0
                }
                const pythonResult = await executePythonStrategy(
                  indicator.code,
                  internalData,
                  indicator.params || {},
                  decryptInfo // Pass decryption info
                )

                // Process plots in result - merge all plots into one indicator
                // Note: signals are not added to the indicator but processed separately to avoid showing "n/a"
                let allPlots = []
                if (pythonResult && pythonResult.plots && Array.isArray(pythonResult.plots)) {
                  allPlots = [...pythonResult.plots]
                }

                // Process signals - display using KLineChart createOverlay (not added to indicator)
                if (pythonResult && pythonResult.signals && Array.isArray(pythonResult.signals)) {
                  for (const signal of pythonResult.signals) {
                    if (signal.data && Array.isArray(signal.data) && signal.data.length > 0) {
                      // Count non-null values
                      const sampleValues = []
                      for (let i = 0; i < Math.min(signal.data.length, 20); i++) {
                        const val = signal.data[i]
                        if (val !== null && val !== undefined && !isNaN(val)) {
                          if (sampleValues.length < 5) {
                            sampleValues.push({ index: i, value: val })
                          }
                        }
                      }

                      // Find all non-null signal points
                      const signalPoints = []
                      for (let i = 0; i < signal.data.length && i < internalData.length; i++) {
                        const signalValue = signal.data[i]
                        if (signalValue !== null && signalValue !== undefined && !isNaN(signalValue)) {
                          const klineItem = internalData[i]
                          const timestamp = klineItem.timestamp || klineItem.time

                          // [Key change] Get current K-line High and Low
                          // Note: internalData is already in converted format; use directly
                          const highPrice = klineItem.high
                          const lowPrice = klineItem.low

                          // Signal type: chart only displays indicator signals (buy/sell).
                          const signalTypeRaw = (signal.type || 'buy')
                          const signalType = String(signalTypeRaw).toLowerCase()
                          // Chart only displays indicator signals (no position mgmt / TP/SL / trailing etc).
                          const allowedSignalTypes = ['buy', 'sell']
                          if (!allowedSignalTypes.includes(signalType)) {
                            continue
                          }
                          const isBuySignal = signalType === 'buy'

                          // Text: prefer per-point textData, otherwise use signal.text, otherwise fallback to B/S.
                          let pointText = signal.text || (isBuySignal ? 'B' : 'S')
                          if (signal.textData && signal.textData[i] != null) {
                            pointText = signal.textData[i]
                          }

                          signalPoints.push({
                            timestamp,
                            price: signalValue,
                            // Determine anchor price: buy uses Low, sell uses High
                            anchorPrice: isBuySignal ? lowPrice : highPrice,
                            side: isBuySignal ? 'buy' : 'sell',
                            action: signalType,
                            color: signal.color || (isBuySignal ? '#00E676' : '#FF5252'),
                            text: pointText
                          })
                        }
                      }

                      // Use KLineChart createOverlay to add markers
                      if (signalPoints.length > 0 && chartRef.value) {
                        for (const point of signalPoints) {
                          try {
                            // Ensure timestamp is in milliseconds
                            let timestamp = point.timestamp
                            if (timestamp < 1e10) {
                              timestamp = timestamp * 1000
                            }

                            // Only show buy or sell, no amount
                            const displaySimpleText = point.text

                            // === Use custom signalTag ===
                            if (typeof chartRef.value.createOverlay === 'function') {
                              const overlayId = chartRef.value.createOverlay({
                                name: 'signalTag',
                                // [Key change] Pass in two points:
                                // Point 0: Signal trigger price (for drawing dot)
                                // Point 1: K-line extreme price (for positioning label)
                                points: [
                                  { timestamp: timestamp, value: point.price },
                                  { timestamp: timestamp, value: point.anchorPrice }
                                ],
                                extendData: {
                                  text: displaySimpleText,
                                  color: point.color,
                                  side: point.side,
                                  action: point.action,
                                  price: point.price
                                },
                                lock: true // Lock to prevent dragging
                              }, 'candle_pane') // Draw on main chart

                              if (overlayId) {
                                addedSignalOverlayIds.value.push(overlayId)
                              }
                            }
                            // === End of modification ===
                          } catch (overlayErr) {
                          }
                        }
                      } else {
                      }
                    }
                  }
                }

                // Only process plots (excluding signals)
                if (allPlots.length > 0) {
                  // Filter valid plots
                  const validPlots = allPlots.filter(plot => plot.data && Array.isArray(plot.data) && plot.data.length > 0)

                  if (validPlots.length > 0) {
                    // Build figures array containing all plots
                    const figures = []
                    const plotDataMap = {}

                    for (let plotIdx = 0; plotIdx < validPlots.length; plotIdx++) {
                      const plot = validPlots[plotIdx]
                      const plotName = plot.name || `PLOT_${plotIdx}`
                      const figureKey = plotName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_')
                      const plotColor = plot.color || getIndicatorColor(plotIdx)

                      // For regular plots, use original type or 'line'
                      const figureType = plot.type || 'line'

                      figures.push({
                        key: figureKey,
                        title: plot.name || plotName,
                        type: figureType,
                        color: plotColor
                      })

                      plotDataMap[figureKey] = plot.data
                    }

                    // Determine if overlay on main chart (overlay if all plots are overlay)
                    const allOverlay = validPlots.every(plot => plot.overlay !== false)
                    // const customIndicatorName = `${indicator.id}_combined`
                    let customIndicatorName = `${indicator.id}_combined`
                    if (pythonResult && pythonResult.name) {
                      customIndicatorName = pythonResult.name
                    }

                    try {
                      // Register merged custom indicator
                      const registered = registerCustomIndicator(
                        customIndicatorName,
                        (kLineDataList) => {
                          const result = []
                          for (let i = 0; i < kLineDataList.length; i++) {
                            const dataPoint = {}
                            for (const figureKey in plotDataMap) {
                              const plotData = plotDataMap[figureKey]
                              dataPoint[figureKey] = i < plotData.length ? plotData[i] : null
                            }
                            result.push(dataPoint)
                          }
                          return result
                        },
                        figures,
                        [],
                        2,
                        allOverlay
                      )

                      if (registered) {
                        if (allOverlay) {
                          // Main chart indicator
                          const paneId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { id: 'candle_pane' }
                          )
                          if (paneId) {
                            addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                          } else {
                            addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                          }
                        } else {
                          // Sub-chart indicator
                          const indicatorId = chartRef.value.createIndicator(
                            customIndicatorName,
                            false,
                            { height: 100, dragEnabled: true }
                          )
                          if (indicatorId) {
                            addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                          }
                        }
                      }
                    } catch (plotErr) {
                    }
                  }
                }
              }
            } catch (err) {
              // If Python engine not ready error, set load failed state
              if (err.message && err.message.includes('Python engine not ready')) {
                if (!loadingPython.value) {
                  pyodideLoadFailed.value = true
                }
              }
            }
            continue
          }

          // Note: calculate function may be null because indicator calculation logic is determined by id in updateIndicators
          // So we do not check calculate here; instead handle by indicator.id directly

          const color = getIndicatorColor(idx)

          // Create KLineChart indicators based on indicator type
          if (indicator.id === 'sma' || indicator.id === 'ema') {
            const maType = indicator.id === 'sma' ? 'SMA' : 'EMA'
            const period = indicator.params?.length || indicator.params?.period || 20
            const customIndicatorName = `${maType}_${period}`
            const figureKey = maType.toLowerCase()
            const calcPeriod = period

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const p = indicator.calcParams[0] || calcPeriod
                  // calculateSMA/EMA needs an array of objects with close property, not a number array
                  const values = maType === 'SMA'
                    ? calculateSMA(kLineDataList, p)
                    : calculateEMA(kLineDataList, p)
                  return values.map(v => ({ [figureKey]: v }))
                },
                [{ key: figureKey, title: `${maType}(${period})`, type: 'line' }],
                [period],
                2,
                true // shouldOverlay: true means main chart indicator
              )

              if (registered) {
                // Create indicator
                const paneId = chartRef.value.createIndicator(
                  customIndicatorName,
                  false, // isStack
                  { id: 'candle_pane' }
                )

                if (paneId) {
                  addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                } else {
                  // If returns null (main chart indicators may return null), still record it
                  addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'macd') {
            // MACD defaults to sub-chart
            const indicatorId = chartRef.value.createIndicator('MACD', false, { height: 100, dragEnabled: true })
            if (indicatorId) {
              addedIndicatorIds.value.push({ paneId: indicatorId, name: 'MACD' })
            }
          } else if (indicator.id === 'rsi') {
             const indicatorId = chartRef.value.createIndicator('RSI', false, { height: 100, dragEnabled: true })
             if (indicatorId) {
               addedIndicatorIds.value.push({ paneId: indicatorId, name: 'RSI' })
             }
          } else if (indicator.id === 'bollinger_bands' || indicator.id === 'bb') {
            // Bollinger Bands needs custom indicator registration
            const length = indicator.params?.length || 20
            const mult = indicator.params?.mult || 2
            const customIndicatorName = `BOLL_${length}_${mult}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 20
                  const mult = indicator.calcParams[1] || 2
                  // calculateBollingerBands needs an array of objects with close property
                  const bbResult = calculateBollingerBands(kLineDataList, length, mult)
                  // KLineChart needs an array of objects with keys matching figures keys
                  const result = []
                  for (let i = 0; i < bbResult.length; i++) {
                    result.push({
                      upper: bbResult[i]?.upper ?? null,
                      middle: bbResult[i]?.middle ?? null,
                      lower: bbResult[i]?.lower ?? null
                    })
                  }
                  return result
                },
                [
                  { key: 'upper', title: `Upper(${length},${mult})`, type: 'line' },
                  { key: 'middle', title: `Middle(${length})`, type: 'line' },
                  { key: 'lower', title: `Lower(${length},${mult})`, type: 'line' }
                ],
                [length, mult], // calcParams
                2, // precision
                true // shouldOverlay: true means main chart indicator
              )

              if (registered) {
                // Create indicator (main chart)
                const paneId = chartRef.value.createIndicator(
                  customIndicatorName,
                  false, // isStack: false means no stacking
                  { id: 'candle_pane' }
                )
                if (paneId) {
                  addedIndicatorIds.value.push({ paneId, name: customIndicatorName })
                } else {
                  addedIndicatorIds.value.push({ paneId: 'candle_pane', name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'atr') {
            // ATR needs custom indicator registration
            const period = indicator.params?.period || indicator.params?.length || 14
            const customIndicatorName = `ATR_${period}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const atrValues = calculateATR(data, period)
                  // Convert to KLineChart format: return array of objects
                  return atrValues.map(value => ({ atr: value }))
                },
                [{
                  key: 'atr',
                  title: `ATR(${period})`,
                  type: 'line',
                  color: color
                }],
                [period]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'williams' || indicator.id === 'williams_r') {
            // Williams %R needs custom indicator registration
            const length = indicator.params?.length || 14
            const customIndicatorName = `WPR_${length}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const wrValues = calculateWilliamsR(data, length)
                  // Convert to KLineChart format: return array of objects
                  return wrValues.map(value => ({ wr: value }))
                },
                [{
                  key: 'wr',
                  title: `W%R(${length})`,
                  type: 'line',
                  color: color
                }],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'mfi') {
            // MFI needs custom indicator registration
            const length = indicator.params?.length || 14
            const customIndicatorName = `MFI_${length}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume
                  }))
                  const mfiValues = calculateMFI(data, length)
                  // Convert to KLineChart format: return array of objects
                  return mfiValues.map(value => ({ mfi: value }))
                },
                [{
                  key: 'mfi',
                  title: `MFI(${length})`,
                  type: 'line',
                  color: color
                }],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'cci') {
            // CCI needs custom indicator registration
            const length = indicator.params?.length || 20
            const customIndicatorName = `CCI_${length}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 20
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const cciValues = calculateCCI(data, length)
                  // Convert to KLineChart format: return array of objects
                  return cciValues.map(value => ({ cci: value }))
                },
                [{
                  key: 'cci',
                  title: `CCI(${length})`,
                  type: 'line',
                  color: color
                }],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adx') {
            // ADX needs custom indicator registration
            const length = indicator.params?.length || 14
            const customIndicatorName = `ADX_${length}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const length = indicator.calcParams[0] || 14
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateADX(data, length)
                  // Convert to KLineChart format: return array of objects
                  return result.adx.map(value => ({ adx: value }))
                },
                [{
                  key: 'adx',
                  title: `ADX(${length})`,
                  type: 'line',
                  color: color
                }],
                [length]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'obv') {
            // OBV needs custom indicator registration
            const customIndicatorName = 'OBV'

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const obvValues = calculateOBV(data)
                  return obvValues.map(value => ({ obv: value }))
                },
                [{
                  key: 'obv',
                  title: 'OBV',
                  type: 'line',
                  color: color
                }],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'adosc') {
            // ADOSC needs custom indicator registration
            const fast = indicator.params?.fast || 3
            const slow = indicator.params?.slow || 10
            const customIndicatorName = `ADOSC_${fast}_${slow}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const fast = indicator.calcParams[0] || 3
                  const slow = indicator.calcParams[1] || 10
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adoscValues = calculateADOSC(data, fast, slow)
                  return adoscValues.map(value => ({ adosc: value }))
                },
                [{
                  key: 'adosc',
                  title: `ADOSC(${fast},${slow})`,
                  type: 'line',
                  color: color
                }],
                [fast, slow]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'ad') {
            // AD needs custom indicator registration
            const customIndicatorName = 'AD'

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume || 0
                  }))
                  const adValues = calculateAD(data)
                  return adValues.map(value => ({ ad: value }))
                },
                [{
                  key: 'ad',
                  title: 'AD',
                  type: 'line',
                  color: color
                }],
                []
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else if (indicator.id === 'kdj') {
            // KDJ needs custom indicator registration
            const period = indicator.params?.period || 9
            const kPeriod = indicator.params?.k || 3
            const dPeriod = indicator.params?.d || 3
            const customIndicatorName = `KDJ_${period}_${kPeriod}_${dPeriod}`

            try {
              const registered = registerCustomIndicator(
                customIndicatorName,
                (kLineDataList, indicator) => {
                  const period = indicator.calcParams[0] || 9
                  const kPeriod = indicator.calcParams[1] || 3
                  const dPeriod = indicator.calcParams[2] || 3
                  const data = kLineDataList.map(d => ({
                    high: d.high,
                    low: d.low,
                    close: d.close
                  }))
                  const result = calculateKDJ(data, period, kPeriod, dPeriod)
                  return result.k.map((k, i) => ({
                    k: k,
                    d: result.d[i],
                    j: result.j[i]
                  }))
                },
                [
                  { key: 'k', title: `K(${period},${kPeriod})`, type: 'line', color: '#FF6B6B' },
                  { key: 'd', title: `D(${dPeriod})`, type: 'line', color: '#4ECDC4' },
                  { key: 'j', title: `J`, type: 'line', color: '#95E1D3' }
                ],
                [period, kPeriod, dPeriod]
              )

              if (registered) {
                const indicatorId = chartRef.value.createIndicator(customIndicatorName, false, { height: 100, dragEnabled: true })
                if (indicatorId) {
                  addedIndicatorIds.value.push({ paneId: indicatorId, name: customIndicatorName })
                }
              }
            } catch (err) {
            }
          } else {
            // Try creating directly with indicator.id (assuming built-in indicator name)
            try {
              const indicatorName = indicator.id.toUpperCase()
              const indicatorId = chartRef.value.createIndicator(indicatorName, false, { height: 100, dragEnabled: true })
              if (indicatorId) {
                addedIndicatorIds.value.push({ paneId: indicatorId, name: indicatorName })
              }
            } catch (err) {
            }
          }
          // ... other indicators ...
        } catch (e) {
        }
      }
      } finally {
        indicatorsUpdating.value = false
      }
    }

    const handleRetry = () => {
      loadKlineData()
    }

    // Lifecycle
    watch(() => props.symbol, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })
    watch(() => props.theme, (newTheme) => {
      chartTheme.value = newTheme
      if (chartRef.value) {
        updateChartTheme()
        updateIndicators()
      }
    })

    watch(() => props.symbol, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.market, () => {
      if (props.symbol) {
        loadKlineData()
      }
    })

    watch(() => props.timeframe, () => {
      if (props.symbol) {
        loadKlineData()
      }
      // When timeframe changes, restart realtime update (if enabled)
      if (props.realtimeEnabled) {
        stopRealtime()
        startRealtime()
      }
    })

    watch(() => props.activeIndicators, (newVal, oldVal) => {
      // When indicator list changes, re-render chart
      if (chartRef.value && klineData.value.length > 0) {
        // Use nextTick to ensure DOM update is complete before updating chart
        nextTick(() => {
          if (chartRef.value) {
            updateIndicators()
          }
        })
      }
    }, { deep: true })

    watch(() => props.realtimeEnabled, (newVal) => {
      if (newVal) {
        startRealtime()
      } else {
        stopRealtime()
      }
    })

    onMounted(async () => {
      // Prefer props.theme (from Vuex store) to ensure sync with system theme
      // Use nextTick to ensure props have been correctly passed
      await nextTick()
      if (props.theme && (props.theme === 'dark' || props.theme === 'light')) {
        chartTheme.value = props.theme
      }

      // Load Pyodide
      try {
        await loadPyodide()
      } catch (err) {
        pyodideLoadFailed.value = true
      }

      nextTick(() => {
        setTimeout(() => {
          if (!chartRef.value && props.symbol) {
            initChart()
          }
        }, 300)
      })
    })

    onBeforeUnmount(() => {
      stopRealtime()
      if (chartRef.value) {
        chartRef.value.destroy()
        chartRef.value = null
      }
      window.removeEventListener('resize', handleResize)
    })

    return {
      klineData,
      loading,
      error,
      loadingHistory,
      chartRef,
      chartTheme,
      themeConfig,
      getIndicatorColor,
      handleRetry,
      loadingPython,
      pythonReady,
      pyodideLoadFailed,
      formatKlineData,
      updatePricePanel,
      isSameTimeframe,
      loadKlineData,
      loadMoreHistoryData,
      updateKlineRealtime,
      startRealtime,
      stopRealtime,
      initChart,
      handleResize,
      updateChartTheme,
      updateIndicators,
      executePythonStrategy,
      parsePythonStrategy,
      indicatorButtons,
      isIndicatorActive,
      toggleIndicator,
      drawingTools,
      activeDrawingTool,
      selectDrawingTool,
      clearAllDrawings
    }
  }
}
</script>

<style lang="less" scoped>
/* Left chart container */
.chart-left {
  width: 70% !important;
  flex: 0 0 70% !important;
  position: relative;
  border-right: 1px solid #e8e8e8;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;

  &.theme-dark {
    background: #131722;
    border-right-color: #2a2e39;
  }
}

.chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  display: flex;

  .theme-dark & {
    background: #131722;
  }
}

/* Drawing tools toolbar */
.drawing-toolbar {
  flex-shrink: 0;
  width: 40px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 4px;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
}

.chart-left.theme-dark .drawing-toolbar {
  background: #131722;
  border-right-color: #2a2e39;
}

.drawing-tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  color: #666;
  font-size: 16px;
  user-select: none;
}

.chart-left.theme-dark .drawing-tool-btn {
  color: #d1d4dc;
}

.drawing-tool-btn:hover {
  background: #f0f2f5;
  color: #1890ff;
}

.chart-left.theme-dark .drawing-tool-btn:hover {
  background: #1f2943;
  color: #13c2c2;
}

.drawing-tool-btn.active {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #1890ff;
}

.chart-left.theme-dark .drawing-tool-btn.active {
  background: #1f2943;
  color: #13c2c2;
  border-color: #13c2c2;
}

.drawing-toolbar .ant-divider-vertical {
  margin: 8px 0;
  height: 20px;
}

/* Indicator toolbar */
.indicator-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  z-index: 1;
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.indicator-toolbar::-webkit-scrollbar {
  display: none; /* Chrome Safari */
  width: 0;
  height: 0;
}

/* Chart content area */
.chart-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevent flex child overflow */
  overflow: hidden;
}

.chart-left.theme-dark .indicator-toolbar {
  background: #131722;
  border-bottom-color: #2a2e39;
}

.indicator-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #f0f2f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
  user-select: none;
}

.chart-left.theme-dark .indicator-btn {
  color: #d1d4dc;
  background: #1f2943;
  border-color: #2a2e39;
}

.indicator-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
  background: #f0f8ff;
}

.chart-left.theme-dark .indicator-btn:hover {
  color: #13c2c2;
  border-color: #13c2c2;
  background: #1f2943;
}

.indicator-btn.active {
  color: #1890ff;
  background: #fff;
  border-color: #1890ff;
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.chart-left.theme-dark .indicator-btn.active {
  color: #13c2c2;
  background: #1f2943;
  border-color: #13c2c2;
  box-shadow: 0 0 0 2px rgba(19, 194, 194, 0.2);
}

.kline-chart-container {
  flex: 1;
  width: 100%;
  min-width: 0; /* Prevent flex child overflow */
  background: #fff;
  transition: background-color 0.3s;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
  overflow: hidden;

  .theme-dark & {
    background: #131722;
  }
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  backdrop-filter: blur(2px);
}

.chart-left.theme-dark .chart-overlay {
  background: rgba(19, 23, 34, 0.95);
}

.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
}

.initial-hint {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .initial-hint {
  background: rgba(19, 23, 34, 0.98);
}

.hint-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  padding: 20px;
}

.pyodide-warning {
  background: rgba(255, 255, 255, 0.98);
}

.chart-left.theme-dark .pyodide-warning {
  background: rgba(19, 23, 34, 0.98);
}

.warning-box {
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 500px;
  padding: 20px;
}

.warning-title {
  font-size: 16px;
  font-weight: 600;
  color: #faad14;
  margin-bottom: 8px;
}

.warning-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.chart-left.theme-dark .warning-box {
  color: #d1d4dc;
}

.chart-left.theme-dark .warning-title {
  color: #faad14;
}

.chart-left.theme-dark .warning-desc {
  color: #868993;
}

.chart-left.theme-dark .hint-box {
  color: #d1d4dc;
}

.hint-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.chart-left.theme-dark .hint-title {
  color: #d1d4dc;
}

.hint-desc {
  font-size: 14px;
  color: #999;
  line-height: 1.6;
}

.chart-left.theme-dark .hint-desc {
  color: #787b86;
}

/* Historical data loading hint */
.history-loading-hint {
  position: absolute;
  left: 20px;
  top: 60px;
  z-index: 1000 !important;
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.98) !important;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #666 !important;
  backdrop-filter: blur(4px);
  pointer-events: none;
  visibility: visible !important;
  opacity: 1 !important;
}

.chart-left.theme-dark .history-loading-hint {
  background: rgba(19, 23, 34, 0.98) !important;
  border-color: #2a2e39;
  color: #d1d4dc !important;
}

.loading-text {
  white-space: nowrap;
  margin-left: 4px;
}

/* Mobile adaptation */
@media (max-width: 768px) {
  .drawing-toolbar {
    display: none; /* Hide drawing toolbar on mobile */
  }

  .indicator-toolbar {
    padding-left: 12px; /* Restore original padding on mobile */
    flex-wrap: nowrap; /* No wrapping on mobile, show single row */
    overflow-x: auto; /* Allow horizontal scrolling */
    overflow-y: hidden; /* Disable vertical scrolling */
    scrollbar-width: none; /* Firefox: hide scrollbar */
    -ms-overflow-style: none; /* IE 10+: hide scrollbar */
    -webkit-overflow-scrolling: touch; /* iOS smooth scrolling */
  }

  .indicator-toolbar::-webkit-scrollbar {
    display: none; /* Chrome Safari: hide scrollbar */
    width: 0;
    height: 0;
  }

  .indicator-btn {
    flex-shrink: 0; /* Buttons do not shrink, keep original size */
  }
}

@media (max-width: 1200px) {
  .drawing-toolbar {
    display: none; /* Hide drawing toolbar on mobile */
  }

  .indicator-toolbar {
    padding-left: 12px; /* Restore original padding on mobile */
  }

  .kline-chart-container {
    margin-left: 0; /* Restore original margin on mobile */
  }

  .chart-left {
    width: 100% !important;
    min-width: 100% !important;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
    height: 600px !important;
    min-height: 600px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 600px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 600px !important;
  }
}

@media (max-width: 992px) {
  .chart-left {
    height: 650px !important;
    min-height: 650px !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 650px !important;
  }

  .kline-chart-container {
    height: 100% !important;
    min-height: 650px !important;
  }
}

@media (max-width: 768px) {
  .chart-left {
    height: 60vh !important;
    min-height: 400px !important;
    max-height: 80vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 400px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* Subtract toolbar height */
    min-height: 350px !important;
    max-height: calc(100% - 45px) !important;
  }
}

@media (max-width: 576px) {
  .chart-left {
    height: 55vh !important;
    min-height: 350px !important;
    max-height: 75vh !important;
  }

  .chart-wrapper {
    height: 100% !important;
    min-height: 350px !important;
    max-height: 100% !important;
  }

  .kline-chart-container {
    height: calc(100% - 45px) !important; /* Subtract toolbar height */
    min-height: 300px !important;
    max-height: calc(100% - 45px) !important;
  }
}
</style>
