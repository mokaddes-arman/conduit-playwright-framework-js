export class ArticlePage {
  constructor(page) {
    this.page = page;
    this.title = page.locator('.banner h1');
    this.body = page.locator('.article-content');
    this.tags = page.locator('.tag-list li');
    this.editButton = page.locator('a', { hasText: 'Edit Article' }).first();
    this.deleteButton = page.locator('button', { hasText: 'Delete Article' }).first();
    this.authorLink = page.locator('a.author').first();
    this.date = page.locator('span.date').first();
    this.favoriteButton = page.locator('app-favorite-button button').first();
    this.commentInput = page.locator('textarea[placeholder="Write a comment..."]');
    this.postCommentButton = page.locator('button', { hasText: 'Post Comment' });
    this.comments = page.locator('app-article-comment');
  }

  async goto(slug) {
    await this.page.goto(`/article/${slug}`);
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async clickFavorite() {
    await this.favoriteButton.click();
  }

  async getFavoriteButtonText() {
    return (await this.favoriteButton.innerText()).replace(/\s+/g, ' ').trim();
  }

  async isFavorited() {
    return (await this.favoriteButton.getAttribute('class')).includes('btn-primary');
  }

  async getFavoriteCount() {
    const text = await this.favoriteButton.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async addComment(body) {
    await this.commentInput.fill(body);
    await this.postCommentButton.click();
  }

  async getCommentCount() {
    return this.comments.count();
  }

  commentByText(body) {
    return this.comments.filter({ hasText: body });
  }

  async deleteComment(body) {
    await this.commentByText(body).locator('.mod-options i.ion-trash-a').click();
  }
}
