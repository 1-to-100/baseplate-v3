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

test.describe('Create single user', () => {
  let apiMethods: ApiMethods;
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let userManagementPage: UserManagementPage;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const userWithAllPermissions = ConfigData.users.userWithPermissions;
  const userManagementTable = appData.userManagementTable;
  const userManagementData = appData.userManagementPageData;
  const editUserData = appData.userManagementPageData.editUserData;
  const newUser = generateNewUser();

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    userManagementPage = new UserManagementPage(page);

    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });
  });

  test.afterEach(async () => {
    await test.step('Delete created user', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
      const userDataJson = await userData.json();
      await expect(await apiMethods.deleteUser(apiKey, userDataJson.data[0].id)).toBe(200);
    });
  });

  test('Add single user as System Administrator', async () => {
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

    await test.step('Fill all user inputs', async () => {
      await commonPage.fillFieldWithPlaceholder(editUserData.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(editUserData.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(editUserData.email, emailHelper.email);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.usersCreatedAlert);
    });

    await test.step('Verify user was added', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();

      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: '',
        [userManagementTable.role]: '',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Verify invitation email was sent', async () => {
      const emailVerified = await emailHelper.verifyInvitationEmail(emailHelper.email, emailHelper.token);
      expect(emailVerified).toBeTruthy();
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get activation email', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.invitation);
      const activationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(activationLink));
    });

    await test.step('Complete profile setup', async () => {
      await expect(commonPage.modalName).toHaveText(appData.authorization.setNewPasswordModal);
      await loginPage.defaultInputWithName(appData.authorization.firstName).fill(newUser.firstName);
      await loginPage.defaultInputWithName(appData.authorization.lastName).fill(newUser.lastName);
      await loginPage.defaultInputWithName(appData.authorization.password).fill(newUser.password);
      await loginPage.defaultInputWithName(appData.authorization.confirmPassword).fill(newUser.password);
      await loginPage.clickSubmitButton();
    });

    await test.step('Check profile update success alert', async () => {
      await loginPage.waitForAlert(appData.authorization.profileUpdateAlert);
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.fillLogin({ user: emailHelper.email, password: newUser.password });
      await loginPage.clickSubmitButton();
      await loginPage.waitForLogin();
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search activated user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user status is active', async () => {
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });

  test('Add single user as Customer Success', async () => {
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

    await test.step('Fill all user inputs', async () => {
      await commonPage.fillFieldWithPlaceholder(editUserData.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(editUserData.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(editUserData.email, emailHelper.email);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.usersCreatedAlert);
    });

    await test.step('Verify user was added', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();

      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const customer = customerSuccess.user.split('@').pop()!;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: customer,
        [userManagementTable.role]: '',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Verify invitation email was sent', async () => {
      const emailVerified = await emailHelper.verifyInvitationEmail(emailHelper.email, emailHelper.token);
      expect(emailVerified).toBeTruthy();
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get activation email', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.invitation);
      const activationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(activationLink));
    });

    await test.step('Complete profile setup', async () => {
      await expect(commonPage.modalName).toHaveText(appData.authorization.setNewPasswordModal);
      await loginPage.defaultInputWithName(appData.authorization.firstName).fill(newUser.firstName);
      await loginPage.defaultInputWithName(appData.authorization.lastName).fill(newUser.lastName);
      await loginPage.defaultInputWithName(appData.authorization.password).fill(newUser.password);
      await loginPage.defaultInputWithName(appData.authorization.confirmPassword).fill(newUser.password);
      await loginPage.clickSubmitButton();
    });

    await test.step('Check profile update success alert', async () => {
      await loginPage.waitForAlert(appData.authorization.profileUpdateAlert);
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.fillLogin({ user: emailHelper.email, password: newUser.password });
      await loginPage.clickSubmitButton();
      await loginPage.waitForLogin();
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search activated user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user status is active', async () => {
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });

  test('Add single user as User with All Permissions', async () => {
    await test.step('Login to app as user with all permissions', async () => {
      await loginPage.login(userWithAllPermissions);
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

    await test.step('Fill all user inputs', async () => {
      await commonPage.fillFieldWithPlaceholder(editUserData.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(editUserData.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(editUserData.email, emailHelper.email);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(userManagementData.saveButton);
      await expect(commonPage.popUp).toHaveText(userManagementData.usersCreatedAlert);
    });

    await test.step('Verify user was added', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();

      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const customer = userWithAllPermissions.user.split('@').pop()!;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: customer,
        [userManagementTable.role]: '',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Verify invitation email was sent', async () => {
      const emailVerified = await emailHelper.verifyInvitationEmail(emailHelper.email, emailHelper.token);
      expect(emailVerified).toBeTruthy();
    });

    await test.step('Sign out from user with all permissions account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get activation email', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.invitation);
      const activationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(activationLink));
    });

    await test.step('Complete profile setup', async () => {
      await expect(commonPage.modalName).toHaveText(appData.authorization.setNewPasswordModal);
      await loginPage.defaultInputWithName(appData.authorization.firstName).fill(newUser.firstName);
      await loginPage.defaultInputWithName(appData.authorization.lastName).fill(newUser.lastName);
      await loginPage.defaultInputWithName(appData.authorization.password).fill(newUser.password);
      await loginPage.defaultInputWithName(appData.authorization.confirmPassword).fill(newUser.password);
      await loginPage.clickSubmitButton();
    });

    await test.step('Check profile update success alert', async () => {
      await loginPage.waitForAlert(appData.authorization.profileUpdateAlert);
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.fillLogin({ user: emailHelper.email, password: newUser.password });
      await loginPage.clickSubmitButton();
      await loginPage.waitForLogin();
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as user with all permissions', async () => {
      await loginPage.login(userWithAllPermissions);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search activated user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user status is active', async () => {
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });
});
