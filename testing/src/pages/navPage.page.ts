import type { Locator, Page } from '@playwright/test';

export class NavPagePage {
  readonly page: Page;
  readonly personIcon: Locator;
  readonly userMenuButton: (text: string) => Locator;
  readonly navTabButton: (text: string) => Locator;
  readonly searchInput: Locator;
  readonly selectCustomerDropdown: Locator;
  readonly selectCustomerValue: (text: string) => Locator;
  readonly exitFromImpersonateMode: Locator;

  constructor(page: Page) {
    this.page = page;
    this.personIcon = page.getByTestId('PersonIcon');
    this.userMenuButton = (text: string) => page.locator('.MuiSheet-variantPlain').getByRole('button').getByText(text);
    this.navTabButton = (text: string) =>
      page.locator('.MuiBox-root nav .MuiList-vertical a[href*="/"]').getByText(text, { exact: true });
    this.searchInput = page.getByPlaceholder('Search', { exact: true });
    this.selectCustomerDropdown = page.getByPlaceholder('Select customer').nth(0);
    this.selectCustomerValue = (text: string) => page.locator('.base-Popper-root li').getByText(text);
    this.exitFromImpersonateMode = page.getByRole('alert').locator('svg');
  }

  async openNavMenuTab(tabName: string): Promise<void> {
    await this.navTabButton(tabName).click();
  }

  async clickUserMenuButton(name: string): Promise<void> {
    await this.personIcon.click();
    await this.userMenuButton(name).click();
  }

  async searchValue(value: string): Promise<void> {
    await this.searchInput.fill(value);
  }

  async selectCustomer(option: string): Promise<void> {
    await this.selectCustomerDropdown.click();
    await this.selectCustomerValue(option).scrollIntoViewIfNeeded();
    await this.selectCustomerValue(option).click();
  }

  async clickExitFromImpersonateMode(): Promise<void> {
    await this.exitFromImpersonateMode.click();
  }
}
