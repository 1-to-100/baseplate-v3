import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { NotificationManagementPage } from '@pages/notificationManagement.page';
import { UserPageHelper } from '@pages/helper';
import { generateNotificationTitle, generateNotificationMessage } from '@utils/fakers';

test.describe('Edit notification', () => {
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let notificationManagementPage: NotificationManagementPage;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const customer = admin.user.split('@').pop()!;
  const notificationData = appData.notificationManagementPageData;
  const addNotificationModal = notificationData.addNotificationModal;

  let initialNotificationTitle: string,
    initialNotificationText: string,
    updatedNotificationTitle: string,
    updatedNotificationText: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    notificationManagementPage = new NotificationManagementPage(page);
  });

  test.afterEach(async () => {
    await test.step('Sign out from account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
    });

    await test.step('Open Notification Management page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Delete all notifications', async () => {
      await notificationManagementPage.deleteAllNotifications();
    });
  });

  test('Edit notification from EMAIL to IN_APP as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open Notification Management page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click Add Notification button and verify modal name', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.addNotification);
      await expect(commonPage.modalName).toHaveText(notificationData.addNotification);
    });

    await test.step('Select notification type EMAIL and warning channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.email),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.warning);
    });

    await test.step('Fill notification title', async () => {
      initialNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, initialNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      initialNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(initialNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(initialNotificationTitle);
    });

    await test.step('Verify initial notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: initialNotificationTitle,
        [notificationData.notificationTable.message]: initialNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.email,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.warning,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(initialNotificationTitle);
    });

    await test.step('Select Edit action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(notificationData.editNotification);
    });

    await test.step('Change notification type to IN_APP', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
    });

    await test.step('Change channel to alert', async () => {
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.alert);
    });

    await test.step('Update notification title', async () => {
      updatedNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, updatedNotificationTitle);
    });

    await test.step('Update notification text', async () => {
      updatedNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(updatedNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationUpdatedAlert);
    });

    await test.step('Search for updated notification', async () => {
      await navPagePage.searchValue(updatedNotificationTitle);
    });

    await test.step('Verify updated notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: updatedNotificationTitle,
        [notificationData.notificationTable.message]: updatedNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.alert,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });

  test('Edit notification from IN_APP to EMAIL as System Administrator', async () => {
    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open Notification Management page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click Add Notification button and verify modal name', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.addNotification);
      await expect(commonPage.modalName).toHaveText(notificationData.addNotification);
    });

    await test.step('Select notification type IN_APP and alert channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.alert);
    });

    await test.step('Fill notification title', async () => {
      initialNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, initialNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      initialNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(initialNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(initialNotificationTitle);
    });

    await test.step('Verify initial notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: initialNotificationTitle,
        [notificationData.notificationTable.message]: initialNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.alert,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(initialNotificationTitle);
    });

    await test.step('Select Edit action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(notificationData.editNotification);
    });

    await test.step('Change notification type to EMAIL', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.email),
      );
    });

    await test.step('Change channel to info', async () => {
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.info);
    });

    await test.step('Update notification title', async () => {
      updatedNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, updatedNotificationTitle);
    });

    await test.step('Update notification text', async () => {
      updatedNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(updatedNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationUpdatedAlert);
    });

    await test.step('Search for updated notification', async () => {
      await navPagePage.searchValue(updatedNotificationTitle);
    });

    await test.step('Verify updated notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: updatedNotificationTitle,
        [notificationData.notificationTable.message]: updatedNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.email,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.info,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });

  test('Edit notification from EMAIL to IN_APP as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open Notification Management page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click Add Notification button and verify modal name', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.addNotification);
      await expect(commonPage.modalName).toHaveText(notificationData.addNotification);
    });

    await test.step('Select notification type EMAIL and info channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.email),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.info);
    });

    await test.step('Fill notification title', async () => {
      initialNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, initialNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      initialNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(initialNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(initialNotificationTitle);
    });

    await test.step('Verify initial notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: initialNotificationTitle,
        [notificationData.notificationTable.message]: initialNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.email,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.info,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(initialNotificationTitle);
    });

    await test.step('Select Edit action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(notificationData.editNotification);
    });

    await test.step('Change notification type to IN_APP', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
    });

    await test.step('Change channel to article', async () => {
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.article);
    });

    await test.step('Update notification title', async () => {
      updatedNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, updatedNotificationTitle);
    });

    await test.step('Update notification text', async () => {
      updatedNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(updatedNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationUpdatedAlert);
    });

    await test.step('Search for updated notification', async () => {
      await navPagePage.searchValue(updatedNotificationTitle);
    });

    await test.step('Verify updated notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: updatedNotificationTitle,
        [notificationData.notificationTable.message]: updatedNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.article,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });

  test('Edit notification from IN_APP to EMAIL as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Select customer', async () => {
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open Notification Management page and wait for loader to disappear', async () => {
      await navPagePage.openNavMenuTab(appData.pages.notificationManagement);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.notificationManagement);
    });

    await test.step('Click Add Notification button and verify modal name', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.addNotification);
      await expect(commonPage.modalName).toHaveText(notificationData.addNotification);
    });

    await test.step('Select notification type IN_APP and article channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.article);
    });

    await test.step('Fill notification title', async () => {
      initialNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, initialNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      initialNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(initialNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(initialNotificationTitle);
    });

    await test.step('Verify initial notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: initialNotificationTitle,
        [notificationData.notificationTable.message]: initialNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.article,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(initialNotificationTitle);
    });

    await test.step('Select Edit action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.edit);
      await expect(commonPage.modalName).toHaveText(notificationData.editNotification);
    });

    await test.step('Change notification type to EMAIL', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.email),
      );
    });

    await test.step('Change channel to warning', async () => {
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.warning);
    });

    await test.step('Update notification title', async () => {
      updatedNotificationTitle = generateNotificationTitle();
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, updatedNotificationTitle);
    });

    await test.step('Update notification text', async () => {
      updatedNotificationText = generateNotificationMessage();
      await notificationManagementPage.fillNotificationText(updatedNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationUpdatedAlert);
    });

    await test.step('Search for updated notification', async () => {
      await navPagePage.searchValue(updatedNotificationTitle);
    });

    await test.step('Verify updated notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: updatedNotificationTitle,
        [notificationData.notificationTable.message]: updatedNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.email,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.warning,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });
});
