import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { UserManagementPage } from '@pages/userManagement.page';
import { EmailHelper } from '@pages/email/helper';
import { generateNewUser } from '@utils/fakers';

test.describe('Create multiple users', () => {
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let userManagementPage: UserManagementPage;

  let customer: string,
    roleName: string,
    emailData: { email: string; token: string }[],
    activatedUser: { email: string; token: string };

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const editUserData = appData.userManagementPageData.editUserData;
  const userManagementTable = appData.userManagementTable;
  const userManagementData = appData.userManagementPageData;
  const role = appData.userRole;
  const newUser = generateNewUser();

  test.beforeEach(async ({ page, request }) => {
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    userManagementPage = new UserManagementPage(page);

    await test.step('Get temporary emails', async () => {
      emailData = [];
      for (let i = 0; i < 2; i++) {
        await emailHelper.generateNewEmail();
        emailData.push({
          email: emailHelper.email,
          token: emailHelper.token,
        });
      }
    });
  });

  test('Multi adding new users as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Open "Invite user" modal', async () => {
      await userManagementPage.openAddUserModal(userManagementData.addUsers);
    });

    await test.step('Fill all user inputs and invite users', async () => {
      customer = emailData[0].email.split('@').pop()!;
      await commonPage.selectValueInDropdown(editUserData.role, role.user);
      await commonPage.selectValueInDropdown(editUserData.customer, customer);

      for (const data of emailData) {
        await commonPage.fillFieldWithPlaceholder(editUserData.email, data.email);
        await commonPage.pressEnter();
      }
    });

    await test.step('Invite users', async () => {
      await commonPage.clickButtonInModal(userManagementData.invite);
      await expect(commonPage.popUp).toHaveText(`${userManagementData.usersInvitedAlert}
        ${emailData[0].email}
        ${emailData[1].email}`);
    });

    await test.step('Verify all users were added', async () => {
      for (const data of emailData) {
        await navPagePage.searchValue(data.email);
        await commonPage.waitForLoader();

        const columnsToCheck = {
          [userManagementTable.email]: data.email,
          [userManagementTable.customer]: customer,
          [userManagementTable.role]: role.user,
        };
        await commonPage.checkRowValues(1, columnsToCheck);
        const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
        await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
      }
    });

    await test.step('Verify invitation emails were sent', async () => {
      for (const data of emailData) {
        const emailVerified = await emailHelper.verifyInvitationEmail(data.email, data.token);
        expect(emailVerified).toBeTruthy();
      }
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Select random user for activation', async () => {
      const randomIndex = Math.floor(Math.random() * emailData.length);
      activatedUser = emailData[randomIndex];
    });

    await test.step('Switch EmailHelper to selected user', async () => {
      emailHelper.email = activatedUser.email;
      emailHelper.token = activatedUser.token;
      await (emailHelper as any).createContext(ApiMethods.headerWithBearerToken(activatedUser.token).headers);
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

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search activated user', async () => {
      await navPagePage.searchValue(activatedUser.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user status is active', async () => {
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });

  test.skip('Multi adding new users as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Check "User Management" page', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Open "Invite user" modal', async () => {
      await userManagementPage.openAddUserModal(userManagementData.addUsers);
    });

    await test.step('Fill all user inputs and invite users', async () => {
      customer = emailData[0].email.split('@').pop()!;
      await commonPage.selectValueInDropdown(editUserData.role, roleName);
      await commonPage.selectValueInDropdown(editUserData.customer, customer);

      for (const data of emailData) {
        await commonPage.fillFieldWithPlaceholder(editUserData.email, data.email);
        await commonPage.pressEnter();
      }
    });

    await test.step('Invite users', async () => {
      await commonPage.clickButtonInModal(userManagementData.invite);
      await expect(commonPage.popUp).toHaveText(`${userManagementData.usersInvitedAlert}
        ${emailData[0].email}
        ${emailData[1].email}`);
    });

    await test.step('Verify all users were added', async () => {
      for (const data of emailData) {
        await navPagePage.searchValue(data.email);
        await commonPage.waitForLoader();

        const columnsToCheck = {
          [userManagementTable.email]: data.email,
          [userManagementTable.customer]: customer,
          [userManagementTable.role]: roleName,
        };
        await commonPage.checkRowValues(1, columnsToCheck);
        const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
        await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
      }
    });

    await test.step('Verify invitation emails were sent', async () => {
      for (const data of emailData) {
        const emailVerified = await emailHelper.verifyInvitationEmail(data.email, data.token);
        expect(emailVerified).toBeTruthy();
      }
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Select random user for activation', async () => {
      const randomIndex = Math.floor(Math.random() * emailData.length);
      activatedUser = emailData[randomIndex];
    });

    await test.step('Switch EmailHelper to selected user', async () => {
      emailHelper.email = activatedUser.email;
      emailHelper.token = activatedUser.token;
      await (emailHelper as any).createContext(ApiMethods.headerWithBearerToken(activatedUser.token).headers);
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
      await navPagePage.searchValue(activatedUser.email);
      await commonPage.waitForLoader();
    });

    await test.step('Verify user status is active', async () => {
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });
  });
});
