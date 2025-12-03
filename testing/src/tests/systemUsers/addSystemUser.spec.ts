import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { SystemUsersPage } from '@pages/systemUsers.page';
import { EmailHelper } from '@pages/email/helper';
import { generateNewUser } from '@utils/fakers';

test.describe('Add System User', () => {
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let systemUsersPage: SystemUsersPage;

  const admin = ConfigData.users.admin;
  const systemUsersTable = appData.systemUsersPageData.systemUsersTable;
  const systemUsersData = appData.systemUsersPageData;
  const addSystemUserModal = appData.systemUsersPageData.addSystemUserModal;
  const systemRoles = appData.systemUsersPageData.systemRoles;
  const newUser = generateNewUser();
  let emailDomain: string;

  test.beforeEach(async ({ page, request }) => {
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    systemUsersPage = new SystemUsersPage(page);

    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
      emailDomain = emailHelper.email.split('@')[1];
    });
  });

  test('Add system user with "Customer Success" role', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Navigate to System Users page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.systemUsers);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(systemUsersData.pageTitle);
    });

    await test.step('Open "Add system user" modal', async () => {
      await systemUsersPage.openButtonsOnPage(systemUsersData.addSystemUser);
    });

    await test.step('Check "Add system user" modal is opened', async () => {
      await expect(commonPage.modalName).toHaveText(systemUsersData.addSystemUser);
    });

    await test.step('Fill all user inputs', async () => {
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.email, emailHelper.email);
    });

    await test.step('Select customer and system role', async () => {
      await commonPage.selectValueInDropdown(addSystemUserModal.customer, emailDomain);
      await commonPage.selectValueInDropdown(addSystemUserModal.systemRole, systemRoles.customerSuccess);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(addSystemUserModal.saveButton);
      await expect(commonPage.popUp).toHaveText(systemUsersData.userCreatedAlert);
    });

    await test.step('Verify user was added', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();

      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [systemUsersTable.userName]: userName,
        [systemUsersTable.email]: emailHelper.email,
        [systemUsersTable.customer]: emailDomain,
        [systemUsersTable.systemRole]: systemRoles.customerSuccess,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(systemUsersTable.userName));
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
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check that user sees only 4 navigation tabs', async () => {
      const expectedTabs = [
        appData.pages.userManagement,
        appData.pages.documentation,
        appData.pages.customerManagement,
        appData.pages.notificationManagement,
      ];

      for (const tab of expectedTabs) {
        await expect(navPagePage.navTabButton(tab)).toBeVisible();
      }
    });

    await test.step('Verify user can navigate to User Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Verify user can navigate to Documentation', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Verify user can navigate to Customer Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Verify user can navigate to Notification Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Select customer based on email domain', async () => {
      await navPagePage.selectCustomer(emailDomain);
    });

    await test.step('Navigate to System Users page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.systemUsers);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(systemUsersData.pageTitle);
    });

    await test.step('Search for the created user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user data and active status', async () => {
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [systemUsersTable.userName]: userName,
        [systemUsersTable.email]: emailHelper.email,
        [systemUsersTable.customer]: emailDomain,
        [systemUsersTable.systemRole]: systemRoles.customerSuccess,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(systemUsersTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });

  test('Add system user with "System Administrator" role', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Navigate to System Users page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.systemUsers);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(systemUsersData.pageTitle);
    });

    await test.step('Open "Add system user" modal', async () => {
      await systemUsersPage.openButtonsOnPage(systemUsersData.addSystemUser);
    });

    await test.step('Check "Add system user" modal is opened', async () => {
      await expect(commonPage.modalName).toHaveText(systemUsersData.addSystemUser);
    });

    await test.step('Fill all user inputs', async () => {
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.firstName, newUser.firstName);
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.lastName, newUser.lastName);
      await commonPage.fillFieldWithPlaceholder(addSystemUserModal.email, emailHelper.email);
    });

    await test.step('Select system role only', async () => {
      await commonPage.selectValueInDropdown(addSystemUserModal.systemRole, systemRoles.systemAdministrator);
    });

    await test.step('Save user', async () => {
      await commonPage.clickButtonInModal(addSystemUserModal.saveButton);
      await expect(commonPage.popUp).toHaveText(systemUsersData.userCreatedAlert);
    });

    await test.step('Verify user was added', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();

      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [systemUsersTable.userName]: userName,
        [systemUsersTable.email]: emailHelper.email,
        [systemUsersTable.customer]: '',
        [systemUsersTable.systemRole]: systemRoles.systemAdministrator,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(systemUsersTable.userName));
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
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Check that user sees all 6 navigation tabs', async () => {
      const expectedTabs = [
        appData.pages.userManagement,
        appData.pages.documentation,
        appData.pages.roleSettings,
        appData.pages.customerManagement,
        appData.pages.systemUsers,
        appData.pages.notificationManagement,
      ];

      for (const tab of expectedTabs) {
        await expect(navPagePage.navTabButton(tab)).toBeVisible();
      }
    });

    await test.step('Verify user can navigate to User Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Verify user can navigate to Documentation', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Verify user can navigate to Role Settings', async () => {
      await navPagePage.openNavMenuTab(appData.pages.roleSettings);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.roleSettings);
    });

    await test.step('Verify user can navigate to Customer Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Verify user can navigate to System Users', async () => {
      await navPagePage.openNavMenuTab(appData.pages.systemUsers);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(systemUsersData.pageTitle);
    });

    await test.step('Verify user can navigate to Notification Management', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Navigate to System Users page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.systemUsers);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(systemUsersData.pageTitle);
    });

    await test.step('Search for the created user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user data and active status', async () => {
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [systemUsersTable.userName]: userName,
        [systemUsersTable.email]: emailHelper.email,
        [systemUsersTable.customer]: '',
        [systemUsersTable.systemRole]: systemRoles.systemAdministrator,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(systemUsersTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });
});
