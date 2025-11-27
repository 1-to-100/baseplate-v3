import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { UserPageHelper } from '@pages/helper';
import { DocumentationPage } from '@pages/documentation.page';

test.describe('Create new category', () => {
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let documentationPage: DocumentationPage;

  let selectedIconPath: string, categoryName: string;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const userWithAllPermissions = ConfigData.users.userWithPermissions;
  const documentationData = appData.documentationPageData;
  const addCategoryModal = documentationData.categoryModal;
  const categoryDescription = 'Test description for category';
  const subCategory = 'Subcategory for automation';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    commonPage = new CommonPage(page);
    navPagePage = new NavPagePage(page);
    documentationPage = new DocumentationPage(page);
  });

  test.afterEach(async () => {
    await test.step('Clean up - delete all categories', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.deleteAllCategories();
    });
  });

  test('Create new "Category" as System Administrator', async () => {
    categoryName = 'Test Category ' + Date.now();

    await test.step('Login to app as admin', async () => {
      await loginPage.login(admin);
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Select customer', async () => {
      const customer = admin.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Add category" modal', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);
    });

    await test.step('Fill category name and description fields', async () => {
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);
    });

    await test.step('Select exist or create new subcategory', async () => {
      await documentationPage.selectSubcategory(subCategory);
    });

    await test.step('Select random icon', async () => {
      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);
      selectedIconPath = await documentationPage.getSelectedIconPath();
    });

    await test.step('Click "Add category" button and verify success popup', async () => {
      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Search for created category', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify category data', async () => {
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
      await expect(documentationPage.categorySubCategory(categoryName)).toHaveText(subCategory);
      await expect(documentationPage.categoryArticlesCount(categoryName)).toContainText('0' + documentationData.articles);
      await expect(documentationPage.categoryIcon(categoryName)).toHaveAttribute('d', selectedIconPath);
    });
  });

  test('Create new "Category" as Customer Success', async () => {
    categoryName = 'Test Category ' + Date.now();

    await test.step('Login to app as customer success', async () => {
      await loginPage.login(customerSuccess);
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Select customer', async () => {
      const customer = customerSuccess.user.split('@').pop()!;
      await navPagePage.selectCustomer(customer);
      await commonPage.waitForLoader();
    });

    await test.step('Open "Add category" modal', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName.last()).toHaveText(addCategoryModal.modalName);
    });

    await test.step('Fill category name and description fields', async () => {
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);
    });

    await test.step('Select exist or create new subcategory', async () => {
      await documentationPage.selectSubcategory(subCategory);
    });

    await test.step('Select random icon', async () => {
      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);
      selectedIconPath = await documentationPage.getSelectedIconPath();
    });

    await test.step('Click "Add category" button and verify success popup', async () => {
      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Search for created category', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify category data', async () => {
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
      await expect(documentationPage.categorySubCategory(categoryName)).toHaveText(subCategory);
      await expect(documentationPage.categoryArticlesCount(categoryName)).toContainText('0' + documentationData.articles);
      await expect(documentationPage.categoryIcon(categoryName)).toHaveAttribute('d', selectedIconPath);
    });
  });

  test('Create new "Category" as User with All Permissions', async () => {
    categoryName = 'Test Category ' + Date.now();

    await test.step('Login to app as user with all permissions', async () => {
      await loginPage.login(userWithAllPermissions);
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Open "Add category" modal', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName.last()).toHaveText(addCategoryModal.modalName);
    });

    await test.step('Fill category name and description fields', async () => {
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);
    });

    await test.step('Select exist or create new subcategory', async () => {
      await documentationPage.selectSubcategory(subCategory);
    });

    await test.step('Select random icon', async () => {
      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);
      selectedIconPath = await documentationPage.getSelectedIconPath();
    });

    await test.step('Click "Add category" button and verify success popup', async () => {
      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Search for created category', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify category data', async () => {
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
      await expect(documentationPage.categorySubCategory(categoryName)).toHaveText(subCategory);
      await expect(documentationPage.categoryArticlesCount(categoryName)).toContainText('0' + documentationData.articles);
      await expect(documentationPage.categoryIcon(categoryName)).toHaveAttribute('d', selectedIconPath);
    });
  });
});
