import type { Locator, Page } from '@playwright/test';
import { CommonPage } from '@pages/common.page';
import { appData } from '@constants/text.constants';

const addRoleModal = appData.addRolePageData.addRole;

export class RoleSettingsPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly addRoleButton: Locator;
  readonly permission: (name: string) => Locator;
  readonly switcherForPermission: (name: string) => Locator;
  readonly permissionDropdown: (name: string) => Locator;
  readonly tooltip: Locator;
  readonly permissionValue: (name: string) => Locator;
  readonly selectedPermission: (section: string, permission: string) => Locator;
  readonly roleDataCards: Locator;
  readonly roleNameInCard: Locator;
  readonly countOfPeopleAssignedToRole: Locator;
  readonly roleNameErrorsMessage: Locator;
  readonly aboutErrorsMessage: Locator;
  readonly permissionErrorsMessage: (section: string, permission: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.addRoleButton = page.locator('.MuiButton-variantSolid');
    this.permission = (name: string) => page.locator(`//p[text()="${name}"]/ancestor::*[contains(@class, "MuiStack-root")][2]`);
    this.switcherForPermission = (name: string) => this.permission(name).getByRole('switch');
    this.permissionDropdown = (name: string) => this.permission(name).getByRole('combobox');
    this.tooltip = page.getByRole('tooltip');
    this.permissionValue = (name: string) => page.getByRole('option', { name });
    this.selectedPermission = (section: string, permission: string) =>
      this.permission(section).locator('xpath=./div[2]/p').getByText(permission);
    this.roleDataCards = page.locator('.MuiCard-vertical');
    this.roleNameInCard = this.roleDataCards.locator('.MuiTypography-title-md');
    this.countOfPeopleAssignedToRole = this.roleDataCards.locator('.MuiTypography-body-md');
    this.roleNameErrorsMessage = this.commonPage.inputWithPlaceholder(addRoleModal.roleName).locator('..').locator('+ p');
    this.aboutErrorsMessage = this.commonPage.inputWithPlaceholder(addRoleModal.about).locator('..').locator('+ div p');
    this.permissionErrorsMessage = (section: string, error: string) => this.permission(section).locator('..').getByText(error);
  }

  async clickAddRoleButton() {
    await this.addRoleButton.click();
  }

  async getTooltipForSwitcher(name: string): Promise<Locator> {
    await this.switcherForPermission(name).hover();
    return this.tooltip;
  }

  async hideTooltip() {
    await this.commonPage.buttonsInModal(addRoleModal.cancelCreateRoleButton).hover();
  }

  async toggleSwitcher(name: string): Promise<void> {
    await this.switcherForPermission(name).click();
  }

  async selectPermission(section: string, permission: string) {
    await this.permissionDropdown(section).click();
    await this.permissionValue(permission).click();
    await this.permissionDropdown(section).click();
  }
}
