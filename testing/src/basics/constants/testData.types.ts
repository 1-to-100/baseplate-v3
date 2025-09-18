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
  };
  pages: {
    userManagement: string;
    documentation: string;
    roleSettings: string;
    customerManagement: string;
    systemUsers: string;
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
}
