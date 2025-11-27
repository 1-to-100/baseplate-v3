import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { NotificationManagementPage } from '@pages/notificationManagement.page';
import { UserPageHelper } from '@pages/helper';
import { ApiMethods } from '@apiPage/methods';

test.describe('Notification History', () => {
  let apiMethods: ApiMethods;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let notificationManagementPage: NotificationManagementPage;

  let userName: string;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const userWithPermissions = ConfigData.users.userWithPermissions;
  const customer = admin.user.split('@').pop()!;
  const notificationData = appData.notificationManagementPageData;
  const notificationHistoryTable = notificationData.notificationHistoryTable;
  const filterButtons = notificationData.filterButtons;

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    notificationManagementPage = new NotificationManagementPage(page);
  });

  test('Check notification history filters as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Notification Management" page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click "Notification History" button', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.notificationHistory);
    });

    await test.step('Verify "Notification History" tab name', async () => {
      await expect(commonPage.pageName).toHaveText('Notification History');
    });

    await test.step('Click "Filter" button', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Type" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.type);
    });

    await test.step('Select "In-App" checkbox in Type filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.type,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
    });

    await test.step('Click "Apply" button', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Type column are "In-App"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.type,
        notificationData.notificationTypes.inApp,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button again', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Channel" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.channel);
    });

    await test.step('Select "Warning" checkbox in Channel filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.warning,
      );
    });

    await test.step('Click "Apply" button for Channel filter', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Channel column are "warning"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.warning,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Channel', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Alert channel', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Channel" filter option for Alert', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.channel);
    });

    await test.step('Select "Alert" checkbox in Channel filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.alert,
      );
    });

    await test.step('Click "Apply" button for Alert channel', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Channel column are "alert"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.alert,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Alert', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Info channel', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Channel" filter option for Info', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.channel);
    });

    await test.step('Select "Info" checkbox in Channel filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.info,
      );
    });

    await test.step('Click "Apply" button for Info channel', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Channel column are "info"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.info,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Info', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Article channel', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Channel" filter option for Article', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.channel);
    });

    await test.step('Select "Article" checkbox in Channel filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.article,
      );
    });

    await test.step('Click "Apply" button for Article channel', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Channel column are "article"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.article,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Article', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for User filter', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "User" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.user);
    });

    await test.step('Get user data via API', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, userWithPermissions.user);
      const userDataJson = (await userData.json()).data[0];
      userName = userDataJson.firstName + ' ' + userDataJson.lastName;
    });

    await test.step('Select user checkbox', async () => {
      await notificationManagementPage.selectFilterCheckbox(notificationHistoryTable.user, userName);
    });

    await test.step('Click "Apply" button for User filter', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in User column match selected user', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      // TODO - don't work
      // const incorrectValues = await commonPage.checkColumnInformation(notificationHistoryTable.user, userName);
      // expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for User', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Customer filter', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Customer" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.customer);
    });

    await test.step('Select customer checkbox', async () => {
      await notificationManagementPage.selectFilterCheckbox(notificationHistoryTable.customer, customer);
    });

    await test.step('Click "Apply" button for Customer filter', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Customer column match selected customer', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(notificationHistoryTable.customer, customer);
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Customer', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });
  });

  test('Check notification history filters as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Select customer', async () => {
      const customerForCustomerSuccess = customerSuccess.user.split('@').pop()!;
      await navPagePage.selectCustomer(customerForCustomerSuccess);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Notification Management" page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click "Notification History" button', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.notificationHistory);
    });

    await test.step('Verify "Notification History" tab name', async () => {
      await expect(commonPage.pageName).toHaveText('Notification History');
    });

    await test.step('Click "Filter" button', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Type" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.type);
    });

    await test.step('Select "In App" checkbox in Type filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.type,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
    });

    await test.step('Click "Apply" button', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Type column are "In App"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.type,
        notificationData.notificationTypes.inApp,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Info channel', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Channel" filter option for Info', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.channel);
    });

    await test.step('Select "Info" checkbox in Channel filter', async () => {
      await notificationManagementPage.selectFilterCheckbox(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.info,
      );
    });

    await test.step('Click "Apply" button for Info channel', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Channel column are "info"', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.channel,
        notificationData.notificationChannels.info,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Info', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for User filter', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "User" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.user);
    });

    await test.step('Get user data via API', async () => {
      const apiKey = await apiMethods.getAccessToken(customerSuccess);
      const userData = await apiMethods.getUserData(apiKey, userWithPermissions.user);
      const userDataJson = (await userData.json()).data[0];
      userName = userDataJson.firstName + ' ' + userDataJson.lastName;
    });

    await test.step('Select user checkbox', async () => {
      await notificationManagementPage.selectFilterCheckbox(notificationHistoryTable.user, userName);
    });

    await test.step('Click "Apply" button for User filter', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in User column match selected user', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      // TODO - don't work
      // const incorrectValues = await commonPage.checkColumnInformation(notificationHistoryTable.user, userName);
      // expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for User', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });

    await test.step('Click "Filter" button for Customer filter', async () => {
      await notificationManagementPage.clickButtonOnPage(filterButtons.filter);
    });

    await test.step('Select "Customer" filter option', async () => {
      await notificationManagementPage.selectFilterOption(notificationHistoryTable.customer);
    });

    await test.step('Select customer checkbox', async () => {
      const customerForCustomerSuccess = customerSuccess.user.split('@').pop()!;
      await notificationManagementPage.selectFilterCheckbox(notificationHistoryTable.customer, customerForCustomerSuccess);
    });

    await test.step('Click "Apply" button for Customer filter', async () => {
      await notificationManagementPage.clickFilterModalButton(filterButtons.apply);
      await commonPage.waitForLoader();
    });

    await test.step('Verify that all values in Customer column match selected customer', async () => {
      const count = await commonPage.tableData.count();
      await expect(count).toBeGreaterThanOrEqual(1);
      const customerForCustomerSuccess = customerSuccess.user.split('@').pop()!;
      const incorrectValues = await commonPage.checkColumnInformation(
        notificationHistoryTable.customer,
        customerForCustomerSuccess,
      );
      expect(incorrectValues).toHaveLength(0);
    });

    await test.step('Click "Clear filter" button for Customer', async () => {
      await notificationManagementPage.clickClearFilterButton();
    });
  });
});
