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

  let customer: string;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const user = ConfigData.users.userForRoles;
  const userManagementTable = appData.userManagementTable;
  const userManagementData = appData.userManagementPageData;
  const editUserData = appData.userManagementPageData.editUserData;
  const role = appData.userRole;
  const newUser = generateNewUser();

  const addCategoryModal = appData.documentationPageData.categoryModal;
  const documentationData = appData.documentationPageData;
  const articlesData = appData.articlesPageData;
  const addArticleModal = appData.addArticleModal;
  const categoryName = 'Test Category';
  const articleTitle = 'Test Article';
  const articleText = generateArticleText();
  const subCategory = 'Subcategory for automation';
  const categoryDescription = 'Test description for category';

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

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
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
      customer = emailHelper.email.split('@').pop()!;
      await commonPage.selectValueInDropdown(editUserData.customer, customer);
      await commonPage.selectValueInDropdown(editUserData.role, role.user);
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
        [userManagementTable.customer]: customer,
        [userManagementTable.role]: role.user,
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
      const userId = (await userData.json())[0].user_id;
      await expect(await apiMethods.deleteUser(apiKey, userId)).toBe(204);
    });
  });

  test.skip('Check impersonate button is not visible for inactive user as Customer Success', async () => {
    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
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
      customer = emailHelper.email.split('@').pop()!;
      await commonPage.selectValueInDropdown(editUserData.customer, customer);
      await commonPage.selectValueInDropdown(editUserData.role, role.user);
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
        [userManagementTable.role]: role.user,
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
      const userId = (await userData.json())[0].user_id;
      await expect(await apiMethods.deleteUser(apiKey, userId)).toBe(204);
    });
  });

  test('Check Standard User role permissions through impersonate user as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
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
      await commonPage.selectValueInDropdown(editUserData.role, role.user);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: role.user,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
      await commonPage.waitForLoader();
    });

    await test.step('Check documentation page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check and create category if needed', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        await test.step('Create new category', async () => {
          await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
          await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);

          await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
          await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

          await documentationPage.selectSubcategory(subCategory);

          const iconOptions = Object.values(addCategoryModal.addIcons);
          const randomIcon = UserPageHelper.getRandomValue(iconOptions);
          await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

          await commonPage.clickButtonInModal(documentationData.addCategoryButton);
          await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Open category details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check and create article if needed', async () => {
      const articlesCount = await commonPage.tableData.count();
      const noArticlesMessageVisible = await documentationPage.noArticlesMessages
        .first()
        .isVisible()
        .catch(() => false);

      if (articlesCount === 0 || noArticlesMessageVisible) {
        await test.step('Create new article', async () => {
          await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
          await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
          await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
          await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
          await documentationPage.fillArticleText(articleText);

          await documentationPage.clickButtonOnPage(articlesData.publish);
          await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Navigate back to category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
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

    await test.step('Check that delete article button is enabled', async () => {
      await commonPage.openMoreMenu('Test');
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit article button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
    });

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test('Check Manager role permissions through impersonate user as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
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
      await commonPage.selectValueInDropdown(editUserData.role, role.manager);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: role.manager,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
      await commonPage.waitForLoader();
    });

    await test.step('Check User Management page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit user button is enabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete / deactivate user buttons are enabled', async () => {
      await commonPage.selectItemInTable(user.user);
      await expect(userManagementPage.deleteUserButton).toBeEnabled();
      await expect(userManagementPage.deactivateUserButton).toBeEnabled();
    });

    await test.step('Check that create user button is enabled', async () => {
      await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Check documentation page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check and create category if needed', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        await test.step('Create new category', async () => {
          await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
          await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);

          await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
          await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

          await documentationPage.selectSubcategory(subCategory);

          const iconOptions = Object.values(addCategoryModal.addIcons);
          const randomIcon = UserPageHelper.getRandomValue(iconOptions);
          await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

          await commonPage.clickButtonInModal(documentationData.addCategoryButton);
          await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Open category details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check and create article if needed', async () => {
      const articlesCount = await commonPage.tableData.count();
      const noArticlesMessageVisible = await documentationPage.noArticlesMessages
        .first()
        .isVisible()
        .catch(() => false);

      if (articlesCount === 0 || noArticlesMessageVisible) {
        await test.step('Create new article', async () => {
          await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
          await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
          await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
          await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
          await documentationPage.fillArticleText(articleText);

          await documentationPage.clickButtonOnPage(articlesData.publish);
          await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Navigate back to category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
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

    await test.step('Check that delete article button is enabled', async () => {
      await commonPage.openMoreMenu('Test');
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit article button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
    });

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test.skip('Check Standard User role permissions through impersonate user as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
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
      await commonPage.selectValueInDropdown(editUserData.role, role.user);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: role.user,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
      await commonPage.waitForLoader();
    });

    await test.step('Check documentation page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check and create category if needed', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        await test.step('Create new category', async () => {
          await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
          await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);

          await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
          await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

          await documentationPage.selectSubcategory(subCategory);

          const iconOptions = Object.values(addCategoryModal.addIcons);
          const randomIcon = UserPageHelper.getRandomValue(iconOptions);
          await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

          await commonPage.clickButtonInModal(documentationData.addCategoryButton);
          await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Open category details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check and create article if needed', async () => {
      const articlesCount = await commonPage.tableData.count();
      const noArticlesMessageVisible = await documentationPage.noArticlesMessages
        .first()
        .isVisible()
        .catch(() => false);

      if (articlesCount === 0 || noArticlesMessageVisible) {
        await test.step('Create new article', async () => {
          await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
          await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
          await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
          await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
          await documentationPage.fillArticleText(articleText);

          await documentationPage.clickButtonOnPage(articlesData.publish);
          await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Navigate back to category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
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

    await test.step('Check that delete article button is enabled', async () => {
      await commonPage.openMoreMenu('Test');
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit article button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
    });

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });

  test.skip('Check Manager role permissions through impersonate user as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
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
      await commonPage.selectValueInDropdown(editUserData.role, role.manager);
    });

    await test.step('Save changes', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.userUpdatedAlert);
    });

    await test.step('Check new role in user data', async () => {
      const columnsToCheck = {
        [userManagementTable.email]: user.user,
        [userManagementTable.role]: role.manager,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Impersonate user', async () => {
      await commonPage.openMoreMenu(user.user);
      await commonPage.selectAction(userManagementData.impersonateUserButton);
      await commonPage.waitForLoader();
    });

    await test.step('Check User Management page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit user button is enabled', async () => {
      await navPagePage.searchValue(user.user);
      await commonPage.waitForLoader();
      await commonPage.openMoreMenu(user.user);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete / deactivate user buttons are enabled', async () => {
      await commonPage.selectItemInTable(user.user);
      await expect(userManagementPage.deleteUserButton).toBeEnabled();
      await expect(userManagementPage.deactivateUserButton).toBeEnabled();
    });

    await test.step('Check that create user button is enabled', async () => {
      await expect(userManagementPage.addUserButton).toBeEnabled();
    });

    await test.step('Check documentation page access', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check and create category if needed', async () => {
      const categoryCount = await documentationPage.categoryCards.count();
      if (categoryCount === 0) {
        await test.step('Create new category', async () => {
          await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
          await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);

          await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
          await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

          await documentationPage.selectSubcategory(subCategory);

          const iconOptions = Object.values(addCategoryModal.addIcons);
          const randomIcon = UserPageHelper.getRandomValue(iconOptions);
          await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

          await commonPage.clickButtonInModal(documentationData.addCategoryButton);
          await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Open category details', async () => {
      await documentationPage.openDocumentationDetails(0);
      await commonPage.waitForLoader();
    });

    await test.step('Check and create article if needed', async () => {
      const articlesCount = await commonPage.tableData.count();
      const noArticlesMessageVisible = await documentationPage.noArticlesMessages
        .first()
        .isVisible()
        .catch(() => false);

      if (articlesCount === 0 || noArticlesMessageVisible) {
        await test.step('Create new article', async () => {
          await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
          await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
          await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
          await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
          await documentationPage.fillArticleText(articleText);

          await documentationPage.clickButtonOnPage(articlesData.publish);
          await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
          await commonPage.waitForLoader();
        });
      }
    });

    await test.step('Navigate back to category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
    });

    await test.step('Check Documentation page access', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await expect(commonPage.accessDeniedMessage).not.toBeVisible();
    });

    await test.step('Check that edit category button is enabled', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await documentationPage.openMoreButtonForCategory(0);
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that delete category button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
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

    await test.step('Check that delete article button is enabled', async () => {
      await commonPage.openMoreMenu('Test');
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.delete)).toBeEnabled();
    });

    await test.step('Check that edit article button is enabled', async () => {
      await expect(commonPage.actionButtonInMoreMenu(appData.actions.edit)).toBeEnabled();
    });

    await test.step('Check that add article button is enabled', async () => {
      await expect(documentationPage.buttonsOnPage(appData.documentationPageData.addArticleButton)).toBeEnabled();
    });

    await test.step('Exit impersonate mode', async () => {
      await navPagePage.clickExitFromImpersonateMode();
    });
  });
});
