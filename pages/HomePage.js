export class HomePage {
  constructor(page) {
    this.page = page;
    this.feedTabs = page.locator('.feed-toggle .nav-link');
    this.yourFeedTab = page.locator('.feed-toggle .nav-link', { hasText: 'Your Feed' });
    this.globalFeedTab = page.locator('.feed-toggle .nav-link', { hasText: 'Global Feed' });
    this.activeFeedTab = page.locator('.feed-toggle .nav-link.active');
    this.articlePreviews = page.locator('.article-preview');
    this.sidebarTags = page.locator('.sidebar .tag-list a.tag-default.tag-pill');
    this.pageItems = page.locator('.pagination .page-item');
    this.pageTwoItem = page.locator('.pagination .page-item', { hasText: /^\s*2\s*$/ });
    // The li itself is display:inline with a 0x0 box; only the button is visible.
    this.pageTwoButton = this.pageTwoItem.locator('button');
  }

  async goto() {
    await this.page.goto('/');
  }

  async gotoTag(tag) {
    await this.page.goto(`/tag/${tag}`);
  }

  async clickTag(tag) {
    await this.sidebarTags.filter({ hasText: new RegExp(`^\\s*${tag}\\s*$`) }).click();
  }

  async gotoYourFeed() {
    await this.yourFeedTab.click();
  }

  async gotoGlobalFeed() {
    await this.globalFeedTab.click();
  }

  async getArticleCount() {
    return this.articlePreviews.count();
  }

  preview(index) {
    return this.articlePreviews.nth(index);
  }

  async getPreviewTitle(index) {
    return (await this.articlePreviews.nth(index).locator('.preview-link').innerText()).trim();
  }

  async goToPage(pageNumber) {
    await this.pageItems
      .filter({ hasText: new RegExp(`^\\s*${pageNumber}\\s*$`) })
      .locator('button')
      .click();
  }

  async isPaginationVisible() {
    return this.pageTwoButton.isVisible();
  }
}
