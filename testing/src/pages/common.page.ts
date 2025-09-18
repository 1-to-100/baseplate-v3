import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { appData } from '@constants/text.constants';

export class CommonPage {
  readonly page: Page;
  readonly userEmailInHeader: Locator;
  readonly loader: Locator;
  readonly tableData: Locator;
  readonly getRowColumnValue: (row: number, column: number) => Locator;
  readonly tableTitleColumns: Locator;
  readonly pageName: Locator;
  readonly userStatus: (cell: Locator, status: string) => Locator;
  readonly moreButton: (user: string) => Locator;
  readonly actionButtonInMoreMenu: (name: string) => Locator;
  readonly alert: (name: string) => Locator;
  readonly modalName: Locator;
  readonly inputWithPlaceholder: (name: string) => Locator;
  readonly buttonsInModal: (name: string) => Locator;
  readonly popUp: Locator;
  readonly accessDeniedMessage: Locator;
  readonly checkboxButton: (user: string) => Locator;
  readonly selectAllItemsInTable: Locator;
  readonly breadcrumbItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userEmailInHeader = page.locator('.MuiTypography-body-xs');
    this.loader = page.getByRole('progressbar');
    this.tableData = page.locator('tbody tr');
    this.getRowColumnValue = (row: number, column: number) =>
      page.locator('table').locator('tr').nth(row).locator('td').nth(column);
    this.tableTitleColumns = page.locator('thead th');
    this.pageName = page.locator('.MuiTypography-h1');
    this.userStatus = (cell: Locator, status: string) => cell.locator(`[aria-label="${status.toLowerCase()}"]`);
    this.moreButton = (user: string) => this.tableData.filter({ hasText: user }).locator('td > .MuiIconButton-variantPlain');
    this.actionButtonInMoreMenu = (name: string) => page.getByRole('tooltip').locator('.MuiBox-root').getByText(name);
    this.alert = (name: string) => page.getByRole('alert').getByText(name);
    this.modalName = page.locator('.MuiTypography-h3');
    this.inputWithPlaceholder = (name: string) => page.getByPlaceholder(name);
    this.buttonsInModal = (name: string) => page.locator('.MuiModalDialog-variantOutlined [type="button"]').getByText(name);
    this.popUp = page.locator('div[data-title]');
    this.accessDeniedMessage = page.locator('main .MuiTypography-body-md').getByText(appData.accessDeniedMessage);
    this.checkboxButton = (user: string) => this.tableData.filter({ hasText: user }).locator('[type="checkbox"]');
    this.selectAllItemsInTable = this.tableTitleColumns.first().locator('input[type="checkbox"]');
    this.breadcrumbItems = page.locator('.MuiBreadcrumbs-root .MuiBreadcrumbs-li');
  }

  async waitForLoader(waitVisible: number = 10000, waitHidden: number = 30000): Promise<void> {
    await this.loader.waitFor({ state: 'visible', timeout: waitVisible });
    await this.loader.waitFor({ state: 'hidden', timeout: waitHidden });
  }

  async checkRowValues(rowIndex: number, data: Record<string, string | null | undefined>): Promise<void> {
    for (const [column, expected] of Object.entries(data)) {
      await expect(this.getRowColumnValue(rowIndex, await this.getHeaderIndex(column))).toHaveText(expected!);
    }
  }

  async getHeaderIndex(expectedText: string): Promise<number> {
    const headers = await this.tableTitleColumns.allTextContents();
    return headers.findIndex((text) => text.trim() === expectedText);
  }

  async openLink(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async getInitialsPrefix(firstName: string, lastName: string): Promise<string> {
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }

  async waitForAlert(value: string): Promise<void> {
    await this.alert(value).waitFor({ timeout: 30000 });
  }

  async fillFieldWithPlaceholder(field: string, value: string): Promise<void> {
    await this.inputWithPlaceholder(field).fill(value);
  }

  async openMoreMenu(element: string): Promise<void> {
    await this.moreButton(element).click();
  }

  async selectAction(action: string): Promise<void> {
    await this.actionButtonInMoreMenu(action).click();
  }

  async clickButtonInModal(name: string, skipWait = false): Promise<void> {
    await this.buttonsInModal(name).click();
    if (!skipWait) {
      await this.buttonsInModal(name).waitFor({ state: 'hidden' });
    }
  }

  async selectItemInTable(element: string): Promise<void> {
    await this.checkboxButton(element).click();
  }

  async checkColumnInformation(column: string, value: string): Promise<string[]> {
    const resultArray = [];
    const list = await this.getColumnData(column);
    for (const row of list) {
      if (!row.includes(value)) {
        resultArray.push(row);
      }
    }
    return resultArray;
  }

  async getColumnData(column: string): Promise<string[]> {
    const columnData: string[] = [];
    const columnNum = await this.getColumnIndex(this.tableTitleColumns, column);
    await this.page.waitForLoadState('load');
    const rowCount = await this.tableData.count();
    for (let i = 1; i <= rowCount; i++) {
      const cellLocator = this.getRowColumnValue(i, columnNum!);
      await cellLocator.waitFor();
      const cellText = await cellLocator.textContent();
      if (cellText != null) {
        columnData.push(cellText.trim());
      }
    }
    return columnData;
  }

  async getColumnIndex(elements: Locator, column: string): Promise<number | undefined> {
    const columns = await elements.all();
    for (let i = 0; i < columns.length; i++) {
      if ((await columns[i].textContent())?.trim() === column) {
        return i;
      }
    }
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async getBreadcrumbPath(): Promise<string[]> {
    const actualPath: string[] = [];
    for (let i = 0; i < (await this.breadcrumbItems.count()); i++) {
      const item = this.breadcrumbItems.nth(i);
      const text = await item.textContent();
      if (text && text.trim()) {
        actualPath.push(text.trim());
      }
    }
    return actualPath;
  }
}
