export const APIRoutes = {
  SupabaseLogin: 'auth/v1/token',
  Roles: '/rest/v1/roles',
  Permissions: '/rest/v1/permissions',
  Users: '/rest/v1/users',
  Categories: '/rest/v1/documents/categories',
  Articles: '/rest/v1/documents/articles',
  User: '/rest/v1/users/me',
} as const;
