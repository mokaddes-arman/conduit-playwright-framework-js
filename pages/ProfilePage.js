export class ProfilePage {
  constructor(page) {
    this.page = page;
    this.username = page.locator('.user-info h4');
    this.bio = page.locator('.user-info p');
    this.profileImage = page.locator('.user-info img.user-img');
    this.followButton = page.locator('button.action-btn');
    this.editSettingsLink = page.locator('a.action-btn', { hasText: 'Edit Profile Settings' });
    this.myPostsTab = page.locator('.articles-toggle .nav-link', { hasText: 'My Posts' });
    this.favoritedTab = page.locator('.articles-toggle .nav-link', { hasText: 'Favorited Posts' });
    this.articlePreviews = page.locator('.article-preview');
  }

  async goto(username) {
    await this.page.goto(`/profile/${username}`);
  }

  async gotoFavorites(username) {
    await this.page.goto(`/profile/${username}/favorites`);
  }

  async clickFollow() {
    await this.followButton.click();
  }

  async getFollowButtonText() {
    return (await this.followButton.innerText()).replace(/\s+/g, ' ').trim();
  }

  async isFollowing() {
    return (await this.getFollowButtonText()).includes('Unfollow');
  }

  async getArticleCount() {
    return this.articlePreviews.count();
  }
}
