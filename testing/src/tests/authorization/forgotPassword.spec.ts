import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { EmailHelper } from '@pages/email/helper';
import { generateNewUser } from '@utils/fakers';
import { ApiMethods } from '@apiPage/methods';

test.describe('Forgot Password', () => {
  let apiMethods: ApiMethods;
  let emailHelper: EmailHelper;
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;

  const admin = ConfigData.users.admin;
  const newUser = generateNewUser();

  test.beforeEach(async ({ page, request }) => {
    apiMethods = new ApiMethods(request);
    emailHelper = new EmailHelper(request);
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);

    await test.step('Get temporary email', async () => {
      await emailHelper.generateNewEmail();
    });
  });

  test.afterEach(async () => {
    await test.step('Delete created user', async () => {
      if (emailHelper.email) {
        try {
          const apiKey = await apiMethods.getAccessToken(admin);
          const userData = await apiMethods.getUserData(apiKey, emailHelper.email);
          const userId = (await userData.json())[0].user_id;
          await expect(await apiMethods.deleteUser(apiKey, userId)).toBe(204);
        } catch {
          // Ignore errors if user doesn't exist or already deleted
        }
      }
    });
  });

  test.skip('Reset password for existing user', async () => {
    let recoveryEmail: any;

    await test.step('Create user via registration', async () => {
      await loginPage.registration({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: emailHelper.email,
        password: newUser.password,
      });
      await expect(commonPage.modalName).toHaveText(appData.authorization.confirmEmailModal);
    });

    await test.step('Activate user and verify login', async () => {
      const email = await emailHelper.waitForEmail(appData.emailSubject.completeRegistration);
      const confirmationLink = await emailHelper.extractRegistrationLink(email.text);
      await commonPage.openLink(String(confirmationLink));
    });

    await test.step('Login with new user credentials', async () => {
      await loginPage.waitForLogin();
    });

    await test.step('Check user was logged in', async () => {
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
      await commonPage.waitForLoader();
    });

    await test.step('Sign out from user', async () => {
      await navPagePage.clickUserMenuButton(appData.userMenuButtons.signOut);
    });

    await test.step('Navigate to login page', async () => {
      await loginPage.page.goto(ConfigData.loginPage);
    });

    await test.step('Click on "Forgot password?" link', async () => {
      await loginPage.forgotPasswordLink.click();
    });

    await test.step('Check "Reset Password" page is opened', async () => {
      await expect(commonPage.modalName).toHaveText(appData.authorization.resetPassword);
    });

    await test.step('Fill email field', async () => {
      await loginPage.defaultInputWithName(appData.authorization.email).fill(emailHelper.email);
    });

    await test.step('Click "Send Recovery Link" button', async () => {
      await loginPage.defaultButtonWithType(appData.authorization.submitButton).click();
    });

    await test.step('Verify recovery email was sent', async () => {
      recoveryEmail = await emailHelper.waitForEmail(appData.emailSubject.passwordReset);
      expect(recoveryEmail).toBeTruthy();
    });

    await test.step('Open recovery link from email', async () => {
      const recoveryLink = await emailHelper.extractRegistrationLink(recoveryEmail.text);
      await commonPage.openLink(String(recoveryLink));
    });
  });
});
