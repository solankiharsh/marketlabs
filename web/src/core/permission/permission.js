export const PERMISSION_ENUM = {
  'add': { key: 'add', label: 'Add' },
  'delete': { key: 'delete', label: 'Delete' },
  'edit': { key: 'edit', label: 'Edit' },
  'query': { key: 'query', label: 'Query' },
  'get': { key: 'get', label: 'Detail' },
  'enable': { key: 'enable', label: 'Enable' },
  'disable': { key: 'disable', label: 'Disable' },
  'import': { key: 'import', label: 'Import' },
  'export': { key: 'export', label: 'Export' }
}

/**
 * <a-button v-if="$auth('form.edit')">Button</a-button>
 * @param Vue
 */
function plugin (Vue) {
  if (plugin.installed) {
    return
  }

  !Vue.prototype.$auth && Object.defineProperties(Vue.prototype, {
    $auth: {
      get () {
        const _this = this
        return (permissions) => {
          const [permission, action] = permissions.split('.')
          const permissionList = _this.$store.getters.roles.permissions
          return permissionList.find((val) => {
            return val.permissionId === permission
          }).actionList.findIndex((val) => {
            return val === action
          }) > -1
        }
      }
    }
  })

  !Vue.prototype.$enum && Object.defineProperties(Vue.prototype, {
    $enum: {
      get () {
        // const _this = this;
        return (val) => {
          let result = PERMISSION_ENUM
          val && val.split('.').forEach(v => {
            result = result && result[v] || null
          })
          return result
        }
      }
    }
  })
}

export default plugin
