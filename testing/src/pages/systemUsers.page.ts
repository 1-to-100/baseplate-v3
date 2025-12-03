import type { Page, Locator } from '@playwright/test';
import { CommonPage } from '@pages/common.page';

export class SystemUsersPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly buttonsOnPage: (name: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.buttonsOnPage = (name: string) => page.locator('.MuiButton-sizeMd').getByText(name);
  }

  async openButtonsOnPage(text: string) {
    await this.buttonsOnPage(text).click();
  }
}
