import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { NotificationManagementPage } from '@pages/notificationManagement.page';

test.describe('Negative validation for "Add notification" modal', () => {
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let notificationManagementPage: NotificationManagementPage;

  const admin = ConfigData.users.admin;
  const customer = admin.user.split('@').pop()!;
  const notificationData = appData.notificationManagementPageData;
  const addNotificationModal = notificationData.addNotificationModal;
  const validationErrors = notificationData.validationErrors;
  const sections = notificationData.notificationTable;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    notificationManagementPage = new NotificationManagementPage(page);
  });

  test('Check validation errors for empty required fields in "Add notification" modal', async () => {
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

    await test.step('Click "Add Notification" button and verify modal name', async () => {
      await notificationManagementPage.clickButtonOnPage(notificationData.addNotification);
      await expect(commonPage.modalName).toHaveText(notificationData.addNotification);
    });

    await test.step('Click "Save" button without filling required fields', async () => {
      await notificationManagementPage.clickButtonOnPage(addNotificationModal.saveButton);
    });

    await test.step('Verify validation error for "Type" field', async () => {
      await expect(notificationManagementPage.notificationSection(sections.type)).toContainText(
        sections.type + validationErrors.isRequired,
      );
    });

    await test.step('Verify validation error for "Channel" field', async () => {
      await expect(notificationManagementPage.notificationSection(sections.channel)).toContainText(
        sections.channel + validationErrors.isRequired,
      );
    });

    await test.step('Verify validation error for "Title" field', async () => {
      await expect(notificationManagementPage.notificationSection(sections.title)).toContainText(
        sections.title + validationErrors.isRequired,
      );
    });

    await test.step('Verify validation error for "Message" field', async () => {
      await expect(notificationManagementPage.notificationSection(sections.message)).toContainText(
        sections.message + validationErrors.isRequired,
      );
    });
  });
});
