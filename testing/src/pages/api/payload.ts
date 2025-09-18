export const getSupabaseLoginPayload = (userData: { user: string; password: string }) => ({
  params: {
    grant_type: 'password',
  },
  data: {
    email: userData.user,
    gotrue_meta_security: {},
    password: userData.password,
  },
});

export const getCreateRolePayload = (description: string, name: string) => ({
  data: {
    description: description,
    name: name,
  },
});

export const getPermissionsPayload = (permissions: string[]) => ({
  data: {
    permissionNames: permissions,
  },
});

export const getUsersPayload = (user: string) => ({
  params: {
    search: user,
  },
});

export const getCategoriesPayload = (icon: string, name: string, subcategory: string) => ({
  data: {
    about: '',
    icon: icon,
    name: name,
    subcategory: subcategory,
  },
});

export const getArticlePayload = (
  articleCategoryId: number,
  content: string,
  status: string,
  subcategory: string,
  title: string,
) => ({
  data: {
    articleCategoryId: articleCategoryId,
    content: `<p>${content}</p>`,
    status: status,
    subcategory: subcategory,
    title: title,
    videoUrl: '',
  },
});
