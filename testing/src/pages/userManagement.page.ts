import type { Page, Locator } from '@playwright/test';
import { CommonPage } from '@pages/common.page';

export class UserManagementPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly addUserButton: Locator;
  readonly deleteUserButton: Locator;
  readonly deactivateUserButton: Locator;
  readonly addUserDropdown: Locator;
  readonly selectAddUserOption: (option: string) => Locator;
  readonly notificationDetailsTitle: Locator;
  readonly notificationDetailsData: (option: string) => Locator;
  readonly closeNotificationDetailsModalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.addUserButton = page.locator('[type="button"]').getByText('Add user');
    this.deleteUserButton = page.locator('.MuiTypography-body-sm + div button').nth(0);
    this.deactivateUserButton = page.locator('.MuiTypography-body-sm + div button').nth(1);
    this.addUserDropdown = page.locator('.MuiBox-root > .MuiButton-variantSolid');
    this.selectAddUserOption = (option: string) => page.getByRole('tooltip').locator('div').getByText(option);
    this.notificationDetailsTitle = page.locator('.MuiTypography-title-lg');
    this.notificationDetailsData = (text: string) =>
      page.locator('.MuiSheet-variantPlain .MuiTypography-body-sm').getByText(text).locator('..');
    this.closeNotificationDetailsModalButton = page.locator('.MuiSheet-variantPlain button');
  }

  async openAddUserModal(option: string) {
    await this.addUserDropdown.click();
    await this.selectAddUserOption(option).first().click();
  }

  async closeNotificationDetailsModal() {
    await this.closeNotificationDetailsModalButton.click();
  }
}
