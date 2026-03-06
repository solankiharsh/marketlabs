import { isIE } from '@/utils/util'

// Local dev already has a full backend API; disable mock to avoid intercepting requests
// To enable mock, change the false below to true
const ENABLE_MOCK = false

// Load mock services when env is not prod or preview is true
if (ENABLE_MOCK && (process.env.NODE_ENV !== 'production' || process.env.VUE_APP_PREVIEW === 'true')) {
  if (isIE()) {
  }
  // Use synchronous dependency loading
  // Prevent GetInfo in vuex from running before mock, which would cause mock responses to fail
  const Mock = require('mockjs2')
  require('./services/auth')
  require('./services/user')
  require('./services/manage')
  require('./services/other')
  require('./services/tagCloud')
  require('./services/article')

  Mock.setup({
    timeout: 800 // setter delay time
  })
}
