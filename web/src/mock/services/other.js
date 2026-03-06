import Mock from 'mockjs2'
import { builder } from '../util'

const orgTree = () => {
  return builder([{
    'key': 'key-01',
    'title': 'R&D Center',
    'icon': 'mail',
    'children': [{
      'key': 'key-01-01',
      'title': 'Backend Team',
      'icon': null,
      'group': true,
      children: [{
        'key': 'key-01-01-01',
        'title': 'JAVA',
        'icon': null
      },
      {
        'key': 'key-01-01-02',
        'title': 'PHP',
        'icon': null
      },
      {
        'key': 'key-01-01-03',
        'title': 'Golang',
        'icon': null
      }
      ]
    }, {
      'key': 'key-01-02',
      'title': 'Frontend Team',
      'icon': null,
      'group': true,
      children: [{
        'key': 'key-01-02-01',
        'title': 'React',
        'icon': null
      },
      {
        'key': 'key-01-02-02',
        'title': 'Vue',
        'icon': null
      },
      {
        'key': 'key-01-02-03',
        'title': 'Angular',
        'icon': null
      }
      ]
    }]
  }, {
    'key': 'key-02',
    'title': 'Finance Dept',
    'icon': 'dollar',
    'children': [{
      'key': 'key-02-01',
      'title': 'Accounting',
      'icon': null
    }, {
      'key': 'key-02-02',
      'title': 'Cost Control',
      'icon': null
    }, {
      'key': 'key-02-03',
      'title': 'Internal Control',
      'icon': null,
      'children': [{
        'key': 'key-02-03-01',
        'title': 'Financial Policy Development',
        'icon': null
      },
      {
        'key': 'key-02-03-02',
        'title': 'Accounting',
        'icon': null
      }
      ]
    }]
  }])
}

const role = () => {
  return builder({
    'data': [{
      'id': 'admin',
      'name': 'Administrator',
      'describe': 'Has all permissions',
      'status': 1,
      'creatorId': 'system',
      'createTime': 1497160610259,
      'deleted': 0,
      'permissions': [{
        'roleId': 'admin',
        'permissionId': 'comment',
        'permissionName': 'Comment Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }],
        'actionList': ['delete', 'edit'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'member',
        'permissionName': 'Member Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': ['query', 'get', 'edit', 'delete'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'menu',
        'permissionName': 'Menu Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'import',
          'describe': 'Import',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'import'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'order',
        'permissionName': 'Order Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': ['query', 'add', 'get'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'permission',
        'permissionName': 'Permission Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'get', 'edit', 'delete'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'role',
        'permissionName': 'Role Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'test',
        'permissionName': 'Test Permission',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'user',
        'permissionName': 'User Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"},{"action":"export","defaultCheck":false,"describe":"Export"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'import',
          'describe': 'Import',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        },
        {
          'action': 'export',
          'describe': 'Export',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'get'],
        'dataAccess': null
      }
      ]
    },
    {
      'id': 'svip',
      'name': 'SVIP',
      'describe': 'Super Member',
      'status': 1,
      'creatorId': 'system',
      'createTime': 1532417744846,
      'deleted': 0,
      'permissions': [{
        'roleId': 'admin',
        'permissionId': 'comment',
        'permissionName': 'Comment Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'get', 'delete'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'member',
        'permissionName': 'Member Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'query', 'get'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'menu',
        'permissionName': 'Menu Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'import',
          'describe': 'Import',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'get'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'order',
        'permissionName': 'Order Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'query'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'permission',
        'permissionName': 'Permission Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        }
        ],
        'actionList': ['add', 'get', 'edit'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'role',
        'permissionName': 'Role Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        },
        {
          'action': 'delete',
          'describe': 'Delete',
          'defaultCheck': false
        }
        ],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'test',
        'permissionName': 'Test Permission',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': ['add', 'edit'],
        'dataAccess': null
      },
      {
        'roleId': 'admin',
        'permissionId': 'user',
        'permissionName': 'User Management',
        'actions': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"},{"action":"export","defaultCheck":false,"describe":"Export"}]',
        'actionEntitySet': [{
          'action': 'add',
          'describe': 'Add',
          'defaultCheck': false
        },
        {
          'action': 'import',
          'describe': 'Import',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        },
        {
          'action': 'edit',
          'describe': 'Edit',
          'defaultCheck': false
        }
        ],
        'actionList': ['add'],
        'dataAccess': null
      }
      ]
    },
    {
      'id': 'user',
      'name': 'Regular Member',
      'describe': 'Regular user, can only query',
      'status': 1,
      'creatorId': 'system',
      'createTime': 1497160610259,
      'deleted': 0,
      'permissions': [{
        'roleId': 'user',
        'permissionId': 'comment',
        'permissionName': 'Comment Management',
        'actions': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"}]',
        'actionEntitySet': [{
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        }
        ],
        'actionList': ['query'],
        'dataAccess': null
      },

      {
        'roleId': 'user',
        'permissionId': 'marketing',
        'permissionName': 'Marketing Management',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'user',
        'permissionId': 'member',
        'permissionName': 'Member Management',
        'actions': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"}]',
        'actionEntitySet': [{
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        }
        ],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'user',
        'permissionId': 'menu',
        'permissionName': 'Menu Management',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },

      {
        'roleId': 'user',
        'permissionId': 'order',
        'permissionName': 'Order Management',
        'actions': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"}]',
        'actionEntitySet': [{
          'action': 'query',
          'describe': 'Query',
          'defaultCheck': false
        },
        {
          'action': 'get',
          'describe': 'Detail',
          'defaultCheck': false
        }
        ],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'user',
        'permissionId': 'permission',
        'permissionName': 'Permission Management',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'user',
        'permissionId': 'role',
        'permissionName': 'Role Management',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },

      {
        'roleId': 'user',
        'permissionId': 'test',
        'permissionName': 'Test Permission',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      },
      {
        'roleId': 'user',
        'permissionId': 'user',
        'permissionName': 'User Management',
        'actions': '[]',
        'actionEntitySet': [],
        'actionList': null,
        'dataAccess': null
      }
      ]
    }
    ],
    'pageSize': 10,
    'pageNo': 0,
    'totalPage': 1,
    'totalCount': 5
  })
}

const permissionNoPager = () => {
  return builder([{
    'id': 'marketing',
    'name': 'Marketing Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
    'sptDaTypes': null,
    'optionalFields': null,
    'parents': null,
    'type': null,
    'deleted': 0,
    'actions': [
      'add',
      'query',
      'get',
      'edit',
      'delete'
    ]
  },
  {
    'id': 'member',
    'name': 'Member Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'query',
      'get',
      'edit',
      'delete'
    ]
  },
  {
    'id': 'menu',
    'name': 'Menu Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'import',
      'get',
      'edit'
    ]
  },
  {
    'id': 'order',
    'name': 'Order Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'query',
      'get',
      'edit',
      'delete'
    ]
  },
  {
    'id': 'permission',
    'name': 'Permission Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'get',
      'edit',
      'delete'
    ]
  },
  {
    'id': 'role',
    'name': 'Role Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'get',
      'edit',
      'delete'
    ]
  },
  {
    'id': 'test',
    'name': 'Test Permission',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'get'
    ]
  },
  {
    'id': 'user',
    'name': 'User Management',
    'describe': null,
    'status': 1,
    'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"export","defaultCheck":false,"describe":"Export"}]',
    'sptDaTypes': null,
    'optionalFields': '[]',
    'parents': null,
    'type': 'default',
    'deleted': 0,
    'actions': [
      'add',
      'get'
    ]
  }
  ])
}

const permissions = () => {
  return builder({
    'data': [{
      'id': 'marketing',
      'name': 'Marketing Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
      'sptDaTypes': null,
      'optionalFields': null,
      'parents': null,
      'type': null,
      'deleted': 0,
      'actions': [
        'add',
        'query',
        'get',
        'edit',
        'delete'
      ]
    },
    {
      'id': 'member',
      'name': 'Member Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'query',
        'get',
        'edit',
        'delete'
      ]
    },
    {
      'id': 'menu',
      'name': 'Menu Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"import","defaultCheck":false,"describe":"Import"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'import',
        'get',
        'edit'
      ]
    },
    {
      'id': 'order',
      'name': 'Order Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"query","defaultCheck":false,"describe":"Query"},{"action":"get","defaultCheck":false,"describe":"Detail"},{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'query',
        'get',
        'edit',
        'delete'
      ]
    },
    {
      'id': 'permission',
      'name': 'Permission Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'get',
        'edit',
        'delete'
      ]
    },
    {
      'id': 'role',
      'name': 'Role Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Query"},{"action":"edit","defaultCheck":false,"describe":"Edit"},{"action":"delete","defaultCheck":false,"describe":"Delete"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'get',
        'edit',
        'delete'
      ]
    },
    {
      'id': 'test',
      'name': 'Test Permission',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"add","defaultCheck":false,"describe":"Add"},{"action":"get","defaultCheck":false,"describe":"Detail"}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'get'
      ]
    },
    {
      'id': 'user',
      'name': 'User Management',
      'describe': null,
      'status': 1,
      'actionData': '[{"action":"add","describe":"Add","defaultCheck":false},{"action":"get","describe":"Query","defaultCheck":false}]',
      'sptDaTypes': null,
      'optionalFields': '[]',
      'parents': null,
      'type': 'default',
      'deleted': 0,
      'actions': [
        'add',
        'get'
      ]
    }
    ],
    'pageSize': 10,
    'pageNo': 0,
    'totalPage': 1,
    'totalCount': 5
  })
}

Mock.mock(/\/org\/tree/, 'get', orgTree)
Mock.mock(/\/role/, 'get', role)
Mock.mock(/\/permission\/no-pager/, 'get', permissionNoPager)
Mock.mock(/\/permission/, 'get', permissions)
