import Mock from 'mockjs2'
import { builder } from '../util'

const info = options => {
  const userInfo = {
    id: '4291d7da9005377ec9aec4a71ea837f',
    name: 'Admin User',
    username: 'admin',
    password: '',
    avatar: '/avatar2.jpg',
    status: 1,
    telephone: '',
    lastLoginIp: '27.154.74.117',
    lastLoginTime: 1534837621348,
    creatorId: 'admin',
    createTime: 1497160610259,
    merchantCode: 'TLif2btpzg079h15bk',
    deleted: 0,
    roleId: 'admin',
    role: {}
  }
  // role
  const roleObj = {
    id: 'admin',
    name: 'Admin',
    describe: 'Full access',
    status: 1,
    creatorId: 'system',
    createTime: 1497160610259,
    deleted: 0,
    permissions: [
      {
        roleId: 'admin',
        permissionId: 'dashboard',
        permissionName: 'Dashboard',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'exception',
        permissionName: 'Exception pages',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'result',
        permissionName: 'Result',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'profile',
        permissionName: 'Detail page',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'table',
        permissionName: 'Table',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'import',
            describe: 'Import',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'form',
        permissionName: 'Form',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'order',
        permissionName: 'Orders',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'permission',
        permissionName: 'Permissions',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'role',
        permissionName: 'Roles',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'table',
        permissionName: 'Tables',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'query',
            describe: 'Query',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      },
      {
        roleId: 'admin',
        permissionId: 'user',
        permissionName: 'Users',
        actions:
          '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"},{"action":"export","defaultCheck":false,"describe":"Export"}]',
        actionEntitySet: [
          {
            action: 'add',
            describe: 'Add',
            defaultCheck: false
          },
          {
            action: 'import',
            describe: 'Import',
            defaultCheck: false
          },
          {
            action: 'get',
            describe: 'View',
            defaultCheck: false
          },
          {
            action: 'update',
            describe: 'Edit',
            defaultCheck: false
          },
          {
            action: 'delete',
            describe: 'Delete',
            defaultCheck: false
          },
          {
            action: 'export',
            describe: 'Export',
            defaultCheck: false
          }
        ],
        actionList: null,
        dataAccess: null
      }
    ]
  }

  roleObj.permissions.push({
    roleId: 'admin',
    permissionId: 'support',
    permissionName: 'Super module',
    actions:
      '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"View"},{"action":"update","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"},{"action":"export","defaultCheck":false,"describe":"Export"}]',
    actionEntitySet: [
      {
        action: 'add',
        describe: 'Add',
        defaultCheck: false
      },
      {
        action: 'import',
        describe: 'Import',
        defaultCheck: false
      },
      {
        action: 'get',
        describe: 'View',
        defaultCheck: false
      },
      {
        action: 'update',
        describe: 'Edit',
        defaultCheck: false
      },
      {
        action: 'delete',
        describe: 'Delete',
        defaultCheck: false
      },
      {
        action: 'export',
        describe: 'Export',
        defaultCheck: false
      }
    ],
    actionList: null,
    dataAccess: null
  })

  userInfo.role = roleObj
  return builder(userInfo)
}

/**
 * Use the logged-in user's token to get menus the user has access to.
 * Return structure must match this shape, or the menu generator in
 * /src/router/generator-routers.js
 * @param {*} options
 * @returns
 */
const userNav = options => {
  const nav = [
    // AI analysis
    {
      name: 'Analysis',
      parentId: 0,
      id: 1,
      meta: {
        title: 'menu.dashboard.analysis',
        icon: 'thunderbolt',
        show: true
      },
      component: 'Analysis',
      path: '/ai-analysis'
    },
    // Indicator analysis
    {
      name: 'Indicator',
      parentId: 0,
      id: 2,
      meta: {
        title: 'menu.dashboard.indicator',
        icon: 'line-chart',
        show: true
      },
      component: 'Indicator',
      path: '/indicator-analysis'
    },
    // Special third-level menu
    {
      name: 'settings',
      parentId: 10028,
      id: 10030,
      meta: {
        title: 'menu.account.settings',
        hideHeader: true,
        hideChildren: true,
        show: true
      },
      redirect: '/account/settings/basic',
      component: 'AccountSettings'
    },
    {
      name: 'BasicSettings',
      path: '/account/settings/basic',
      parentId: 10030,
      id: 10031,
      meta: {
        title: 'account.settings.menuMap.basic',
        show: false
      },
      component: 'BasicSetting'
    },
    {
      name: 'SecuritySettings',
      path: '/account/settings/security',
      parentId: 10030,
      id: 10032,
      meta: {
        title: 'account.settings.menuMap.security',
        show: false
      },
      component: 'SecuritySettings'
    },
    {
      name: 'CustomSettings',
      path: '/account/settings/custom',
      parentId: 10030,
      id: 10033,
      meta: {
        title: 'account.settings.menuMap.custom',
        show: false
      },
      component: 'CustomSettings'
    },
    {
      name: 'BindingSettings',
      path: '/account/settings/binding',
      parentId: 10030,
      id: 10034,
      meta: {
        title: 'account.settings.menuMap.binding',
        show: false
      },
      component: 'BindingSettings'
    },
    {
      name: 'NotificationSettings',
      path: '/account/settings/notification',
      parentId: 10030,
      id: 10034,
      meta: {
        title: 'account.settings.menuMap.notification',
        show: false
      },
      component: 'NotificationSettings'
    }
  ]
  const json = builder(nav)
  return json
}

Mock.mock(/\/api\/user\/info/, 'get', info)
Mock.mock(/\/api\/user\/nav/, 'get', userNav)
