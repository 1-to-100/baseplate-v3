import type { Page, Locator, FrameLocator } from '@playwright/test';
import { appData } from '@constants/text.constants';
import { CommonPage } from '@pages/common.page';
import { NavPagePage } from '@pages/navPage.page';
import { expect } from '@playwright/test';

const categoryModal = appData.documentationPageData.categoryModal;

export class DocumentationPage {
  readonly page: Page;
  readonly commonPage: CommonPage;
  readonly navPagePage: NavPagePage;
  readonly categoryCards: Locator;
  readonly buttonsOnPage: (name: string) => Locator;
  readonly moreButtonForCategory: (number: number) => Locator;
  readonly documentationDropdown: (name: string) => Locator;
  readonly documentationDropdownValue: (name: string) => Locator;
  readonly categoryByName: (name: string) => Locator;
  readonly categoryTitle: (name: string) => Locator;
  readonly categoryTitleByIndex: (index: number) => Locator;
  readonly categorySubCategory: (name: string) => Locator;
  readonly categoryArticlesCount: (name: string) => Locator;
  readonly categoryIcon: (name: string) => Locator;
  readonly selectedIconPath: Locator;
  readonly moreButtonForCategoryByName: (name: string) => Locator;
  readonly addNewCategoryButton: Locator;
  readonly saveSubcategoryButton: Locator;
  readonly noArticlesMessages: Locator;
  readonly deleteAllArticlesButton: Locator;
  readonly articleTextEditor: Locator;
  readonly articlePreviewData: Locator;
  readonly previewButton: Locator;
  readonly videoIframe: FrameLocator;
  readonly videoContainer: Locator;
  readonly breadcrumbSelector: string;

  constructor(page: Page) {
    this.page = page;
    this.commonPage = new CommonPage(page);
    this.navPagePage = new NavPagePage(page);
    this.categoryCards = page.locator('.MuiCard-root');
    this.buttonsOnPage = (name: string) => page.locator('.MuiButton-sizeMd').getByText(name);
    this.moreButtonForCategory = (number: number) => this.categoryCards.nth(number).locator('.MuiIconButton-variantPlain');
    this.documentationDropdown = (name: string) =>
      page.locator('.MuiTypography-body-sm').getByText(name, { exact: true }).locator('+ div');
    this.documentationDropdownValue = (name: string) => page.getByRole('option', { name });
    this.categoryByName = (name: string) => this.categoryCards.filter({ hasText: name });
    this.categoryTitle = (name: string) => this.categoryByName(name).locator('.MuiTypography-title-md');
    this.categoryTitleByIndex = (index: number) => this.categoryCards.nth(index).locator('.MuiTypography-title-md');
    this.categorySubCategory = (name: string) => this.categoryByName(name).locator('.MuiTypography-body-xs');
    this.categoryArticlesCount = (name: string) => this.categoryByName(name).locator('.MuiTypography-body-md').first();
    this.categoryIcon = (name: string) => this.categoryByName(name).locator('div > svg path');
    this.selectedIconPath = this.documentationDropdown(categoryModal.addIconDropdown).locator('.MuiStack-root path');
    this.moreButtonForCategoryByName = (name: string) => this.categoryByName(name).locator('.MuiIconButton-variantPlain');
    this.addNewCategoryButton = page.getByText(categoryModal.addNewCategory);
    this.saveSubcategoryButton = page.locator('svg[style*="cursor: pointer"]').first();
    this.noArticlesMessages = page.locator('main p.MuiTypography-body-md');
    this.deleteAllArticlesButton = page.locator('.MuiTypography-body-sm + button');
    this.articleTextEditor = page.locator('.tiptap p');
    this.articlePreviewData = page.locator('div.tiptap-preview');
    this.previewButton = page.locator('.MuiButton-sizeMd svg');
    this.videoIframe = page.frameLocator('iframe[title="YouTube video player"]');
    this.videoContainer = this.videoIframe.locator('link[rel="canonical"]');
    this.breadcrumbSelector = '.MuiBreadcrumbs-root .MuiBreadcrumbs-li';
  }

  async openMoreButtonForCategory(number: number): Promise<void> {
    await this.moreButtonForCategory(number).click();
  }

  async openMoreButtonForCategoryByName(name: string): Promise<void> {
    await this.moreButtonForCategoryByName(name).click();
  }

  async openDocumentationDetails(doc: number): Promise<void> {
    await this.categoryCards.nth(doc).click();
  }

  async clickButtonOnPage(button: string): Promise<void> {
    await this.buttonsOnPage(button).first().click();
  }

  async selectValueInDropdown(dropdown: string, value: string) {
    await this.documentationDropdown(dropdown).click();
    await this.documentationDropdownValue(value).scrollIntoViewIfNeeded();
    await this.documentationDropdownValue(value).click();
  }

  async selectSubcategory(name: string) {
    await this.documentationDropdown(categoryModal.subcategoryDropdown).click();
    const existingOption = this.documentationDropdownValue(name);
    if (await existingOption.isVisible()) {
      await existingOption.scrollIntoViewIfNeeded();
      await existingOption.click();
    } else {
      await this.addNewCategoryButton.click();
      await this.commonPage.fillFieldWithPlaceholder(categoryModal.newSubcategoryInput, name);
      await this.saveSubcategoryButton.click();
    }
  }

  async getSelectedIconPath(): Promise<string> {
    return (await this.selectedIconPath.getAttribute('d')) || '';
  }

  async fillArticleText(text: string): Promise<void> {
    await this.articleTextEditor.click();
    await this.articleTextEditor.fill(text);
  }

  async clickPreviewButton(): Promise<void> {
    await this.previewButton.click();
  }

  async openCategory(categoryName: string): Promise<void> {
    await this.categoryByName(categoryName).click();
  }

  async getVideoUrl(): Promise<string> {
    return (await this.videoContainer.getAttribute('href')) || '';
  }

  async waitForBreadcrumbLoaded(): Promise<void> {
    await this.commonPage.breadcrumbItems.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(2000);
    const count = await this.commonPage.breadcrumbItems.count();
    for (let i = 0; i < count; i++) {
      const text = await this.commonPage.breadcrumbItems.nth(i).textContent();
      if (text && text.includes(appData.articlesPageData.loadingText)) {
        await this.page.waitForTimeout(2000);
        break;
      }
    }
  }

  async deleteAllArticlesInCategory(categoryName: string): Promise<void> {
    const articlesCount = await this.getArticlesCount(categoryName);
    if (articlesCount === 0) {
      return;
    }

    await this.openCategory(categoryName);

    try {
      await this.commonPage.tableData.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      return;
    }

    const tableRowsCount = await this.commonPage.tableData.count();
    if (tableRowsCount === 0) {
      return;
    }

    await this.commonPage.selectAllItemsInTable.click();
    await this.deleteAllArticlesButton.click();
    await this.commonPage.clickButtonInModal(appData.articlesPageData.deleteArticleModal.articleDeleteButton);
    await expect(this.commonPage.popUp.first()).toHaveText(appData.articlesPageData.deleteArticleModal.articleDeletedAlert);

    await this.page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 0, { timeout: 15000 });
  }

  async deleteAllCategories(): Promise<void> {
    const categoriesCount = await this.categoryCards.count();
    if (categoriesCount === 0) return;

    const categoryNames = await this.getCategoryNames();

    for (const categoryName of categoryNames) {
      const articlesCount = await this.getArticlesCount(categoryName);

      if (articlesCount > 0) {
        await this.deleteAllArticlesInCategory(categoryName);
        await this.navPagePage.openNavMenuTab(appData.pages.documentation);
        await this.categoryCards.first().waitFor({ state: 'visible', timeout: 10000 });
        await this.waitForArticlesCountToUpdate(categoryName, 0);
      }

      await this.deleteCategory(categoryName);
    }
  }

  private async getCategoryNames(): Promise<string[]> {
    const categoryNames: string[] = [];
    const categoriesCount = await this.categoryCards.count();

    for (let i = 0; i < categoriesCount; i++) {
      const categoryName = await this.categoryTitleByIndex(i).textContent();
      if (categoryName) {
        categoryNames.push(categoryName);
      }
    }

    return categoryNames;
  }

  private async getArticlesCount(categoryName: string): Promise<number> {
    try {
      const categoryElement = this.categoryByName(categoryName);
      const isVisible = await categoryElement.isVisible();
      if (!isVisible) return 0;

      const articlesCountText = await this.categoryArticlesCount(categoryName).textContent();
      if (!articlesCountText) return 0;

      const match = articlesCountText.match(/\d+/);
      if (!match) return 0;

      const count = parseInt(match[0]);
      return Number.isNaN(count) ? 0 : count;
    } catch {
      return 0;
    }
  }

  private async waitForArticlesCountToUpdate(categoryName: string, expectedCount: number): Promise<void> {
    await this.page.waitForTimeout(1000);

    for (let i = 0; i < 6; i++) {
      const currentCount = await this.getArticlesCount(categoryName);
      if (currentCount === expectedCount) {
        return;
      }
      await this.page.waitForTimeout(300);
    }
  }

  private async deleteCategory(categoryName: string): Promise<void> {
    await this.openMoreButtonForCategoryByName(categoryName);
    await this.commonPage.selectAction(appData.actions.delete);
    await this.commonPage.clickButtonInModal(appData.documentationPageData.deleteCategoryModal.confirmDeleteButton);
    await expect(this.commonPage.popUp.first()).toHaveText(
      appData.documentationPageData.deleteCategoryModal.categoryDeletedAlert,
    );
    await this.moreButtonForCategoryByName(categoryName).waitFor({ state: 'hidden', timeout: 15000 });
  }
}
