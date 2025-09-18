import type { Locator, Page } from '@playwright/test';
import { ConfigData } from '@configData';
import { UserPageHelper } from '@pages/helper';
import { CommonPage } from '@pages/common.page';
import { appData } from '@constants/text.constants';
import { faker } from '@faker-js/faker';

type RegistrationData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

export class LoginPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly defaultInputWithName: (name: string) => Locator;
  readonly defaultButtonWithType: (type: string) => Locator;
  readonly errorsMessageForInput: (name: string) => Locator;
  readonly termsAndConditionsError: Locator;
  readonly alert: (name: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.defaultInputWithName = (name: string) => page.locator(`[name="${UserPageHelper.toCamelCase(name)}"]`);
    this.defaultButtonWithType = (type: string) => page.locator(`[type="${UserPageHelper.toCamelCase(type)}"]`);
    this.errorsMessageForInput = (name: string) => this.defaultInputWithName(name).locator('..').locator('+ div');
    this.termsAndConditionsError = page
      .locator('.MuiFormControl-root .MuiBox-root')
      .locator('..')
      .locator('.MuiFormHelperText-root');
    this.alert = (name: string) => page.locator('section li').getByText(name);
  }

  async login(userData: { user: string; password: string }): Promise<void> {
    await this.page.goto(ConfigData.loginPage);
    await this.fillLogin(userData);
    await this.clickSubmitButton();
    await this.waitForLogin();
  }

  async fillLogin(userData: { user: string; password: string }): Promise<void> {
    await this.defaultInputWithName(appData.authorization.email).fill(userData.user);
    await this.defaultInputWithName(appData.authorization.password).fill(userData.password);
  }

  async clickSubmitButton(): Promise<void> {
    await this.defaultButtonWithType('Submit').click();
  }

  async waitForLogin(): Promise<void> {
    await this.commonPage.userEmailInHeader.waitFor({ state: 'visible', timeout: 30000 });
  }

  async registration(data: RegistrationData = {}, acceptTerms: boolean = true): Promise<void> {
    const {
      firstName = faker.person.firstName(),
      lastName = faker.person.lastName(),
      email = faker.internet.email(),
      password = faker.internet.password({ length: 12 }),
    } = data;
    await this.page.goto(ConfigData.registerPage);
    await this.defaultInputWithName(appData.authorization.firstName).fill(firstName);
    await this.defaultInputWithName(appData.authorization.lastName).fill(lastName);
    await this.defaultInputWithName(appData.authorization.email).fill(email);
    await this.defaultInputWithName(appData.authorization.password).fill(password);
    if (acceptTerms) {
      await this.defaultButtonWithType('Checkbox').click();
    }
    await this.clickSubmitButton();
  }

  async waitForAlert(value: string): Promise<void> {
    await this.alert(value).waitFor({ timeout: 30000 });
  }
}
