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

export const getUsersPayload = (user: string, customerId?: string, roleIds?: string[]) => {
  const selectFields =
    'user_id,auth_user_id,email,full_name,phone_number,avatar_url,customer_id,role_id,manager_id,status,created_at,updated_at,deleted_at,customer:customers!users_customer_id_fkey(customer_id,name,email_domain),role:roles(role_id,name,display_name)';

  return {
    params: {
      select: selectFields,
      deleted_at: 'is.null',
      email: `ilike.%${user}%`,
      order: 'created_at.asc',
      offset: '0',
      limit: '10',
      ...(customerId && { customer_id: `in.(${customerId})` }),
      ...(roleIds && roleIds.length > 0 && { role_id: `in.(${roleIds.join(',')})` }),
    },
  };
};

export const getCategoriesPayload = (icon: string, name: string, subcategory: string) => ({
  data: {
    about: '',
    icon: icon,
    name: name,
    subcategory: subcategory,
  },
});

export const getDeleteUserPayload = () => ({
  data: {
    deleted_at: new Date().toISOString(),
    status: 'inactive',
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
