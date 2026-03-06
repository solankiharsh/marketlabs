import Vue from 'vue'
import store from '@/store'

/**
 * Action permission directive
 * Directive usage:
 *  - Use v-action:[method] on components that need action-level permission control, e.g.:
 *    <i-button v-action:add >Add User</a-button>
 *    <a-button v-action:delete>Delete User</a-button>
 *    <a v-action:edit @click="edit(record)">Edit</a>
 *
 *  - When the current user lacks permission, components with this directive will be hidden
 *  - When backend permissions differ from the pro template, only modify the permission filtering here
 *
 *  @see https://github.com/vueComponent/ant-design-vue-pro/pull/53
 */
const action = Vue.directive('action', {
  inserted: function (el, binding, vnode) {
    const actionName = binding.arg
    const roles = store.getters.roles
    const elVal = vnode.context.$route.meta.permission
    const permissionId = Object.prototype.toString.call(elVal) === '[object String]' && [elVal] || elVal
    roles.permissions.forEach(p => {
      if (!permissionId.includes(p.permissionId)) {
        return
      }
      if (p.actionList && !p.actionList.includes(actionName)) {
        el.parentNode && el.parentNode.removeChild(el) || (el.style.display = 'none')
      }
    })
  }
})

export default action
