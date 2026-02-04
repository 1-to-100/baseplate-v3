import type { Locator, Page } from '@playwright/test';
import { CommonPage } from '@pages/common.page';
import { appData } from '@constants/text.constants';

export class NotificationManagementPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly buttonsOnPage: (name: string) => Locator;
  readonly notificationTextEditor: Locator;
  readonly alert: (name: string) => Locator;
  readonly filterButtons: (buttonName: string) => Locator;
  readonly filterCheckbox: (section: string, filterName: string) => Locator;
  readonly notificationSection: (section: string) => Locator;
  readonly filterModalButton: (buttonName: string) => Locator;
  readonly clearFilterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.buttonsOnPage = (name: string) => page.locator('.MuiButton-sizeMd').getByText(name);
    this.notificationTextEditor = page.locator('.tiptap p');
    this.alert = (name: string) => page.locator('section li').getByText(name);
    this.filterButtons = (buttonName: string) =>
      page.locator('.MuiSheet-variantPlain .MuiTypography-body-md').getByText(buttonName);
    this.filterCheckbox = (section: string, filterName: string) =>
      this.filterButtons('Select ' + section)
        .locator('+ div p')
        .filter({ hasText: filterName })
        .locator('..')
        .locator('span');
    this.notificationSection = (section: string) =>
      page.locator('h3 + div .MuiStack-root > .MuiStack-root').filter({ hasText: section });
    this.filterModalButton = (buttonName: string) => page.locator('.MuiSheet-variantPlain button').getByText(buttonName);
    this.clearFilterButton = page.locator('.MuiButton-startDecorator');
  }

  async clickButtonOnPage(button: string): Promise<void> {
    await this.buttonsOnPage(button).click();
  }

  async deleteAllNotifications(): Promise<void> {
    if (!(await this.commonPage.emptyTable(appData.messages.emptyTable).isVisible())) {
      await this.commonPage.selectAllItemsInTable.click();
      await this.commonPage.deleteAllButton.click();
      await this.commonPage.clickButtonInModal(appData.notificationManagementPageData.notificationDeleteButton);
      await this.waitForAlert(appData.notificationManagementPageData.notificationDeletedAlert);
    }
  }

  async fillNotificationText(text: string): Promise<void> {
    await this.notificationTextEditor.click();
    await this.notificationTextEditor.fill(text);
  }

  async waitForAlert(value: string): Promise<void> {
    await this.alert(value).waitFor({ timeout: 30000 });
  }

  async selectFilterOption(text: string): Promise<void> {
    if (!(await this.filterButtons('Select ' + text.toLowerCase()).isVisible())) {
      await this.filterButtons(text).click();
    }
  }

  async selectFilterCheckbox(section: string, filterName: string): Promise<void> {
    await this.filterCheckbox(section.toLowerCase(), filterName).first().click();
  }

  async clickFilterModalButton(buttonName: string): Promise<void> {
    await this.filterModalButton(buttonName).click();
  }

  async clickClearFilterButton(): Promise<void> {
    await this.clearFilterButton.click();
  }
}
