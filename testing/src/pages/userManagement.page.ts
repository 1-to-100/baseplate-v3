import type { Page, Locator } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;
  readonly editUserDropdown: (name: string) => Locator;
  readonly editUserDropdownValue: (name: string) => Locator;
  readonly addUserButton: Locator;
  readonly deleteUserButton: Locator;
  readonly deactivateUserButton: Locator;
  readonly addUserDropdown: Locator;
  readonly selectAddUserOption: (option: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.editUserDropdown = (name: string) => page.locator('.MuiTypography-body-sm').getByText(name).locator('+ div');
    this.editUserDropdownValue = (name: string) => page.getByRole('option', { name });
    this.addUserButton = page.locator('[type="button"]').getByText('Add user');
    this.deleteUserButton = page.locator('.MuiTypography-body-sm + div button').nth(0);
    this.deactivateUserButton = page.locator('.MuiTypography-body-sm + div button').nth(1);
    this.addUserDropdown = page.locator('.MuiBox-root > .MuiButton-variantSolid');
    this.selectAddUserOption = (option: string) => page.getByRole('tooltip').locator('div').getByText(option);
  }

  async selectValueInDropdown(dropdown: string, value: string) {
    await this.editUserDropdown(dropdown).click();
    await this.editUserDropdownValue(value).scrollIntoViewIfNeeded();
    await this.editUserDropdownValue(value).click();
  }

  async openAddUserModal(option: string) {
    await this.addUserDropdown.click();
    await this.selectAddUserOption(option).first().click();
  }
}
