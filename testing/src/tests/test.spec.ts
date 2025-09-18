import { test } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';

test.describe('Test', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('Test', async () => {
    await loginPage.page.goto(ConfigData.baseUrl);
  });
});
