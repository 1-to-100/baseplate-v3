import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { NotificationManagementPage } from '@pages/notificationManagement.page';
import { UserPageHelper } from '@pages/helper';
import { ApiMethods } from '@apiPage/methods';
import { generateNotificationMessage, generateNotificationTitle } from '@utils/fakers';

test.describe('Send single notification in app', () => {
  let apiMethods: ApiMethods;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let notificationManagementPage: NotificationManagementPage;

  const admin = ConfigData.users.admin;
  const manager = ConfigData.users.manager;
  const customerSuccess = ConfigData.users.customer;
  const customer = manager.user.split('@').pop()!;
  const notificationData = appData.notificationManagementPageData;
  const addNotificationModal = notificationData.addNotificationModal;
  const sendNotificationsModal = notificationData.sendNotificationsModal;
  const uniqueNotificationTitle = generateNotificationTitle();
  const uniqueNotificationText = generateNotificationMessage();

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    notificationManagementPage = new NotificationManagementPage(page);
  });

  test.afterEach(async () => {
    await test.step('Sign out from user account', async () => {
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

  test('Send single "Warning" notification in app as System Administrator', async () => {
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.warning);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.warning,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test('Send single "Alert" notification in app as System Administrator', async () => {
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.alert);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.alert,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test('Send single "Info" notification in app as System Administrator', async () => {
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.info);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.info,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test('Send single "Article" notification in app as System Administrator', async () => {
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.article);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.article,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(admin);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from admin account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test.skip('Send single "Warning" notification in app as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.warning);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.warning,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(customerSuccess);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test.skip('Send single "Alert" notification in app as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.alert);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.alert,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(customerSuccess);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test.skip('Send single "Info" notification in app as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.info);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.info,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(customerSuccess);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });

  test.skip('Send single "Article" notification in app as Customer Success', async () => {
    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
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

    await test.step('Select notification type and channel', async () => {
      await commonPage.selectValueInDropdown(
        addNotificationModal.typeDropdown,
        UserPageHelper.toConstantCase(notificationData.notificationTypes.inApp),
      );
      await commonPage.selectValueInDropdown(addNotificationModal.channelDropdown, notificationData.notificationChannels.article);
    });

    await test.step('Fill notification title', async () => {
      await commonPage.fillFieldWithPlaceholder(addNotificationModal.enterTitleField, uniqueNotificationTitle);
    });

    await test.step('Fill notification text', async () => {
      await notificationManagementPage.fillNotificationText(uniqueNotificationText);
    });

    await test.step('Click "Save" button', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
      await notificationManagementPage.waitForAlert(notificationData.notificationAddedAlert);
    });

    await test.step('Search for created notification', async () => {
      await navPagePage.searchValue(uniqueNotificationTitle);
    });

    await test.step('Verify notification data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const columnsToCheck = {
        [notificationData.notificationTable.title]: uniqueNotificationTitle,
        [notificationData.notificationTable.message]: uniqueNotificationText,
        [notificationData.notificationTable.type]: notificationData.notificationTypes.inApp,
        [notificationData.notificationTable.channel]: notificationData.notificationChannels.article,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more menu for created notification', async () => {
      await commonPage.openMoreMenu(uniqueNotificationTitle);
    });

    await test.step('Select Send action and verify modal name', async () => {
      await commonPage.selectAction(appData.actions.send);
      await expect(commonPage.modalName).toHaveText(sendNotificationsModal.modalTitle);
    });

    await test.step('Select Send to Users and recipient name', async () => {
      const apiKey = await apiMethods.getAccessToken(customerSuccess);
      const userData = await apiMethods.getUserData(apiKey, manager.user);
      const userName = (await userData.json())[0].full_name;
      await commonPage.selectValueInDropdown(sendNotificationsModal.sendToDropdown, sendNotificationsModal.sendToOptions.users);
      await commonPage.selectValueInDropdown(sendNotificationsModal.selectRecipientsDropdown, userName);
    });

    await test.step('Click "Send" button', async () => {
      await commonPage.clickButtonInModal(appData.actions.send);
      await notificationManagementPage.waitForAlert(notificationData.notificationSentAlert);
    });

    await test.step('Sign out from customer success account', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Login as user for roles', async () => {
      await loginPage.login(manager);
    });

    await test.step('Wait for new notification icon to appear', async () => {
      await expect(navPagePage.newNotificationIcon).toBeVisible();
    });

    await test.step('Open notifications modal', async () => {
      await navPagePage.openNotificationsModal();
    });

    await test.step('Verify notification content', async () => {
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationTitle);
      await expect(navPagePage.firstNotificationSection).toContainText(uniqueNotificationText);
    });

    await test.step('Click Mark as read button', async () => {
      await navPagePage.clickMarkAsReadButton();
    });

    await test.step('Wait for notification icon to disappear', async () => {
      await expect(navPagePage.newNotificationIcon).not.toBeVisible();
    });
  });
});
