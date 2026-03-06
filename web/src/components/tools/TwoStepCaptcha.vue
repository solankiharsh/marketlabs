<template>
  <!-- Two-Step Verification -->
  <a-modal
    centered
    :visible="localVisible"
    @cancel="handleCancel"
    @update:visible="localVisible = $event"
    :maskClosable="false"
  >
    <div slot="title" :style="{ textAlign: 'center' }">Two-Step Verification</div>
    <template slot="footer">
      <div :style="{ textAlign: 'center' }">
        <a-button key="back" @click="handleCancel">Back</a-button>
        <a-button key="submit" type="primary" :loading="stepLoading" @click="handleStepOk">
          Continue
        </a-button>
      </div>
    </template>

    <a-spin :spinning="stepLoading">
      <a-form layout="vertical" :auto-form-create="(form)=>{this.form = form}">
        <div class="step-form-wrapper">
          <p style="text-align: center" v-if="!stepLoading">Please open Google Authenticator or your two-step verification app on your phone<br />and enter the 6-digit code</p>
          <p style="text-align: center" v-else>Verifying..<br/>Please wait</p>
          <a-form-item
            :style="{ textAlign: 'center' }"
            hasFeedback
            fieldDecoratorId="stepCode"
            :fieldDecoratorOptions="{rules: [{ required: true, message: 'Please enter a 6-digit code!', pattern: /^\d{6}$/, len: 6 }]}"
          >
            <a-input :style="{ textAlign: 'center' }" @keyup.enter.native="handleStepOk" placeholder="000000" />
          </a-form-item>
          <p style="text-align: center">
            <a @click="onForgeStepCode">Lost your phone?</a>
          </p>
        </div>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      stepLoading: false,
      form: null,
      localVisible: false
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (val) {
        this.localVisible = val
      }
    },
    localVisible (val) {
      if (!val) {
        this.$emit('cancel')
      }
    }
  },
  methods: {
    handleStepOk () {
      const vm = this
      this.stepLoading = true
      this.form.validateFields((err, values) => {
        if (!err) {
          setTimeout(() => {
            vm.stepLoading = false
            vm.$emit('success', { values })
          }, 2000)
          return
        }
        this.stepLoading = false
        this.$emit('error', { err })
      })
    },
    handleCancel () {
      this.localVisible = false
      this.$emit('cancel')
    },
    onForgeStepCode () {

    }
  }
}
</script>
<style lang="less" scoped>
  .step-form-wrapper {
    margin: 0 auto;
    width: 80%;
    max-width: 400px;
  }
</style>
