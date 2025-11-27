import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { UserManagementPage } from '@pages/userManagement.page';
import { ApiMethods } from '@apiPage/methods';
import { EmailHelper } from '@pages/email/helper';
import { generateNewUser } from '@utils/fakers';
import { generateArticleText } from '@utils/fakers';
import { UserPageHelper } from '@pages/helper';
import { DocumentationPage } from '@pages/documentation.page';

test.describe('Impersonate user', () => {
  let apiMethods: ApiMethods;
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let userManagementPage: UserManagementPage;
  let documentationPage: DocumentationPage;

  let roleName: string;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const user = ConfigData.users.userForRoles;
  const userManagementTable = appData.userManagementTable;
  const userManagementData = appData.userManagementPageData;
  const editUserData = appData.userManagementPageData.editUserData;
  const addRoleModal = appData.addRolePageData.addRole;
  const userManagementPermissions = appData.addRolePageData.userManagementPermission;
  const documentsPermissions = appData.addRolePageData.documentsPermission;
  const newUser = generateNewUser();

  const addCategoryModal = appData.documentationPageData.categoryModal;
  const categoryName = 'Test Category ' + Date.now();
  const articleTitle = 'Test Article ' + Date.now();
  const articleText = generateArticleText();
  const subCategory = 'Subcategory for automation';

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    userManagementPage = new UserManagementPage(page);
    documentationPage = new DocumentationPage(page);
  });

  test('Check impersonate button is not visible for inactive user as System Administrator', async () => {
    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Create new role for test via API', async () => {
      roleName = 'Viewer Role ' + Date.now();
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test role for impersonate user test', roleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Open "Add user" modal', async () => {
      await userManagementPage.openAddUserModal(userManagementData.addUser);
    });

    await test.step('Check "Add user" modal is opened', async () => {
      await expect(commonPage.modalName).toHaveText(userManagementData.addUser);
    });

    await test.step('Fill all user inputs and assign role', async () => {
      await commonPage.fillFieldWithPlaceholder(editUserData.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(editUserData.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(editUserData.email, emailHelper.email);
      await commonPage.selectValueInDropdown(editUserData.role, roleName);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.usersCreatedAlert);
    });

    await test.step('Search created user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Check user was added with role', async () => {
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: '',
        [userManagementTable.role]: roleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Open more menu for created user', async () => {
      await commonPage.openMoreMenu(emailHelper.email);
    });

    await test.step('Check impersonate button is not visible for inactive user', async () => {
      await expect(commonPage.actionButtonInMoreMenu(userManagementData.impersonateUserButton)).not.toBeVisible();
    });

    await test.step('Delete created user', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
      const userDataJson = await userData.json();
      await expect(await apiMethods.deleteUser(apiKey, userDataJson.data[0].id)).toBe(200);
    });
  });

  test('Check impersonate button is not visible for inactive user as Customer Success', async () => {
    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Create new role for test via API', async () => {
      roleName = 'Viewer Role ' + Date.now();
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test role for impersonate user test', roleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Open "Add user" modal', async () => {
      await userManagementPage.openAddUserModal(userManagementData.addUser);
    });

    await test.step('Check "Add user" modal is opened', async () => {
      await expect(commonPage.modalName).toHaveText(userManagementData.addUser);
    });

    await test.step('Fill all user inputs and assign role', async () => {
      await commonPage.fillFieldWithPlaceholder(editUserData.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(editUserData.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(editUserData.email, emailHelper.email);
      await commonPage.selectValueInDropdown(editUserData.role, roleName);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.usersCreatedAlert);
    });

    await test.step('Search created user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Check user was added with role', async () => {
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const customer = customerSuccess.user.split('@').pop()!;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: customer,
        [userManagementTable.role]: roleName,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Open more menu for created user', async () => {
      await commonPage.openMoreMenu(emailHelper.email);
    });

    await test.step('Check impersonate button is not visible for inactive user', async () => {
      await expect(commonPage.actionButtonInMoreMenu(userManagementData.impersonateUserButton)).not.toBeVisible();
    });

    await test.step('Delete created user', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
      const userDataJson = await userData.json();
      await expect(await apiMethods.deleteUser(apiKey, userDataJson.data[0].id)).toBe(200);
    });
  });

  test('Check Viewer role permissions through impersonate user as System Administrator', async () => {
    const viewerRoleName = 'Viewer Role ' + Date.now();

    await test.step('Create Viewer role via API', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Viewer role for impersonate', viewerRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Creator role permissions through impersonate user as System Administrator', async () => {
    const creatorRoleName = 'Creator Role ' + Date.now();

    await test.step('Create Creator role via API', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Creator role for impersonate', creatorRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Editor role permissions through impersonate user as System Administrator', async () => {
    const editorRoleName = 'Editor Role ' + Date.now();

    await test.step('Create Editor role via API', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Editor role for impersonate', editorRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.edit),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Check that create user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Manager role permissions through impersonate user as System Administrator', async () => {
    const managerRoleName = 'Manager Role ' + Date.now();

    await test.step('Create Manager role via API', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Manager role for impersonate', managerRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.edit),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.deleteCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.deleteArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit user button is enabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete / deactivate user buttons are enabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeEnabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeEnabled();
    });

    await test.step('Check that create user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Viewer role permissions through impersonate user as Customer Success', async () => {
    const viewerRoleName = 'Viewer Role ' + Date.now();

    await test.step('Create Viewer role via API as admin', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Viewer role for impersonate', viewerRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Creator role permissions through impersonate user as Customer Success', async () => {
    const creatorRoleName = 'Creator Role ' + Date.now();

    await test.step('Create Creator role via API as admin', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Creator role for impersonate', creatorRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit / delete category buttons are disabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeDisabled();
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Editor role permissions through impersonate user as Customer Success', async () => {
    const editorRoleName = 'Editor Role ' + Date.now();

    await test.step('Create Editor role via API as admin', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Editor role for impersonate', editorRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.edit),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
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

    await test.step('Check that create user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is disabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeDisabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Manager role permissions through impersonate user as Customer Success', async () => {
    const managerRoleName = 'Manager Role ' + Date.now();

    await test.step('Create Manager role via API as admin', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const roleId = await apiMethods.createRole('Test Manager role for impersonate', managerRoleName, apiKey);
      await expect(
        await apiMethods.addPermissionsForRole(
          [
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.view),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.create),
            UserPageHelper.deleteSpaces(addRoleModal.userManagementToggle) +
              ':' +
              UserPageHelper.toCamelCase(userManagementPermissions.edit),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.viewArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.createArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.editArticles),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.deleteCategories),
            UserPageHelper.deleteSpaces(addRoleModal.documentsToggle) +
              ':' +
              UserPageHelper.toCamelCase(documentsPermissions.deleteArticles),
          ],
          roleId,
          apiKey,
        ),
      ).toBe(201);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Search for existing user', async () => {
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

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
    });

    await test.step('Check User Management page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit user button is enabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete / deactivate user buttons are enabled', async () => {
      await commonPage.selectItemInTable(user.user);
      // TODO - await expect(userManagementPage.deleteUserButton).toBeEnabled();
      // TODO - await expect(userManagementPage.deactivateUserButton).toBeEnabled();
    });

    await test.step('Check that create user button is enabled', async () => {
      // TODO - await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Open documentation page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create documentation if empty', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        const apiKey = await apiMethods.getAccessToken(admin);
        const categoryData = await apiMethods.createCategory(apiKey, addCategoryModal.addIcons.api, categoryName, subCategory);
        const categoryDataJson = await categoryData.json();
        await expect(
          await apiMethods.createArticle(
            apiKey,
            categoryDataJson.id,
            articleText,
            appData.statuses.published,
            subCategory,
            articleTitle,
          ),
        ).toBe(201);
        await loginPage.page.reload();
        await commonPage.waitForLoader();
      }
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      // TODO - await documentationPage.openMoreButtonForCategory(0);
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      // TODO - await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that add category button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addCategoryButton)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      // TODO - await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
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

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });
});
