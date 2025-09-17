export const paths = {
  home: '/',
  auth: {
    custom: {
      signIn: '/auth/custom/sign-in',
      signUp: '/auth/custom/sign-up',
      resetPassword: '/auth/custom/reset-password',
    },
    auth0: {
      callback: '/auth/auth0/callback',
      signIn: '/auth/auth0/sign-in',
      signUp: '/auth/auth0/sign-up',
      signOut: '/auth/auth0/sign-out',
      profile: '/auth/auth0/profile',
    },
    cognito: {
      signIn: '/auth/cognito/sign-in',
      signUp: '/auth/cognito/sign-up',
      signUpConfirm: '/auth/cognito/sign-up-confirm',
      newPasswordRequired: '/auth/cognito/new-password-required',
      resetPassword: '/auth/cognito/reset-password',
      updatePassword: '/auth/cognito/update-password',
    },
    firebase: {
      signIn: '/auth/firebase/sign-in',
      signUp: '/auth/firebase/sign-up',
      sso: '/auth/firebase/sso',
      signInComplete: '/auth/firebase/sign-in-complete',
      resetPassword: '/auth/firebase/reset-password',
      recoveryLinkSent: '/auth/firebase/recovery-link-sent',
      updatePassword: '/auth/firebase/update-password',
    },
    supabase: {
      callback: { implicit: '/auth/supabase/callback/implicit', pkce: '/auth/supabase/callback/pkce' },
      signIn: '/auth/supabase/sign-in',
      signUp: '/auth/supabase/sign-up',
      signUpConfirm: '/auth/supabase/sign-up-confirm',
      resetPassword: '/auth/supabase/reset-password',
      recoveryLinkSent: '/auth/supabase/recovery-link-sent',
      updatePassword: '/auth/supabase/update-password',
      setNewPassword: '/auth/supabase/set-new-password',
      syncUser: '/auth/sync/supabase',
    },
  },
  dashboard: {
    overview: '/dashboard/user-management',
    customerManagement: {
      list: '/dashboard/customer-management',
      details: (customerId: string) => `/dashboard/customer-management/${customerId}`,
    },
    documentation: {
      list: '/dashboard/documentation',
      details: (categoryId: string) => `/dashboard/documentation/${categoryId}`,
      article: (categoryId: string, articleId: string) => `/dashboard/documentation/${categoryId}/${articleId}`,
      add: (categoryId: string) => `/dashboard/documentation/${categoryId}/add`,
    },
    roleSettings: {
      list: '/dashboard/role-settings',
      details: (roleId: string) => `/dashboard/role-settings/${roleId}`,
      systemAdmin: '/dashboard/role-settings/role',
      customerSuccess: '/dashboard/role-settings/customer-success',
      customerAdmin: '/dashboard/role-settings/customer-admin',
      manager: '/dashboard/role-settings/manager',
      user: '/dashboard/role-settings/user',
    },
    userManagement: '/dashboard/user-management',
    notificationManagement: {
      list: '/dashboard/notification-management',
      history:  `/dashboard/notification-management/history`,
    },
    systemUsers: {
      list: '/dashboard/system-users',
      details: (userId: string) => `/dashboard/system-users/${userId}`,
    },
    tasks: '/dashboard/tasks',
    blank: '/dashboard/blank',
    customers: {
      list: '/dashboard/customers',
      create: '/dashboard/customers/create',
      details: (customerId: string) => `/dashboard/customers/${customerId}`,
    },
    invoices: {
      list: '/dashboard/invoices',
      create: '/dashboard/invoices/create',
      details: (invoiceId: string) => `/dashboard/invoices/${invoiceId}`,
    },
    orders: {
      list: '/dashboard/orders',
      create: '/dashboard/orders/create',
      details: (orderId: string) => `/dashboard/orders/${orderId}`,
    },
    products: {
      list: '/dashboard/products',
      create: '/dashboard/products/create',
      details: (productId: string) => `/dashboard/products/${productId}`,
    },
    team: {
      members: {
        list: '/dashboard/team/members',
        invite: '/dashboard/team/members/invite',
        details: (memberId: string) => `/dashboard/team/members/${memberId}`,
      },
      permissions: '/dashboard/team/permissions',
    },
    profile: {
      profile: '/dashboard/profile',
      billing: '/dashboard/settings/billing',
      activity: '/dashboard/profile/activity',
    },
    settings: {
      settings: '/dashboard/settings',
    },
    test: {
        list: '/dashboard/test',
    }
  },
  docs: 'https://docs.lotru.devias.io',
  purchase: 'https://mui.com/store/items/lotru',
} as const;
