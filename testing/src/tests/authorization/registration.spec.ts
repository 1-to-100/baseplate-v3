import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { CommonPage } from '@pages/common.page';
import { EmailHelper } from '@pages/email/helper';
import { NavPagePage } from '@pages/navPage.page';
import { appData } from '@constants/text.constants';
import { generateNewUser, randomLetters } from '@utils/fakers';
import { ApiMethods } from '@apiPage/methods';

test.describe('Registration', () => {
  let apiMethods: ApiMethods;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let emailHelper: EmailHelper;
  let navPagePage: NavPagePage;

  let customer: string;

  const admin = ConfigData.users.admin;
  const userManagementTable = appData.userManagementTable;
  const customerManagementTable = appData.customerManagementTable;
  const authorizationData = appData.authorization;
  const registrationErrors = appData.registrationErrors;
  const role = appData.userRole;
  const newUser = generateNewUser();

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    emailHelper = new EmailHelper(request);
    navPagePage = new NavPagePage(page);
  });

  test('Self-Register new user as a Standard User', async () => {
    await test.step('Get temporary mail', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Open "Customer Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Search customer and check empty table', async () => {
      customer = emailHelper.email.split('@').pop()!;
      await navPagePage.searchValue(customer);
      await commonPage.waitForLoader();
      // TODO - await expect(commonPage.tableData).toHaveText(appData.messages.emptyTable);
    });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Register new user', async () => {
      await loginPage.registration({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: emailHelper.email,
        password: newUser.password,
      });
      await expect(commonPage.modalName).toHaveText(appData.authorization.confirmEmailModal);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Check new user data and status inactive', async () => {
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

    await test.step('Open "Customer Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Search new customer', async () => {
      await navPagePage.searchValue(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Check customer data and status inactive', async () => {
      const columnsToCheck = {
        [customerManagementTable.customer]: customer,
        // TODO - [customerManagementTable.manager]: 'N/AN/A',
        // TODO - [customerManagementTable.users]: '1',
        // TODO - [customerManagementTable.subscription]: 'N/A',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      // const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(customerManagementTable.customer));
      // await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get and open confirmation link', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.completeRegistration);
      const confirmationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(confirmationLink));
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.login({ user: emailHelper.email, password: newUser.password });
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Sign out', async () => {
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

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
      await expect(commonPage.tableData).toHaveCount(1);
    });

    await test.step('Check new user data and status active', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await expect(commonPage.tableData).toHaveCount(1);
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: emailHelper.email.split('@').pop(),
        [userManagementTable.role]: role.user,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });

    await test.step('Delete created user', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
      const userId = (await userData.json())[0].user_id;
      await expect(await apiMethods.deleteUser(apiKey, userId)).toBe(204);
    });
  });

  test('Self-Register a user with the same work-email domain as Customer Admin', async () => {
    await test.step('Get temporary mail', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Register user', async () => {
      await loginPage.registration({ firstName: 'Test', lastName: 'User', email: emailHelper.email, password: 'Test12345!' });
      await expect(commonPage.modalName).toHaveText(appData.authorization.confirmEmailModal);
    });

    await test.step('Get and open confirmation link', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.completeRegistration);
      const confirmationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(confirmationLink));
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get second temporary mail', async () => {
      await emailHelper.generateNewEmail();
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Open "Customer Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Search customer', async () => {
      customer = emailHelper.email.split('@').pop()!;
      await navPagePage.searchValue(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Check customer data and status inactive', async () => {
      const columnsToCheck = {
        [customerManagementTable.customer]: customer,
        // TODO - [customerManagementTable.manager]: 'N/AN/A',
        // TODO - [customerManagementTable.users]: '1',
        // TODO - [customerManagementTable.subscription]: 'N/A',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      // const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(customerManagementTable.customer));
      // await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Register new user', async () => {
      await loginPage.registration({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: emailHelper.email,
        password: newUser.password,
      });
      await expect(commonPage.modalName).toHaveText(appData.authorization.confirmEmailModal);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Check "User Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.userManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
    });

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
    });

    await test.step('Check new user data and status inactive', async () => {
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

    await test.step('Open "Customer Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await expect(commonPage.pageName).toHaveText(appData.pages.customerManagement);
    });

    await test.step('Search new customer', async () => {
      await navPagePage.searchValue(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Check new users and status inactive', async () => {
      const columnsToCheck = {
        [customerManagementTable.customer]: customer,
        // TODO - [customerManagementTable.manager]: 'N/AN/A',
        // TODO - [customerManagementTable.users]: '2',
        // TODO - [customerManagementTable.subscription]: 'N/A',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      // const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(customerManagementTable.customer));
      // await expect(commonPage.userStatus(cell, appData.userStatuses.inactive)).toBeVisible();
    });

    await test.step('Sign out', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Get and open confirmation link', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.completeRegistration);
      const confirmationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(confirmationLink));
    });
    await test.step('Login with new user credentials', async () => {
      await loginPage.login({ user: emailHelper.email, password: newUser.password });
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Sign out', async () => {
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

    await test.step('Search new user', async () => {
      await navPagePage.searchValue(emailHelper.email);
      await commonPage.waitForLoader();
      await expect(commonPage.tableData).toHaveCount(1);
    });

    await test.step('Check new user data and status active', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await expect(commonPage.tableData).toHaveCount(1);
      const userName = `${await commonPage.getInitialsPrefix(newUser.firstName, newUser.lastName)}${newUser.firstName} ${newUser.lastName}`;
      const columnsToCheck = {
        [userManagementTable.userName]: userName,
        [userManagementTable.email]: emailHelper.email,
        [userManagementTable.customer]: emailHelper.email.split('@').pop(),
        [userManagementTable.role]: role.user,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
      const cell = commonPage.getRowColumnValue(1, await commonPage.getHeaderIndex(userManagementTable.userName));
      await expect(commonPage.userStatus(cell, appData.userStatuses.active)).toBeVisible();
    });

    await test.step('Delete created user', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
      const userId = (await userData.json())[0].user_id;
      await expect(await apiMethods.deleteUser(apiKey, userId)).toBe(204);
    });
  });

  test('Register new user filling invalid data [negative case]', async () => {
    await test.step('Try register new user with empty fields', async () => {
      await loginPage.registration(
        {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
        },
        false,
      );
    });

    await test.step('Check errors for required fields on registration page', async () => {
      await expect(loginPage.errorsMessageForInput(authorizationData.firstName)).toHaveText(registrationErrors.firstNameRequired);
      await expect(loginPage.errorsMessageForInput(authorizationData.lastName)).toHaveText(registrationErrors.lastNameRequired);
      await expect(loginPage.errorsMessageForInput(authorizationData.email)).toHaveText(registrationErrors.emailRequired);
      await expect(loginPage.errorsMessageForInput(authorizationData.password)).toHaveText(registrationErrors.passwordRequired);
      await expect(loginPage.termsAndConditionsError).toHaveText(registrationErrors.termsAndConditionsError);
    });

    await test.step('Try register new user with maximal values in first and last name fields', async () => {
      await loginPage.registration();
    });

    await test.step('Checking errors for invalid mail', async () => {
      await commonPage.waitForAlert(registrationErrors.invalidMail);
    });

    await test.step('Try register new user using already exists mail', async () => {
      await loginPage.registration({ email: admin.user });
    });

    // TODO - bug
    // await test.step('Check alert for email', async () => {
    //   await commonPage.waitForAlert(registrationErrors.existsMail);
    // });

    await test.step('Try register new user using invalid password', async () => {
      await loginPage.registration({ password: randomLetters(10) });
    });

    await test.step('Check alert for email', async () => {
      await expect(loginPage.errorsMessageForInput(authorizationData.password)).toHaveText(registrationErrors.invalidPassword);
    });
  });
});
