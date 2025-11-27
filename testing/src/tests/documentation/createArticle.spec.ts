import { test, expect } from '@playwright/test';
import { ConfigData } from '@configData';
import { LoginPage } from '@pages/login.page';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { UserPageHelper } from '@pages/helper';
import { DocumentationPage } from '@pages/documentation.page';
import { generateFormattedDate, generateArticleText } from '@utils/fakers';

test.describe('Create new article', () => {
  let loginPage: LoginPage;
  let commonPage: CommonPage;
  let navPagePage: NavPagePage;
  let documentationPage: DocumentationPage;

  let categoryName: string, articleTitle: string, articleText: string;

  const admin = ConfigData.users.admin;
  const customerSuccess = ConfigData.users.customer;
  const userWithAllPermissions = ConfigData.users.userWithPermissions;
  const documentationData = appData.documentationPageData;
  const articlesData = appData.articlesPageData;
  const addArticleModal = appData.addArticleModal;
  const addCategoryModal = documentationData.categoryModal;
  const categoryDescription = 'Test description for category';
  const subCategory = 'Subcategory for automation';
  const videoUrl = 'https://www.youtube.com/watch?v=ontU9cOg354';

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

  test('Create new "Article" as System Administrator', async () => {
    categoryName = 'Test Category ' + Date.now();
    articleTitle = 'Test Article ' + Date.now();
    articleText = generateArticleText();

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

    await test.step('Create new category', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName).toHaveText(addCategoryModal.modalName);

      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

      await documentationPage.selectSubcategory(subCategory);

      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Verify category was created', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
    });

    await test.step('Click on category to open articles page', async () => {
      await documentationPage.openCategory(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify breadcrumb path shows Documentation and category name', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName]);
    });

    await test.step('Verify empty articles table messages', async () => {
      await expect(documentationPage.noArticlesMessages.first()).toHaveText(articlesData.noArticlesMessage);
      await expect(documentationPage.noArticlesMessages.nth(1)).toHaveText(articlesData.addArticlesMessage);
    });

    await test.step('Click "Add article" button', async () => {
      await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
    });

    await test.step('Verify "Add article" page title and breadcrumb', async () => {
      await expect(commonPage.pageName).toHaveText(articlesData.addArticleButton);
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, articlesData.addArticleButton]);
    });

    await test.step('Fill article data', async () => {
      await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
      await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
      await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
      await commonPage.fillFieldWithPlaceholder(addArticleModal.pasteLinkPlaceholder, videoUrl);
      await documentationPage.fillArticleText(articleText);
    });

    await test.step('Click preview and verify content', async () => {
      await documentationPage.clickPreviewButton();
      expect(await commonPage.inputWithPlaceholder(addArticleModal.articleTitlePlaceholder).inputValue()).toBe(articleTitle);
      expect(await documentationPage.articlePreviewData.textContent()).toContain(articleText);
      expect(await documentationPage.getVideoUrl()).toBe(videoUrl);
    });

    await test.step('Click "Save as a draft" and verify alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.saveAsDraft);
      await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
    });

    await test.step('Navigate back to documentation and open category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
    });

    await test.step('Verify article data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const currentDate = generateFormattedDate();
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.lastEdit]: currentDate,
        [appData.articleTableData.status]: appData.statuses.draft,
        [appData.articleTableData.performance]: '0',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more button for article and click "Edit" button', async () => {
      await commonPage.openMoreMenu(articleTitle);
      await commonPage.selectAction(appData.actions.edit);
      await documentationPage.waitForBreadcrumbLoaded();
    });

    await test.step('Verify breadcrumb shows article title', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName, articleTitle]);
    });

    await test.step('Click "Publish" button and check updated alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.publish);
      await expect(commonPage.popUp).toHaveText(articlesData.articleUpdatedAlert);
    });

    await test.step('Navigate back and check article status changed to "Published"', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.status]: appData.statuses.published,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });

  test('Create new "Article" as Customer Success', async () => {
    categoryName = 'Test Category ' + Date.now();
    articleTitle = 'Test Article ' + Date.now();
    articleText = generateArticleText();

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

    await test.step('Create new category', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName.last()).toHaveText(addCategoryModal.modalName);

      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

      await documentationPage.selectSubcategory(subCategory);

      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Verify category was created', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
    });

    await test.step('Click on category to open articles page', async () => {
      await documentationPage.openCategory(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify breadcrumb path shows Documentation and category name', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName]);
    });

    await test.step('Verify empty articles table messages', async () => {
      await expect(documentationPage.noArticlesMessages.first()).toHaveText(articlesData.noArticlesMessage);
      await expect(documentationPage.noArticlesMessages.nth(1)).toHaveText(articlesData.addArticlesMessage);
    });

    await test.step('Click "Add article" button', async () => {
      await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
    });

    await test.step('Verify "Add article" page title and breadcrumb', async () => {
      await expect(commonPage.pageName).toHaveText(articlesData.addArticleButton);
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, articlesData.addArticleButton]);
    });

    await test.step('Fill article data', async () => {
      await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
      await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
      await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
      await commonPage.fillFieldWithPlaceholder(addArticleModal.pasteLinkPlaceholder, videoUrl);
      await documentationPage.fillArticleText(articleText);
    });

    await test.step('Click preview and verify content', async () => {
      await documentationPage.clickPreviewButton();
      expect(await commonPage.inputWithPlaceholder(addArticleModal.articleTitlePlaceholder).inputValue()).toBe(articleTitle);
      expect(await documentationPage.articlePreviewData.textContent()).toContain(articleText);
      expect(await documentationPage.getVideoUrl()).toBe(videoUrl);
    });

    await test.step('Click "Save as a draft" and verify alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.saveAsDraft);
      await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
    });

    await test.step('Navigate back to documentation and open category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
    });

    await test.step('Verify article data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const currentDate = generateFormattedDate();
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.lastEdit]: currentDate,
        [appData.articleTableData.status]: appData.statuses.draft,
        [appData.articleTableData.performance]: '0',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more button for article and click "Edit" button', async () => {
      await commonPage.openMoreMenu(articleTitle);
      await commonPage.selectAction(appData.actions.edit);
      await documentationPage.waitForBreadcrumbLoaded();
    });

    await test.step('Verify breadcrumb shows article title', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName, articleTitle]);
    });

    await test.step('Click "Publish" button and check updated alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.publish);
      await expect(commonPage.popUp).toHaveText(articlesData.articleUpdatedAlert);
    });

    await test.step('Navigate back and check article status changed to "Published"', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.status]: appData.statuses.published,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });

  test('Create new "Article" as User with All Permissions', async () => {
    categoryName = 'Test Category ' + Date.now();
    articleTitle = 'Test Article ' + Date.now();
    articleText = generateArticleText();

    await test.step('Login to app as user with all permissions', async () => {
      await loginPage.login(userWithAllPermissions);
    });

    await test.step('Open "Documentation" page', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await commonPage.waitForLoader();
      await expect(commonPage.pageName).toHaveText(appData.pages.documentation);
    });

    await test.step('Create new category', async () => {
      await documentationPage.clickButtonOnPage(documentationData.addCategoryButton);
      await expect(commonPage.modalName.last()).toHaveText(addCategoryModal.modalName);

      await commonPage.fillFieldWithPlaceholder(addCategoryModal.categoryNameInput, categoryName);
      await commonPage.fillFieldWithPlaceholder(addCategoryModal.aboutInput, categoryDescription);

      await documentationPage.selectSubcategory(subCategory);

      const iconOptions = Object.values(addCategoryModal.addIcons);
      const randomIcon = UserPageHelper.getRandomValue(iconOptions);
      await commonPage.selectValueInDropdown(addCategoryModal.addIconDropdown, randomIcon);

      await commonPage.clickButtonInModal(documentationData.addCategoryButton);
      await expect(commonPage.popUp).toHaveText(documentationData.categoryCreatedAlert);
    });

    await test.step('Verify category was created', async () => {
      await navPagePage.searchValue(categoryName);
      await commonPage.waitForLoader();
      await expect(documentationPage.categoryTitle(categoryName)).toHaveText(categoryName);
    });

    await test.step('Click on category to open articles page', async () => {
      await documentationPage.openCategory(categoryName);
      await commonPage.waitForLoader();
    });

    await test.step('Verify breadcrumb path shows Documentation and category name', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName]);
    });

    await test.step('Verify empty articles table messages', async () => {
      await expect(documentationPage.noArticlesMessages.first()).toHaveText(articlesData.noArticlesMessage);
      await expect(documentationPage.noArticlesMessages.nth(1)).toHaveText(articlesData.addArticlesMessage);
    });

    await test.step('Click "Add article" button', async () => {
      await documentationPage.clickButtonOnPage(articlesData.addArticleButton);
    });

    await test.step('Verify "Add article" page title and breadcrumb', async () => {
      await expect(commonPage.pageName).toHaveText(articlesData.addArticleButton);
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, articlesData.addArticleButton]);
    });

    await test.step('Fill article data', async () => {
      await commonPage.fillFieldWithPlaceholder(addArticleModal.articleTitlePlaceholder, articleTitle);
      await commonPage.selectValueInDropdown(addArticleModal.categoryDropdown, categoryName);
      await commonPage.selectValueInDropdown(addArticleModal.subcategoryDropdown, subCategory);
      await commonPage.fillFieldWithPlaceholder(addArticleModal.pasteLinkPlaceholder, videoUrl);
      await documentationPage.fillArticleText(articleText);
    });

    await test.step('Click preview and verify content', async () => {
      await documentationPage.clickPreviewButton();
      expect(await commonPage.inputWithPlaceholder(addArticleModal.articleTitlePlaceholder).inputValue()).toBe(articleTitle);
      expect(await documentationPage.articlePreviewData.textContent()).toContain(articleText);
      expect(await documentationPage.getVideoUrl()).toBe(videoUrl);
    });

    await test.step('Click "Save as a draft" and verify alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.saveAsDraft);
      await expect(commonPage.popUp).toHaveText(articlesData.articleCreatedAlert);
    });

    await test.step('Navigate back to documentation and open category', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
    });

    await test.step('Verify article data in table', async () => {
      await expect(commonPage.tableData).toHaveCount(1);
      const currentDate = generateFormattedDate();
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.lastEdit]: currentDate,
        [appData.articleTableData.status]: appData.statuses.draft,
        [appData.articleTableData.performance]: '0',
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });

    await test.step('Open more button for article and click "Edit" button', async () => {
      await commonPage.openMoreMenu(articleTitle);
      await commonPage.selectAction(appData.actions.edit);
      await documentationPage.waitForBreadcrumbLoaded();
    });

    await test.step('Verify breadcrumb shows article title', async () => {
      const breadcrumbPath = await commonPage.getBreadcrumbPath();
      expect(breadcrumbPath).toEqual([appData.pages.documentation, categoryName, articleTitle]);
    });

    await test.step('Click "Publish" button and check updated alert', async () => {
      await documentationPage.clickButtonOnPage(articlesData.publish);
      await expect(commonPage.popUp).toHaveText(articlesData.articleUpdatedAlert);
    });

    await test.step('Navigate back and check article status changed to "Published"', async () => {
      await navPagePage.openNavMenuTab(appData.pages.documentation);
      await documentationPage.openCategory(categoryName);
      const columnsToCheck = {
        [appData.articleTableData.articleName]: articleTitle,
        [appData.articleTableData.status]: appData.statuses.published,
      };
      await commonPage.checkRowValues(1, columnsToCheck);
    });
  });
});
