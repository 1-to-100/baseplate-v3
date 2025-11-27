export interface AppData {
  accessDeniedMessage: string;
  authorization: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    confirmEmailModal: string;
    profileUpdateAlert: string;
    setNewPasswordModal: string;
    resetPassword: string;
    sendRecoveryLink: string;
    recoveryLinkSent: string;
  };
  pages: {
    userManagement: string;
    documentation: string;
    roleSettings: string;
    customerManagement: string;
    systemUsers: string;
    notificationManagement: string;
  };
  userManagementTable: {
    userName: string;
    email: string;
    customer: string;
    role: string;
  };
  customerManagementTable: {
    customer: string;
    manager: string;
    users: string;
    subscription: string;
  };
  userStatuses: {
    active: string;
    inactive: string;
  };
  userMenuButtons: {
    profile: string;
    settings: string;
    signOut: string;
  };
  emailSubject: {
    completeRegistration: string;
    invitation: string;
  };
  messages: {
    emptyTable: string;
  };
  registrationErrors: {
    firstNameRequired: string;
    lastNameRequired: string;
    emailRequired: string;
    passwordRequired: string;
    termsAndConditionsError: string;
    firstAndLastNameLength: string;
    existsMail: string;
    invalidPassword: string;
    invalidMail: string;
  };
  addRolePageData: {
    addRoleModal: string;
    peopleCount: string;
    addRole: {
      roleName: string;
      about: string;
      permissionSwitchers: string;
      userManagementToggle: string;
      documentsToggle: string;
      createRoleButton: string;
      cancelCreateRoleButton: string;
    };
    userManagementPermission: {
      view: string;
      create: string;
      invite: string;
      edit: string;
    };
    documentsPermission: {
      viewCategories: string;
      createCategories: string;
      editCategories: string;
      deleteCategories: string;
      viewArticles: string;
      createArticles: string;
      editArticles: string;
      deleteArticles: string;
    };
  };
  actions: {
    openDetail: string;
    edit: string;
    send: string;
    delete: string;
  };
  userManagementPageData: {
    editUserModal: string;
    impersonateUserButton: string;
    saveButton: string;
    userUpdatedAlert: string;
    usersCreatedAlert: string;
    userInvitedAlert: string;
    usersInvitedAlert: string;
    addUser: string;
    addUsers: string;
    invite: string;
    editUserData: {
      firstName: string;
      lastName: string;
      email: string;
      customer: string;
      role: string;
    };
  };
  documentationPageData: {
    addCategoryButton: string;
    addArticleButton: string;
    categoryCreatedAlert: string;
    articles: string;
    categoryModal: {
      modalName: string;
      categoryNameInput: string;
      subcategoryDropdown: string;
      aboutInput: string;
      addIconDropdown: string;
      addNewCategory: string;
      newSubcategoryInput: string;
      addIcons: {
        star: string;
        rocketLaunch: string;
        api: string;
        code: string;
        settings: string;
        fix: string;
        badge: string;
      };
    };
    deleteCategoryModal: {
      modalName: string;
      confirmDeleteButton: string;
      categoryDeletedAlert: string;
    };
  };
  articlesPageData: {
    noArticlesMessage: string;
    addArticlesMessage: string;
    addArticleButton: string;
    saveAsDraft: string;
    publish: string;
    articleCreatedAlert: string;
    articleUpdatedAlert: string;
    loadingText: string;
    deleteArticleModal: {
      modalName: string;
      articleDeleteButton: string;
      articleDeletedAlert: string;
    };
  };
  addArticleModal: {
    articleTitlePlaceholder: string;
    categoryDropdown: string;
    subcategoryDropdown: string;
    pasteLinkPlaceholder: string;
  };
  articleTableData: {
    articleName: string;
    lastEdit: string;
    status: string;
    author: string;
    performance: string;
  };
  statuses: {
    draft: string;
    published: string;
  };
  addRoleErrors: {
    roleNameRequired: string;
    descriptionRequired: string;
    permissionRequired: string;
    selectedPermissionRequired: string;
    roleNameLength: string;
  };
  notificationManagementPageData: {
    filterButton: string;
    notificationHistory: string;
    addNotification: string;
    editNotification: string;
    notificationDetails: string;
    notificationTypes: {
      inApp: string;
      email: string;
    };
    notificationChannels: {
      warning: string;
      alert: string;
      info: string;
      article: string;
    };
    addNotificationModal: {
      typeDropdown: string;
      channelDropdown: string;
      enterTitleField: string;
      saveButton: string;
    };
    notificationDeleteButton: string;
    notificationAddedAlert: string;
    notificationUpdatedAlert: string;
    notificationDeletedAlert: string;
    notificationSentAlert: string;
    notificationTable: {
      title: string;
      message: string;
      type: string;
      channel: string;
    };
    sendNotificationsModal: {
      modalTitle: string;
      sendToDropdown: string;
      selectRecipientsDropdown: string;
      sendToOptions: {
        users: string;
        customers: string;
      };
    };
    validationErrors: {
      isRequired: string;
    };
    notificationHistoryTable: {
      date: string;
      user: string;
      customer: string;
      type: string;
      channel: string;
      message: string;
    };
    filterButtons: {
      filter: string;
      apply: string;
    };
  };
  systemUsersPageData: {
    pageTitle: string;
    addSystemUser: string;
    systemUsersTable: {
      userName: string;
      email: string;
      customer: string;
      systemRole: string;
    };
    addSystemUserModal: {
      firstName: string;
      lastName: string;
      email: string;
      customer: string;
      systemRole: string;
      saveButton: string;
    };
    systemRoles: {
      customerSuccess: string;
      systemAdministrator: string;
    };
    userCreatedAlert: string;
    userUpdatedAlert: string;
  };
  customerManagementPageData: {
    pageTitle: string;
    addCustomer: string;
    addCustomerModal: {
      customerName: string;
      customerAdministrator: string;
      email: string;
      subscription: string;
      customerSuccessManager: string;
    };
    subscriptions: {
      basic: string;
    };
    customerCreatedAlert: string;
  };
}
