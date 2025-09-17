export type SystemModulePermission = {
  name: string;
  label: string;
  order: number;
};

export type SystemModule = {
  name: string;
  label: string;
  enabled?: boolean;
  permissions?: SystemModulePermission[];
};

const USER_MANAGEMENT_MODULE = 'UserManagement';
const CUSTOMER_MANAGEMENT_MODULE = 'CustomerManagement';
const ROLE_MANAGEMENT_MODULE = 'RoleManagement';
const DOCUMENTS_MODULE = 'Documents';

const permissionWithPrefix = (permission: string, module: string): string => {
  return `${module}:${permission}`;
};

export const SYSTEM_MODULES: SystemModule[] = [
  {
    name: USER_MANAGEMENT_MODULE,
    label: 'User Management',
    enabled: true,
    permissions: [
      {
        name: permissionWithPrefix('viewUsers', USER_MANAGEMENT_MODULE),
        label: 'View Users',
        order: 1,
      },
      {
        name: permissionWithPrefix('createUser', USER_MANAGEMENT_MODULE),
        label: 'Create User',
        order: 2,
      },
      {
        name: permissionWithPrefix('inviteUser', USER_MANAGEMENT_MODULE),
        label: 'Invite User',
        order: 3,
      },
      {
        name: permissionWithPrefix('editUser', USER_MANAGEMENT_MODULE),
        label: 'Edit User',
        order: 4,
      },
      {
        name: permissionWithPrefix('deleteUser', USER_MANAGEMENT_MODULE),
        label: 'Delete User',
        order: 5,
      },
    ],
  },
  {
    name: CUSTOMER_MANAGEMENT_MODULE,
    label: 'Customer Management',
    enabled: false,
    permissions: [
      {
        name: permissionWithPrefix(
          'createCustomer',
          CUSTOMER_MANAGEMENT_MODULE,
        ),
        label: 'Create Customer',
        order: 1,
      },
      {
        name: permissionWithPrefix('editCustomer', CUSTOMER_MANAGEMENT_MODULE),
        label: 'Edit Customer',
        order: 2,
      },
      {
        name: permissionWithPrefix('listCustomers', CUSTOMER_MANAGEMENT_MODULE),
        label: 'List Customers',
        order: 3,
      },
      {
        name: permissionWithPrefix(
          'deleteCustomer',
          CUSTOMER_MANAGEMENT_MODULE,
        ),
        label: 'Delete Customer',
        order: 4,
      },
    ],
  },
  {
    name: ROLE_MANAGEMENT_MODULE,
    label: 'Role Management',
    enabled: false,
    permissions: [
      {
        name: permissionWithPrefix('viewRoles', ROLE_MANAGEMENT_MODULE),
        label: 'View Roles',
        order: 1,
      },
      {
        name: permissionWithPrefix('createRoles', ROLE_MANAGEMENT_MODULE),
        label: 'Create Roles',
        order: 2,
      },
      {
        name: permissionWithPrefix('editRoles', ROLE_MANAGEMENT_MODULE),
        label: 'Edit Roles',
        order: 3,
      },
      {
        name: permissionWithPrefix('deleteRoles', ROLE_MANAGEMENT_MODULE),
        label: 'Delete Role',
        order: 4,
      },
    ],
  },
  {
    name: DOCUMENTS_MODULE,
    label: 'Documents',
    enabled: true,
    permissions: [
      {
        name: permissionWithPrefix('viewCategories', DOCUMENTS_MODULE),
        label: 'View Categories',
        order: 1,
      },
      {
        name: permissionWithPrefix('createCategories', DOCUMENTS_MODULE),
        label: 'Create Categories',
        order: 2,
      },
      {
        name: permissionWithPrefix('editCategories', DOCUMENTS_MODULE),
        label: 'Edit Categories',
        order: 3,
      },
      {
        name: permissionWithPrefix('deleteCategories', DOCUMENTS_MODULE),
        label: 'Delete Categories',
        order: 4,
      },
      {
        name: permissionWithPrefix('viewArticles', DOCUMENTS_MODULE),
        label: 'View Articles',
        order: 5,
      },
      {
        name: permissionWithPrefix('createArticles', DOCUMENTS_MODULE),
        label: 'Create Articles',
        order: 6,
      },
      {
        name: permissionWithPrefix('editArticles', DOCUMENTS_MODULE),
        label: 'Edit Articles',
        order: 7,
      },
      {
        name: permissionWithPrefix('deleteArticles', DOCUMENTS_MODULE),
        label: 'Delete Articles',
        order: 8,
      },
    ],
  },
];
