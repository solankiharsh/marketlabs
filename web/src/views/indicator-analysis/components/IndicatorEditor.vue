<template>
  <div>
    <a-modal
      :title="$t('dashboard.indicator.editor.title')"
      :visible="visible"
      :width="isMobile ? '100%' : '95vw'"
      :confirmLoading="saving"
      @ok="handleSave"
      @cancel="handleCancel"
      @afterClose="handleAfterClose"
      :okText="$t('dashboard.indicator.editor.save')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :maskClosable="false"
      :centered="false"
      :style="isMobile ? { top: 0, paddingBottom: 0 } : { top: '2%' }"
      class="indicator-editor-modal"
    >
      <div class="editor-content">
        <a-row :gutter="16" class="editor-layout" :class="{ 'mobile-layout': isMobile }">
          <!-- Left side: Code editor and AI generation -->
          <a-col :span="24" :xs="24" :sm="24" :md="24" class="code-editor-column">
            <div class="code-section">
              <div class="section-header">
                <div class="header-left">
                  <span class="section-title">{{ $t('dashboard.indicator.editor.code') }}</span>
                </div>
                <div class="section-actions">
                  <a-button
                    type="link"
                    size="small"
                    @click="handleVerifyCode"
                    :loading="verifying"
                    style="padding: 0 8px; color: #52c41a; font-weight: bold;"
                  >
                    <a-icon type="check-circle" />
                    {{ $t('dashboard.indicator.editor.verifyCode') }}
                  </a-button>
                  <a-button type="link" size="small" @click="goToDocs" style="padding: 0;">
                    <a-icon type="book" />
                    {{ $t('dashboard.indicator.editor.guide') }}
                  </a-button>
                </div>
              </div>

              <a-alert
                type="info"
                show-icon
                style="margin-bottom: 12px;"
                :message="$t('dashboard.indicator.boundary.message')"
                :description="$t('dashboard.indicator.boundary.indicatorRule')"
              />

              <!-- Code editor mode -->
              <div class="code-mode-split">
                <a-row :gutter="16" class="code-mode-row">
                  <!-- Left: Code editor -->
                  <a-col :xs="24" :sm="24" :md="18" class="code-pane">
                    <div ref="codeEditorContainer" class="code-editor-container"></div>
                  </a-col>
                  <!-- Right: AI generation -->
                  <a-col :xs="24" :sm="24" :md="6" class="ai-pane">
                    <div class="ai-panel">
                      <div class="ai-panel-title">
                        <a-icon type="robot" />
                        <span>{{ $t('dashboard.indicator.editor.aiGenerate') }}</span>
                      </div>
                      <a-textarea
                        v-model="aiPrompt"
                        :placeholder="$t('dashboard.indicator.editor.aiPromptPlaceholder')"
                        :rows="12"
                        :auto-size="{ minRows: 12, maxRows: 20 }"
                      />
                      <a-button
                        type="primary"
                        block
                        @click="handleAIGenerate"
                        :loading="aiGenerating"
                        size="large"
                        style="margin-top: 10px;"
                      >
                        {{ $t('dashboard.indicator.editor.aiGenerateBtn') }}
                      </a-button>
                    </div>
                  </a-col>
                </a-row>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
      <div slot="footer" class="editor-footer">
        <a-button @click="handleCancel">
          {{ $t('dashboard.indicator.editor.cancel') }}
        </a-button>
        <a-button type="primary" @click="handleSave" :loading="saving">
          {{ $t('dashboard.indicator.editor.save') }}
        </a-button>
      </div>
    </a-modal>

  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
// Python mode
import 'codemirror/mode/python/python'
// Themes (optional)
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
// Common plugins
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import request from '@/utils/request'

export default {
  name: 'IndicatorEditor',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    indicator: {
      type: Object,
      default: null
    },
    userId: {
      type: Number,
      default: null
    }
  },
  data () {
    return {
      saving: false,
      codeEditor: null,
      aiPrompt: '',
      aiGenerating: false,
      verifying: false,
      isMobile: false
    }
  },
  computed: {},
  watch: {
    visible (val) {
      if (val) {
        // When Modal opens, wait for DOM update then initialize editor
        this.$nextTick(() => {
          // Delay slightly to ensure Modal is fully rendered and form fields are registered
          setTimeout(() => {
            if (!this.codeEditor && this.$refs.codeEditorContainer) {
              this.initCodeEditor()
            }

            // Initialize form data
            this.initFormData()
          }, 200)
        })
      } else {
        // When Modal closes, refresh editor to ensure correct display on next open
        if (this.codeEditor) {
          this.codeEditor.refresh()
        }
      }
    },
    indicator: {
      handler (val) {
        if (val && this.visible) {
          // When indicator changes and modal is visible, wait briefly then update form data
          this.$nextTick(() => {
            setTimeout(() => {
              this.initFormData()
            }, 100)
          })
        }
      },
      deep: true
    }
  },
  mounted () {
    // Detect if on mobile device
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)

    // If visible is initially true, also initialize
    if (this.visible) {
      this.$nextTick(() => {
        setTimeout(() => {
          this.initCodeEditor()
        }, 100)
      })
    }
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.checkMobile)
    if (this.codeEditor) {
      try {
        // fromTextArea() instances have toTextArea(); CodeMirror(div, ...) does not.
        if (typeof this.codeEditor.toTextArea === 'function') {
          this.codeEditor.toTextArea()
        } else if (typeof this.codeEditor.getWrapperElement === 'function') {
          const wrapper = this.codeEditor.getWrapperElement()
          if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper)
          }
        }
      } catch (e) {
        // ignore destroy errors
      } finally {
        this.codeEditor = null
      }
    }
  },
  methods: {
    // Default indicator template (buy/sell only). Shown when creating a new indicator.
    // NOTE: Keep comments and default texts in English (project convention).
    getDefaultIndicatorCode () {
      return `#Demo Code:
#my_indicator_name = "My Buy/Sell Indicator"
#my_indicator_description = "Buy/Sell only; execution is normalized in backend."

#df = df.copy()
#sma = df["close"].rolling(14).mean()
#buy = (df["close"] > sma) & (df["close"].shift(1) <= sma.shift(1))
#sell = (df["close"] < sma) & (df["close"].shift(1) >= sma.shift(1))
#df["buy"] = buy.fillna(False).astype(bool)
#df["sell"] = sell.fillna(False).astype(bool)

#buy_marks = [df["low"].iloc[i] * 0.995 if df["buy"].iloc[i] else None for i in range(len(df))]
#sell_marks = [df["high"].iloc[i] * 1.005 if df["sell"].iloc[i] else None for i in range(len(df))]

#output = {
#  "name": my_indicator_name,
#  "plots": [],
#  "signals": [
#    {"type": "buy", "text": "B", "data": buy_marks, "color": "#00E676"},
#    {"type": "sell", "text": "S", "data": sell_marks, "color": "#FF5252"}
#  ]
#}
`
    },
    // Detect if on mobile device
    checkMobile () {
      this.isMobile = window.innerWidth <= 768
    },

    /* Visual editor removed (code mode only).

      // Helper function for crossovers
      code += `def crossover(series1, series2):\n`
      code += `    return (series1 > series2) & (series1.shift(1) <= series2.shift(1))\n\n`
      code += `def crossunder(series1, series2):\n`
      code += `    return (series1 < series2) & (series1.shift(1) >= series2.shift(1))\n\n`

      modules.forEach((mod, idx) => {
        const id = mod.id || (idx + 1)
        const s = mod.style

        if (mod.type === 'SMA') {
          code += `# Module ${id}: SMA\n`
          code += `sma_${id} = df['${mod.params.source}'].rolling(${mod.params.period}).mean()\n`
          code += `output_plots.append({ "name": "SMA ${mod.params.period} (#${id})", "data": sma_${id}.tolist(), "color": "${s.color}", "overlay": ${s.overlay ? 'True' : 'False'} })\n\n`
        } else if (mod.type === 'EMA') {
          code += `# Module ${id}: EMA\n`
          code += `ema_${id} = df['${mod.params.source}'].ewm(span=${mod.params.period}, adjust=False).mean()\n`
          code += `output_plots.append({ "name": "EMA ${mod.params.period} (#${id})", "data": ema_${id}.tolist(), "color": "${s.color}", "overlay": ${s.overlay ? 'True' : 'False'} })\n\n`
        } else if (mod.type === 'RSI') {
          code += `# Module ${id}: RSI\n`
          code += `delta_${id} = df['close'].diff()\n`
          code += `gain_${id} = (delta_${id}.where(delta_${id} > 0, 0)).ewm(alpha=1/${mod.params.period}, adjust=False).mean()\n`
          code += `loss_${id} = (-delta_${id}.where(delta_${id} < 0, 0)).ewm(alpha=1/${mod.params.period}, adjust=False).mean()\n`
          code += `rs_${id} = gain_${id} / loss_${id}\n`
          code += `rsi_${id} = 100 - (100 / (1 + rs_${id}))\n`
          code += `output_plots.append({ "name": "RSI ${mod.params.period} (#${id})", "data": rsi_${id}.tolist(), "color": "${s.color}", "overlay": False })\n`
          code += `output_plots.append({ "name": "Overbought", "data": [70]*len(df), "color": "#999", "style": "dashed", "overlay": False })\n`
          code += `output_plots.append({ "name": "Oversold", "data": [30]*len(df), "color": "#999", "style": "dashed", "overlay": False })\n\n`
        } else if (mod.type === 'MACD') {
            code += `# Module ${id}: MACD\n`
            code += `exp1_${id} = df['close'].ewm(span=${mod.params.fast}, adjust=False).mean()\n`
            code += `exp2_${id} = df['close'].ewm(span=${mod.params.slow}, adjust=False).mean()\n`
            code += `macd_${id} = exp1_${id} - exp2_${id}\n`
            code += `signal_${id} = macd_${id}.ewm(span=${mod.params.signal}, adjust=False).mean()\n`
            code += `hist_${id} = macd_${id} - signal_${id}\n`
            code += `output_plots.append({ "name": "MACD (#${id})", "data": macd_${id}.tolist(), "color": "${s.color}", "overlay": False })\n`
            code += `output_plots.append({ "name": "Signal (#${id})", "data": signal_${id}.tolist(), "color": "#ff9f43", "overlay": False })\n`
            code += `output_plots.append({ "name": "Hist (#${id})", "data": hist_${id}.tolist(), "color": "#ccc", "type": "bar", "overlay": False })\n\n`
        } else if (mod.type === 'BOLL') {
            code += `# Module ${id}: BOLL\n`
            code += `mid_${id} = df['close'].rolling(${mod.params.period}).mean()\n`
            code += `std_${id} = df['close'].rolling(${mod.params.period}).std()\n`
            code += `upper_${id} = mid_${id} + (${mod.params.std} * std_${id})\n`
            code += `lower_${id} = mid_${id} - (${mod.params.std} * std_${id})\n`
            code += `output_plots.append({ "name": "Boll Upper (#${id})", "data": upper_${id}.tolist(), "color": "${s.color}", "overlay": True })\n`
            code += `output_plots.append({ "name": "Boll Lower (#${id})", "data": lower_${id}.tolist(), "color": "${s.color}", "overlay": True })\n`
            code += `output_plots.append({ "name": "Boll Mid (#${id})", "data": mid_${id}.tolist(), "color": "${s.color}", "style": "dashed", "overlay": True })\n\n`
        } else if (mod.type === 'KDJ') {
            code += `# Module ${id}: KDJ\n`
            code += `low_min_${id} = df['low'].rolling(${mod.params.period}).min()\n`
            code += `high_max_${id} = df['high'].rolling(${mod.params.period}).max()\n`
            code += `rsv_${id} = (df['close'] - low_min_${id}) / (high_max_${id} - low_min_${id}) * 100\n`
            code += `k_${id} = rsv_${id}.ewm(alpha=1/${mod.params.m1}, adjust=False).mean()\n`
            code += `d_${id} = k_${id}.ewm(alpha=1/${mod.params.m2}, adjust=False).mean()\n`
            code += `j_${id} = 3 * k_${id} - 2 * d_${id}\n`
            code += `output_plots.append({ "name": "K (#${id})", "data": k_${id}.tolist(), "color": "${s.color}", "overlay": False })\n`
            code += `output_plots.append({ "name": "D (#${id})", "data": d_${id}.tolist(), "color": "#ff9f43", "overlay": False })\n`
            code += `output_plots.append({ "name": "J (#${id})", "data": j_${id}.tolist(), "color": "#ffec3d", "overlay": False })\n\n`
        } else if (mod.type === 'CCI') {
            code += `# Module ${id}: CCI\n`
            code += `tp_${id} = (df['high'] + df['low'] + df['close']) / 3\n`
            code += `ma_${id} = tp_${id}.rolling(${mod.params.period}).mean()\n`
            code += `md_${id} = tp_${id}.rolling(${mod.params.period}).apply(lambda x: np.mean(np.abs(x - np.mean(x))))\n`
            code += `cci_${id} = (tp_${id} - ma_${id}) / (0.015 * md_${id})\n`
            code += `output_plots.append({ "name": "CCI (#${id})", "data": cci_${id}.tolist(), "color": "${s.color}", "overlay": False })\n`
            code += `output_plots.append({ "name": "Upper", "data": [100]*len(df), "color": "#999", "style": "dashed", "overlay": False })\n`
            code += `output_plots.append({ "name": "Lower", "data": [-100]*len(df), "color": "#999", "style": "dashed", "overlay": False })\n\n`
        } else if (mod.type === 'ATR') {
            code += `# Module ${id}: ATR\n`
            code += `tr1_${id} = df['high'] - df['low']\n`
            code += `tr2_${id} = (df['high'] - df['close'].shift(1)).abs()\n`
            code += `tr3_${id} = (df['low'] - df['close'].shift(1)).abs()\n`
            code += `tr_${id} = pd.concat([tr1_${id}, tr2_${id}, tr3_${id}], axis=1).max(axis=1)\n`
            code += `atr_${id} = tr_${id}.rolling(${mod.params.period}).mean()\n`
            code += `output_plots.append({ "name": "ATR (#${id})", "data": atr_${id}.tolist(), "color": "${s.color}", "overlay": False })\n\n`
        } else if (mod.type === 'SIGNAL') {
            code += `# Module ${id}: Signal Logic\n`

            // Helper to get variable name or default to 'close' if not found or 'close'
            const getVar = (val) => {
                if (!val || val === 'close') return "df['close']"
                // Check if it's a numeric constant
                if (!isNaN(parseFloat(val))) return parseFloat(val)
                return val
            }

            const leftBuy = getVar(mod.params.buy_cond_left)
            const rightBuy = getVar(mod.params.buy_cond_right)
            let buyCond = ''

            if (mod.params.buy_op === '>') buyCond = `(${leftBuy} > ${rightBuy})`
            else if (mod.params.buy_op === '<') buyCond = `(${leftBuy} < ${rightBuy})`
            else if (mod.params.buy_op === 'cross_up') buyCond = `crossover(${leftBuy}, ${rightBuy})`
            else if (mod.params.buy_op === 'cross_down') buyCond = `crossunder(${leftBuy}, ${rightBuy})`

            const leftSell = getVar(mod.params.sell_cond_left)
            const rightSell = getVar(mod.params.sell_cond_right)
            let sellCond = ''

            if (mod.params.sell_op === '>') sellCond = `(${leftSell} > ${rightSell})`
            else if (mod.params.sell_op === '<') sellCond = `(${leftSell} < ${rightSell})`
            else if (mod.params.sell_op === 'cross_up') sellCond = `crossover(${leftSell}, ${rightSell})`
            else if (mod.params.sell_op === 'cross_down') sellCond = `crossunder(${leftSell}, ${rightSell})`

            code += `buy_signal_${id} = ${buyCond}\n`
            code += `sell_signal_${id} = ${sellCond}\n`

            code += `output_signals.append({\n`
            code += `    "type": "buy",\n`
            code += `    "text": "B",\n`
            code += `    "data": [df['low'].iloc[i] * 0.995 if buy_signal_${id}.iloc[i] else None for i in range(len(df))],\n`
            code += `    "color": "#00E676"\n`
            code += `})\n`
            code += `output_signals.append({\n`
            code += `    "type": "sell",\n`
            code += `    "text": "S",\n`
            code += `    "data": [df['high'].iloc[i] * 1.005 if sell_signal_${id}.iloc[i] else None for i in range(len(df))],\n`
            code += `    "color": "#FF5252"\n`
            code += `})\n\n`
        }
      })

      code += `output = {\n`
      code += `    "name": my_indicator_name,\n`
      code += `    "plots": output_plots,\n`
      code += `    "signals": output_signals\n`
      code += `}\n`

      this.codeEditor.setValue(code)
      this.editMode = 'code'
      this.$message.success('Code generated successfully!')
    },
    parseConfigFromCode (code) {
      if (!code) return
      const regex = /# <VISUAL_CONF>\s*\n# (.*?)\s*\n# <\/VISUAL_CONF>/s
      const match = code.match(regex)
      if (match && match[1]) {
        try {
          this.visualModules = JSON.parse(match[1])
          this.editMode = 'visual' // Auto-switch to visual if config found
        } catch (e) {
          console.error('Failed to parse visual config', e)
        }
      } else {
        this.editMode = 'code'
        this.visualModules = []
      }
    },

    */

    // Navigate to documentation
    goToDocs () {
      window.open('https://github.com/solankiharsh/marketlabs/blob/main/docs/STRATEGY_DEV_GUIDE.md', '_blank')
    },

    // Verify code
    handleVerifyCode () {
      const code = this.codeEditor ? this.codeEditor.getValue() : ''
      if (!code || !code.trim()) {
        this.$message.warning(this.$t('dashboard.indicator.editor.verifyCodeEmpty'))
        return
      }

      this.verifying = true
      // Use request utility (axios) to send the request; it handles baseURL and token automatically
      request({
        url: '/api/indicator/verifyCode',
        method: 'post',
        data: { code: code }
      }).then(res => {
        if (res.code === 1) {
          const data = res.data || {}
          this.$message.success(`${this.$t('dashboard.indicator.editor.verifyCodeSuccess')} (${data.plots_count || 0} plots, ${data.signals_count || 0} signals)`)
        } else {
          // Show detailed error
          const errorData = res.data || {}
          this.$error({
            title: this.$t('dashboard.indicator.editor.verifyCodeFailed'),
            width: 600,
            content: (h) => {
              return h('div', [
                h('p', { style: { fontWeight: 'bold', color: '#ff4d4f' } }, res.msg),
                errorData.details ? h('pre', {
                  style: {
                    background: '#f5f5f5',
                    padding: '8px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    marginTop: '8px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }
                }, errorData.details) : null
              ])
            }
          })
        }
      }).catch(err => {
        this.$message.error('Request Failed: ' + (err.message || 'Unknown Error'))
      }).finally(() => {
        this.verifying = false
      })
    },

    // Clean markdown code block markers from code
    cleanMarkdownCodeBlocks (code) {
      if (!code || typeof code !== 'string') {
        return code
      }

      let cleanedCode = code.trim()

      // Check if code contains code block markers
      const hasCodeBlockMarkers = /```/.test(cleanedCode)

      if (!hasCodeBlockMarkers) {
        // If no code block markers found, return as-is
        return cleanedCode
      }

      // Remove opening code block markers (e.g. ```python, ```py, ``` etc.)
      // Match ``` at the start, possibly with language identifier (python, py, python3 etc.), followed by optional whitespace and newline
      cleanedCode = cleanedCode.replace(/^```[\w]*\s*\n?/i, '')

      // If opening marker remains (possibly without language identifier), try removing again
      if (cleanedCode.startsWith('```')) {
        cleanedCode = cleanedCode.replace(/^```\s*\n?/g, '')
      }

      // Remove closing code block marker (```)
      if (cleanedCode.endsWith('```')) {
        cleanedCode = cleanedCode.replace(/\n?```\s*$/g, '')
      }

      // Remove stray ``` markers that may appear in the middle of the code (usually erroneous)
      // Match lines that contain only ``` and possibly a language identifier
      cleanedCode = cleanedCode.replace(/^\s*```[\w]*\s*$/gm, '')
      cleanedCode = cleanedCode.replace(/^\s*```\s*$/gm, '')

      // Clean up excessive blank lines (reduce 3+ consecutive newlines to 2)
      cleanedCode = cleanedCode.replace(/\n{3,}/g, '\n\n')

      // Trim leading and trailing whitespace again
      cleanedCode = cleanedCode.trim()

      return cleanedCode
    },
    // Initialize modal data (edit/create)
    initFormData () {
      if (!this.visible) {
        return
      }

      let code = this.indicator ? (this.indicator.code || '') : ''
      // If creating a new indicator (or code is empty), show the default template.
      if (!code || !String(code).trim()) {
        code = this.getDefaultIndicatorCode()
      }
      this.$nextTick(() => {
        setTimeout(() => {
          this.aiPrompt = ''
          if (this.codeEditor) {
            this.codeEditor.setValue(code)
            this.codeEditor.refresh()
          }
          // Visual editor removed
        }, 50)
      })
    },
    initCodeEditor () {
      if (!this.$refs.codeEditorContainer) {
        return
      }

      // If editor already exists, destroy it first
      if (this.codeEditor) {
        try {
          if (typeof this.codeEditor.toTextArea === 'function') {
            this.codeEditor.toTextArea()
          } else if (typeof this.codeEditor.getWrapperElement === 'function') {
            const wrapper = this.codeEditor.getWrapperElement()
            if (wrapper && wrapper.parentNode) {
              wrapper.parentNode.removeChild(wrapper)
            }
          }
        } catch (e) {
        }
        this.codeEditor = null
      }

      try {
        // Clear container
        this.$refs.codeEditorContainer.innerHTML = ''

        // Create new editor instance
        this.codeEditor = CodeMirror(this.$refs.codeEditorContainer, {
          value: (() => {
            const existing = this.indicator ? (this.indicator.code || '') : ''
            return existing && String(existing).trim() ? existing : this.getDefaultIndicatorCode()
          })(),
          mode: 'python',
          theme: 'eclipse',
          lineNumbers: true,
          lineWrapping: true,
          indentUnit: 4,
          indentWithTabs: false,
          smartIndent: true,
          matchBrackets: true,
          autoCloseBrackets: true,
          styleActiveLine: true,
          foldGutter: false,
          gutters: ['CodeMirror-linenumbers'],
          tabSize: 4,
          viewportMargin: Infinity
        })

        // Listen for code changes and sync to form
        this.codeEditor.on('change', (editor) => {
          // no-op: form fields removed; code is read from editor on save
          editor.getValue()
        })

        // Refresh editor to ensure correct display
        this.$nextTick(() => {
          if (this.codeEditor) {
            this.codeEditor.refresh()
          }
        })
      } catch (error) {
      }
    },
    handleSave () {
      // First get code from the editor
      const code = this.codeEditor ? this.codeEditor.getValue() : ''
      const finalCode = code || ''
      if (!finalCode.trim()) {
        this.$message.warning(this.$t('dashboard.indicator.editor.codeRequired'))
        return
      }

      this.saving = true
      // Emit save event: name/description fields have been removed; backend parses them from code
      this.$emit('save', {
        id: this.indicator ? this.indicator.id : 0,
        code: finalCode,
        userid: this.userId
      })
    },
    handleCancel () {
      if (this.codeEditor) {
        this.codeEditor.setValue('')
      }
      this.$emit('cancel')
    },
    handleAfterClose () {
      // After Modal fully closes, refresh editor to ensure correct display on next open
      if (this.codeEditor) {
        this.$nextTick(() => {
          if (this.codeEditor) {
            this.codeEditor.refresh()
          }
        })
      }

      // Clear AI generation input field
      this.aiPrompt = ''
    },
    async handleAIGenerate () {
      if (!this.aiPrompt || !this.aiPrompt.trim()) {
        this.$message.warning(this.$t('dashboard.indicator.editor.aiPromptRequired'))
        return
      }

      this.aiGenerating = true

      // Get existing code from editor as context
      let existingCode = ''
      if (this.codeEditor) {
        existingCode = this.codeEditor.getValue() || ''
      }

      // Provide immediate visual feedback so the user does not feel nothing is happening
      if (this.codeEditor) {
        this.codeEditor.setValue('# AI generating...\n')
        this.codeEditor.refresh()
      }

      let generatedCode = ''

      try {
        // Local python API (SSE)
        const url = '/api/indicator/aiGenerate'

        // Get token
        const token = storage.get(ACCESS_TOKEN)

        // Build request body, including existing code as context
        const requestBody = {
          prompt: this.aiPrompt.trim()
        }

        // If there is existing code, pass it as context
        if (existingCode.trim()) {
          requestBody.existingCode = existingCode.trim()
        }

        // Use fetch to handle streaming response
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Access-Token': token || '',
            'Token': token || ''
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP error! status: ${response.status}`)
        }

        // Process streaming response
        if (!response.body || typeof response.body.getReader !== 'function') {
          throw new Error('AI service did not return a readable stream (response.body is missing)')
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          // Decode data chunk
          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE messages
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || '' // Keep the last incomplete message

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) {
              continue
            }

            const data = line.substring(6) // Remove "data: " prefix

            if (data === '[DONE]') {
              // Streaming complete
              break
            }

            try {
              const json = JSON.parse(data)

              if (json.error) {
                throw new Error(json.error)
              }

              if (json.content) {
                // Append content to code
                generatedCode += json.content

                // Clean markdown code block markers
                const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)

                // Update editor in real-time
                if (this.codeEditor) {
                  this.codeEditor.setValue(cleanedCode)
                  // Scroll to end
                  const lineCount = this.codeEditor.lineCount()
                  this.codeEditor.setCursor({ line: lineCount - 1, ch: 0 })
                  this.codeEditor.refresh()
                }
              }
            } catch (parseError) {
            }
          }
        }

        // Final update - clean markdown code block markers
        if (this.codeEditor && generatedCode) {
          const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
          this.codeEditor.setValue(cleanedCode)
          this.codeEditor.refresh()
          this.$message.success(this.$t('dashboard.indicator.editor.aiGenerateSuccess'))
        } else if (!generatedCode) {
          this.$message.warning('No code was generated, please try a more detailed prompt')
        }
      } catch (error) {
        this.$message.error(error.message || this.$t('dashboard.indicator.editor.aiGenerateError'))

        // If there is partially generated code, keep it (clean markdown markers)
        if (generatedCode && this.codeEditor) {
          const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
          this.codeEditor.setValue(cleanedCode)
        }
      } finally {
        this.aiGenerating = false
      }
    }
    // Community publishing / pricing / preview upload features have been removed (not needed for open-source local version)
  }
}
</script>

<style lang="less" scoped>
:deep(.ant-modal) {
      top: 20px !important;
    }
.visual-editor-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  height: 500px; /* Increased height */
  overflow: hidden;
}

.visual-modules-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-visual-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.visual-module-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  .module-header {
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9f9f9;

    .module-title {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .remove-icon {
      cursor: pointer;
      color: #999;
      &:hover { color: #ff4d4f; }
    }
  }

  .module-body {
    padding: 12px;
  }

  .style-config {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    .label {
      margin-right: 8px;
      color: #666;
    }
  }
}

.add-module-bar {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

/* Mobile adaptation */
@media (max-width: 768px) {
  .visual-editor-container {
      height: auto;
      min-height: 400px;
  }
}

.ant-form-item {
  margin-bottom: 16px;
}

.editor-content {
  padding: 24px;
  background: #fff;
  min-height: 500px;
  max-height: 82vh;
  overflow-y: auto;
}

.editor-layout {
  min-height: 450px;
}

.code-editor-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-section {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  margin-bottom: 16px;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f0f0f0;

    .section-title {
      font-weight: 600;
      font-size: 14px;
      color: #262626;
      display: flex;
      align-items: center;
      gap: 8px;

      &::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 14px;
        background: #1890ff;
        border-radius: 2px;
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      :deep(.ant-btn-link) {
        color: #1890ff;
        padding: 0 8px;

        &:hover {
          color: #40a9ff;
        }
      }
    }
  }
}

.code-editor-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  height: 62vh;
  min-height: 520px;
  max-height: none;
  display: flex;
  flex-direction: column;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    border-color: #40a9ff;
  }

  &:focus-within {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2), inset 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  :deep(.CodeMirror) {
    flex: 1;
    height: 100%;
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    background: #fafafa;
  }

  :deep(.CodeMirror-scroll) {
    flex: 1;
    min-height: 100%;
    max-height: none;
    overflow-y: auto;
    overflow-x: auto;
  }

  :deep(.CodeMirror-sizer) {
    min-height: 100% !important;
    padding-left: 12px !important;
  }

  :deep(.CodeMirror-gutters) {
    border-right: 1px solid #e8e8e8;
    background: linear-gradient(to right, #fafafa 0%, #f5f5f5 100%);
    width: 45px;
    padding-right: 4px;
  }

  :deep(.CodeMirror-linenumber) {
    padding: 0 8px 0 4px;
    min-width: 30px;
    text-align: right;
    color: #999;
    font-size: 12px;
  }

  :deep(.CodeMirror-lines) {
    padding: 12px 8px;
    background: #fff;
  }

  :deep(.CodeMirror-line) {
    padding-left: 0;
  }

  :deep(.CodeMirror-cursor) {
    border-left: 2px solid #1890ff;
  }

  :deep(.CodeMirror-selected) {
    background: #e6f7ff;
  }
}

.code-mode-split {
  width: 100%;
}

.ai-pane {
  display: flex;
  flex-direction: column;
}

.ai-panel {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
  padding: 12px;
  height: 62vh;
  min-height: 520px;
  display: flex;
  flex-direction: column;
}

.ai-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #262626;
}

.ai-panel-hint {
  margin-top: 10px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.5;
}

.ai-panel :deep(textarea.ant-input) {
  flex: 1;
  resize: none;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  :deep(.ant-btn) {
    height: 36px;
    padding: 0 20px;
    font-weight: 500;
    border-radius: 4px;
    transition: all 0.3s ease;

    &:not(.ant-btn-primary) {
      &:hover {
        border-color: #40a9ff;
        color: #40a9ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
      }
    }

    &.ant-btn-primary {
      box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);

      &:hover {
        box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
        transform: translateY(-1px);
      }
    }
  }
}

/* Mobile adaptation */
@media (max-width: 768px) {
  .indicator-editor-modal {
    :deep(.ant-modal) {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      top: 0 !important;
      padding-bottom: 0 !important;
      max-height: 100vh !important;
    }

    :deep(.ant-modal-content) {
      height: 100vh !important;
      max-height: 100vh !important;
      display: flex;
      flex-direction: column;
      border-radius: 0 !important;
    }

    :deep(.ant-modal-header) {
      flex-shrink: 0;
      padding: 16px;
      border-bottom: 1px solid #e8e8e8;
    }

    :deep(.ant-modal-body) {
      flex: 1;
      overflow-y: auto;
      padding: 0 !important;
      min-height: 0;
    }

    :deep(.ant-modal-footer) {
      flex-shrink: 0;
      padding: 12px 16px;
      border-top: 1px solid #e8e8e8;
    }
  }

  .editor-content {
    padding: 16px !important;
    min-height: auto !important;
    max-height: none !important;
    overflow-y: visible !important;
  }

  .editor-layout {
    min-height: auto !important;
  }

  /* Change side-by-side layout to stacked layout */
  .code-editor-column {
    width: 100% !important;
    margin-bottom: 16px;
  }

  /* Code editor area */
  .code-section {
    margin-bottom: 16px;

    .section-header {
      padding-bottom: 8px;
      margin-bottom: 8px;

      .section-title {
        font-size: 13px;
      }
    }
  }

  .code-editor-container {
    height: 250px !important;
    min-height: 250px !important;
    max-height: 250px !important;

    :deep(.CodeMirror-scroll) {
      min-height: 250px !important;
      max-height: 250px !important;
    }

    :deep(.CodeMirror-sizer) {
      min-height: 250px !important;
    }
  }

  /* AI generation area */
  .ai-panel {
    height: auto !important;
    min-height: auto !important;
  }

  /* Footer buttons */
  .editor-footer {
    flex-direction: column-reverse;
    gap: 8px;
    padding: 0;

    :deep(.ant-btn) {
      width: 100%;
      height: 40px;
      margin: 0;
    }
  }
}
</style>
