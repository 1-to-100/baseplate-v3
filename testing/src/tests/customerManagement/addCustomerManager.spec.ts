import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { CustomerManagementPage } from '@pages/customerManagement.page';
import { EmailHelper } from '@pages/email/helper';
import { generateNewUser } from '@utils/fakers';

// TODO - functionality for deleting users hasn't been implemented
test.describe.skip('Add Customer Manager', () => {
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let customerManagementPage: CustomerManagementPage;

  const admin = ConfigData.users.admin;
  const customerManagementData = appData.customerManagementPageData;
  const addCustomerModal = appData.customerManagementPageData.addCustomerModal;
  const subscriptions = appData.customerManagementPageData.subscriptions;
  const customerSuccessManagers = 'Tester Andrii';
  const newUser = generateNewUser();

  test.beforeEach(async ({ page, request }) => {
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    customerManagementPage = new CustomerManagementPage(page);

    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });
  });

  test('Create new customer manager with Basic role', async () => {
    await test.step('Create user via registration', async () => {
      await loginPage.registration({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: emailHelper.email,
        password: newUser.password,
      });
      await expect(commonPage.modalName).toHaveText(appData.authorization.confirmEmailModal);
    });

    await test.step('Activate user and verify login', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.completeRegistration);
      const confirmationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(confirmationLink));
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.fillLogin({ user: emailHelper.email, password: newUser.password });
      await loginPage.clickSubmitButton();
      await loginPage.waitForLogin();
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.userManagement);
      await commonPage.waitForLoader();
    });

    await test.step('Sign out from activated user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Navigate to "Customer Management" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.customerManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(customerManagementData.pageTitle);
    });

    await test.step('Open "Add customer" modal', async () => {
      await customerManagementPage.openButtonsOnPage(customerManagementData.addCustomer);
      await expect(commonPage.modalName).toHaveText(customerManagementData.addCustomer);
    });

    await test.step('Fill customer name', async () => {
      await commonPage.fillFieldWithPlaceholder(addCustomerModal.customerName, 'Test Customer ' + Date.now());
    });

    await test.step('Select customer administrator', async () => {
      const fullName = `${newUser.firstName} ${newUser.lastName}`;
      await commonPage.selectValueInDropdown(addCustomerModal.customerAdministrator, fullName);
    });

    await test.step('Verify email field is populated', async () => {
      const emailInput = commonPage.inputWithPlaceholder(addCustomerModal.email);
      await expect(emailInput).toHaveValue(emailHelper.email);
    });

    await test.step('Select Basic subscription', async () => {
      await commonPage.selectValueInDropdown(addCustomerModal.subscription, subscriptions.basic);
    });

    await test.step('Select Customer Success Manager', async () => {
      await commonPage.selectValueInDropdown(addCustomerModal.customerSuccessManager, customerSuccessManagers);
    });

    await test.step('Save customer', async () => {
      await commonPage.clickButtonInModal(customerManagementData.addCustomer);
      await expect(commonPage.popUp).toHaveText(customerManagementData.customerCreatedAlert);
    });
  });
});
