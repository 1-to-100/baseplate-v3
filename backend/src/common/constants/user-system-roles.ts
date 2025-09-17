export const UserSystemRoles = {
  SYSTEM_ADMIN: 'system_admin',
  CUSTOMER_SUCCESS: 'customer_success',
} as const;

export type UserSystemRolesType =
  (typeof UserSystemRoles)[keyof typeof UserSystemRoles];

export const UserSystemRolesList = Object.values(
  UserSystemRoles,
) as UserSystemRolesType[];
