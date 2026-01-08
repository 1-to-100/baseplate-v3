import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { RoleSettingsPage } from '@pages/roleSettings.page';
import { DocumentationPage } from '@pages/documentation.page';
import { randomLetters } from '@utils/fakers';
// import { ApiMethods } from '@apiPage/methods';

// TODO - functionality has been changed
test.describe.skip('Create new role', () => {
  // let apiMethods: ApiMethods;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let roleSettingsPage: RoleSettingsPage;
  let documentationPage: DocumentationPage;

  const admin = ConfigData.users.admin;
  // const userWithAllPermissions = ConfigData.users.userWithPermissions;
  const user = ConfigData.users.userForRoles;
  const addRolePage = appData.addRolePageData;
  const addRoleModal = appData.addRolePageData.addRole;
  const userManagementTable = appData.userManagementTable;
  const userManagementData = appData.userManagementPageData;
  const editUserData = appData.userManagementPageData.editUserData;
  // const addCategoryModal = appData.documentationPageData.categoryModal;
  const addRoleErrors = appData.addRoleErrors;
  // const categoryName = 'Test Category ' + Date.now();
  // const articleTitle = 'Test Article ' + Date.now();
  // const articleText = generateArticleText();
  // const subCategory = 'Subcategory for automation';

  test.beforeEach(async ({ page }) => {
    await test.step('Login to app as admin', async () => {
      // apiMethods = new ApiMethods(request);
      loginPage = new LoginPage(page);
      commonPage = new CommonPage(page);
      navPagePage = new NavPagePage(page);
      roleSettingsPage = new RoleSettingsPage(page);
      documentationPage = new DocumentationPage(page);

      await loginPage.login(admin);
    });
  });

  test('Create role "Viewer" as system admin, assign to user, and view permissions', async () => {
    const viewerRoleName = 'Viewer Role ' + Date.now();

    await test.step('Open "Role Settings" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Open "Add Role" modal', async () => {
      await roleSettingsPage.clickAddRoleButton();
      await expect(commonPage.modalName).toHaveText(addRolePage.addRoleModal);
    });

    await test.step('Fill role details', async () => {
      await commonPage.fillFieldWithPlaceholder(addRoleModal.roleName, viewerRoleName);
      await commonPage.fillFieldWithPlaceholder(addRoleModal.about, 'Test role description');
    });

    await test.step('Enable "User Management" and "Documents" permissions', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await roleSettingsPage.toggleSwitcher(addRoleModal.documentsToggle);
    });

    await test.step('Select viewer permissions', async () => {
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles);
    });

    await test.step('Check selected permissions', async () => {
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles),
      ).toBeVisible();
    });

    await test.step('Create role', async () => {
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton);
    });

    await test.step('Verify role is created and visible in the list', async () => {
      await navPagePage.searchValue(viewerRoleName);
      await commonPage.waitForLoader();
      await expect(roleSettingsPage.roleDataCards).toHaveCount(1);
      await expect(roleSettingsPage.roleNameInCard).toHaveText(viewerRoleName);
      await expect(roleSettingsPage.countOfPeopleAssignedToRole).toHaveText(0 + addRolePage.peopleCount);
    });

    await test.step('Open "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Edit user" modal', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(userManagementData.editUserModal);
    });

    await test.step('Select new role for user', async () => {
      await expect(commonPage.inputWithPlaceholder(editUserData.firstName)).toHaveValue(/.+/);
      await commonPage.selectValueInDropdown(editUserData.role, viewerRoleName);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: viewerRoleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Select customer', async () => {
      const customer = user.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    // await test.step('Create documentation if empty', async () => {
    //   const categoryCount = await documentationPage.categoryCards.count();
    //   if (categoryCount === 0) {
    //     const apiKey = await apiMethods.getAccessToken(userWithAllPermissions);
    //     const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
    //     const categoryDataJson = await categoryData.json();
    //     await expect(
    //       await apiMethods.createArticle(
    //         apiKey,
    //         categoryDataJson.id,
    //         articleText,
    //         appData.statuses.published,
    //         subCategory,
    //         articleTitle,
    //       ),
    //     ).toBe(201);
    //   }
    // });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as user', async () => {
      await loginPage.login(user);
    });

    await test.step('Check "User Management" page', async () => {
      const customer = user.user.split('@').pop()!;
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const result = await commonPage.checkColumnInformation(userManagementTable.customer, customer);
      await expect(result.length).toBe(0);
    });

    await test.step('Check that edit user button is disabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
    });

    await test.step('Check that delete / deactivate user buttons are disabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeDisabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeDisabled();
    });

    await test.step('Check that create user button is disabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeDisabled();
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check "Documentation" page', async () => {
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const count = await documentationPage.categoryCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeDisabled();
    });

    await test.step('Check that add article button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeDisabled();
    });

    await test.step('Open documentation details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check that delete article button is disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that edit article button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });
  });

  test('Create role "Creator" as system admin, assign to user, and check create permissions', async () => {
    const creatorRoleName = 'Creator Role ' + Date.now();

    await test.step('Open "Role Settings" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Open "Add Role" modal', async () => {
      await roleSettingsPage.clickAddRoleButton();
      await expect(commonPage.modalName).toHaveText(addRolePage.addRoleModal);
    });

    await test.step('Fill role details', async () => {
      await commonPage.fillFieldWithPlaceholder(addRoleModal.roleName, creatorRoleName);
      await commonPage.fillFieldWithPlaceholder(addRoleModal.about, 'Test role with create permissions');
    });

    await test.step('Enable "User Management" and "Documents" permissions', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await roleSettingsPage.toggleSwitcher(addRoleModal.documentsToggle);
    });

    await test.step('Select create permissions', async () => {
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles);
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.create);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.createCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.createArticles);
    });

    await test.step('Check selected permissions', async () => {
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.create),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.createCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.createArticles),
      ).toBeVisible();
    });

    await test.step('Create role', async () => {
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton);
    });

    await test.step('Verify role is created and visible in the list', async () => {
      await navPagePage.searchValue(creatorRoleName);
      await commonPage.waitForLoader();
      await expect(roleSettingsPage.roleDataCards).toHaveCount(1);
      await expect(roleSettingsPage.roleNameInCard).toHaveText(creatorRoleName);
      await expect(roleSettingsPage.countOfPeopleAssignedToRole).toHaveText(0 + addRolePage.peopleCount);
    });

    await test.step('Open "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Edit user" modal', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(userManagementData.editUserModal);
    });

    await test.step('Select new role for user', async () => {
      await expect(commonPage.inputWithPlaceholder(editUserData.firstName)).toHaveValue(/.+/);
      await commonPage.selectValueInDropdown(editUserData.role, creatorRoleName);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: creatorRoleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Select customer', async () => {
      const customer = user.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    // await test.step('Create documentation if empty', async () => {
    //   const categoryCount = await documentationPage.categoryCards.count();
    //   if (categoryCount === 0) {
    //     const apiKey = await apiMethods.getAccessToken(userWithAllPermissions);
    //     const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
    //     const categoryDataJson = await categoryData.json();
    //     await expect(
    //       await apiMethods.createArticle(
    //         apiKey,
    //         categoryDataJson.id,
    //         articleText,
    //         appData.statuses.published,
    //         subCategory,
    //         articleTitle,
    //       ),
    //     ).toBe(201);
    //   }
    // });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as user', async () => {
      await loginPage.login(user);
    });

    await test.step('Check "User Management" page', async () => {
      const customer = user.user.split('@').pop()!;
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const result = await commonPage.checkColumnInformation(userManagementTable.customer, customer);
      await expect(result.length).toBe(0);
    });

    await test.step('Check that edit user button is disabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
    });

    await test.step('Check that delete / deactivate user buttons are disabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeDisabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeDisabled();
    });

    await test.step('Check that create user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check "Documentation" page', async () => {
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const count = await documentationPage.categoryCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
    });

    await test.step('Open documentation details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check that delete article button is disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that edit article button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });
  });

  test('Create role "Editor" as system admin, assign to user, and check edit permissions', async () => {
    const editorRoleName = 'Editor Role ' + Date.now();

    await test.step('Open "Role Settings" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Open "Add Role" modal', async () => {
      await roleSettingsPage.clickAddRoleButton();
      await expect(commonPage.modalName).toHaveText(addRolePage.addRoleModal);
    });

    await test.step('Fill role details', async () => {
      await commonPage.fillFieldWithPlaceholder(addRoleModal.roleName, editorRoleName);
      await commonPage.fillFieldWithPlaceholder(addRoleModal.about, 'Test role with edit permissions');
    });

    await test.step('Enable "User Management" and "Documents" permissions', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await roleSettingsPage.toggleSwitcher(addRoleModal.documentsToggle);
    });

    await test.step('Select edit permissions', async () => {
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles);
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.edit);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.editCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.editArticles);
    });

    await test.step('Check selected permissions', async () => {
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.edit),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.editCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.editArticles),
      ).toBeVisible();
    });

    await test.step('Create role', async () => {
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton);
    });

    await test.step('Verify role is created and visible in the list', async () => {
      await navPagePage.searchValue(editorRoleName);
      await commonPage.waitForLoader();
      await expect(roleSettingsPage.roleDataCards).toHaveCount(1);
      await expect(roleSettingsPage.roleNameInCard).toHaveText(editorRoleName);
      await expect(roleSettingsPage.countOfPeopleAssignedToRole).toHaveText(0 + addRolePage.peopleCount);
    });

    await test.step('Open "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Edit user" modal', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(userManagementData.editUserModal);
    });

    await test.step('Select new role for user', async () => {
      await expect(commonPage.inputWithPlaceholder(editUserData.firstName)).toHaveValue(/.+/);
      await commonPage.selectValueInDropdown(editUserData.role, editorRoleName);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: editorRoleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Select customer', async () => {
      const customer = user.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    // await test.step('Create documentation if empty', async () => {
    //   const categoryCount = await documentationPage.categoryCards.count();
    //   if (categoryCount === 0) {
    //     const apiKey = await apiMethods.getAccessToken(userWithAllPermissions);
    //     const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
    //     const categoryDataJson = await categoryData.json();
    //     await expect(
    //       await apiMethods.createArticle(
    //         apiKey,
    //         categoryDataJson.id,
    //         articleText,
    //         appData.statuses.published,
    //         subCategory,
    //         articleTitle,
    //       ),
    //     ).toBe(201);
    //   }
    // });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as user', async () => {
      await loginPage.login(user);
    });

    await test.step('Check "User Management" page', async () => {
      const customer = user.user.split('@').pop()!;
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const result = await commonPage.checkColumnInformation(userManagementTable.customer, customer);
      await expect(result.length).toBe(0);
    });

    await test.step('Check that edit user button is enabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete / deactivate user buttons are disabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeDisabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeDisabled();
    });

    await test.step('Check that create user button is disabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeDisabled();
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check "Documentation" page', async () => {
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const count = await documentationPage.categoryCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });

    await test.step('Check that edit category button is enabled', async () => {
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeDisabled();
    });

    await test.step('Check that add article button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeDisabled();
    });

    await test.step('Open documentation details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check that delete article button is disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that edit article button is enabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that add article button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeDisabled();
    });
  });

  test('Create role "Manager" as system admin, assign to user, and check invite/delete permissions', async () => {
    const managerRoleName = 'Manager Role ' + Date.now();

    await test.step('Open "Role Settings" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Open "Add Role" modal', async () => {
      await roleSettingsPage.clickAddRoleButton();
      await expect(commonPage.modalName).toHaveText(addRolePage.addRoleModal);
    });

    await test.step('Fill role details', async () => {
      await commonPage.fillFieldWithPlaceholder(addRoleModal.roleName, managerRoleName);
      await commonPage.fillFieldWithPlaceholder(addRoleModal.about, 'Test role with invite/delete permissions');
    });

    await test.step('Enable "User Management" and "Documents" permissions', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await roleSettingsPage.toggleSwitcher(addRoleModal.documentsToggle);
    });

    await test.step('Select invite/delete permissions', async () => {
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles);
      await roleSettingsPage.selectPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.invite);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.deleteCategories);
      await roleSettingsPage.selectPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.deleteArticles);
    });

    await test.step('Check selected permissions', async () => {
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.view),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.viewArticles),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.userManagementToggle, addRolePage.userManagementPermission.invite),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.deleteCategories),
      ).toBeVisible();
      await expect(
        roleSettingsPage.selectedPermission(addRoleModal.documentsToggle, addRolePage.documentsPermission.deleteArticles),
      ).toBeVisible();
    });

    await test.step('Create role', async () => {
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton);
    });

    await test.step('Verify role is created and visible in the list', async () => {
      await navPagePage.searchValue(managerRoleName);
      await commonPage.waitForLoader();
      await expect(roleSettingsPage.roleDataCards).toHaveCount(1);
      await expect(roleSettingsPage.roleNameInCard).toHaveText(managerRoleName);
      await expect(roleSettingsPage.countOfPeopleAssignedToRole).toHaveText(0 + addRolePage.peopleCount);
    });

    await test.step('Open "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Edit user" modal', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(userManagementData.editUserModal);
    });

    await test.step('Select new role for user', async () => {
      await expect(commonPage.inputWithPlaceholder(editUserData.firstName)).toHaveValue(/.+/);
      await commonPage.selectValueInDropdown(editUserData.role, managerRoleName);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: managerRoleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Select customer', async () => {
      const customer = user.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    // await test.step('Create documentation if empty', async () => {
    //   const categoryCount = await documentationPage.categoryCards.count();
    //   if (categoryCount === 0) {
    //     const apiKey = await apiMethods.getAccessToken(userWithAllPermissions);
    //     const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
    //     const categoryDataJson = await categoryData.json();
    //     await expect(
    //       await apiMethods.createArticle(
    //         apiKey,
    //         categoryDataJson.id,
    //         articleText,
    //         appData.statuses.published,
    //         subCategory,
    //         articleTitle,
    //       ),
    //     ).toBe(201);
    //   }
    // });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as user', async () => {
      await loginPage.login(user);
    });

    await test.step('Check "User Management" page', async () => {
      const customer = user.user.split('@').pop()!;
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const result = await commonPage.checkColumnInformation(userManagementTable.customer, customer);
      await expect(result.length).toBe(0);
    });

    await test.step('Check that edit user button is disabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
    });

    await test.step('Check that delete / deactivate user buttons are disabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeDisabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeDisabled();
    });

    await test.step('Check that create user button is disabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeDisabled();
    });

    await test.step('Check that invite user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check "Documentation" page', async () => {
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
      const count = await documentationPage.categoryCards.count();
      await expect(count).toBeGreaterThanOrEqual(1);
    });

    await test.step('Check that delete category button is enabled', async () => {
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit category button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeDisabled();
    });

    await test.step('Check that add article button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeDisabled();
    });

    await test.step('Open documentation details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check that delete article button is enabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit article button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add article button is disabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeDisabled();
    });
  });

  test('Create role filling invalid data [negative case]', async () => {
    await test.step('Open "Role Settings" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Open "Add Role" modal', async () => {
      await roleSettingsPage.clickAddRoleButton();
      await expect(commonPage.modalName).toHaveText(addRolePage.addRoleModal);
    });

    await test.step('Check errors for required fields in "Add Role" modal', async () => {
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton, true);
      await expect(roleSettingsPage.roleNameErrorsMessage).toHaveText(addRoleErrors.roleNameRequired);
      await expect(await roleSettingsPage.aboutErrorsMessage.count()).toBe(2);
      await expect(roleSettingsPage.aboutErrorsMessage.first()).toHaveText(addRoleErrors.descriptionRequired);
    });

    await test.step('Check that user cannot enter more than 255 characters due to set limits', async () => {
      await commonPage.fillFieldWithPlaceholder(addRoleModal.about, await randomLetters(255));
      await expect(roleSettingsPage.aboutErrorsMessage.first()).toHaveText('255/255 characters');
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton, true);
      await expect(await roleSettingsPage.aboutErrorsMessage.count()).toBe(1);
    });

    await test.step('Check errors for required permissions in "Add Role" modal', async () => {
      await expect(
        roleSettingsPage.permissionErrorsMessage(addRoleModal.userManagementToggle, addRoleErrors.permissionRequired),
      ).toBeVisible();
    });

    await test.step('Enable "User Management" permission and check error', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton, true);
      await expect(
        roleSettingsPage.permissionErrorsMessage(addRoleModal.userManagementToggle, addRoleErrors.selectedPermissionRequired),
      ).toBeVisible();
    });

    await test.step('Enable "Documents" permission and check error', async () => {
      await roleSettingsPage.toggleSwitcher(addRoleModal.userManagementToggle);
      await roleSettingsPage.toggleSwitcher(addRoleModal.documentsToggle);
      await commonPage.clickButtonInModal(addRoleModal.createRoleButton, true);
      await expect(
        roleSettingsPage.permissionErrorsMessage(addRoleModal.documentsToggle, addRoleErrors.selectedPermissionRequired),
      ).toBeVisible();
    });

    await test.step('Click "Cancel" button in "Create Role" modal', async () => {
      await commonPage.clickButtonInModal(addRoleModal.cancelCreateRoleButton, true);
      await expect(commonPage.modalName).not.toBeVisible();
    });
  });
});
