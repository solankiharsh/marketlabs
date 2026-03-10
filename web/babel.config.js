const IS_PROD = ['production', 'prod'].includes(process.env.NODE_ENV)
const IS_PREVIEW = process.env.VUE_APP_PREVIEW === 'true'

const plugins = []
if (IS_PROD && !IS_PREVIEW) {
  // Remove console logs in production
  plugins.push('transform-remove-console')
}

// lazy load ant-design-vue
// if your use import on Demand, Use this code
plugins.push(['import', {
  'libraryName': 'ant-design-vue',
  'libraryDirectory': 'es',
  'style': true // `style: true` loads less files
}])

module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
    [
      '@babel/preset-env',
      {
        'useBuiltIns': 'entry',
        'corejs': 3
      }
    ]
  ],
  plugins
}
