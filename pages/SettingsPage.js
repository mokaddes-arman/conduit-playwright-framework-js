export class SettingsPage {
  constructor(page) {
    this.page = page;
    this.imageInput = page.locator('[formcontrolname="image"]');
    this.usernameInput = page.locator('[formcontrolname="username"]');
    this.bioInput = page.locator('[formcontrolname="bio"]');
    this.emailInput = page.locator('[formcontrolname="email"]');
    this.passwordInput = page.locator('[formcontrolname="password"]');
    this.updateButton = page.locator('button', { hasText: 'Update Settings' });
    this.errorMessages = page.locator('.error-messages li');
    this.logoutButton = page.locator('button.btn-outline-danger');
  }

  async goto() {
    await this.page.goto('/settings');
  }

  async updateSettings({ image, username, bio, email, password }) {
    if (image != null) await this.imageInput.fill(image);
    if (username != null) await this.usernameInput.fill(username);
    if (bio != null) await this.bioInput.fill(bio);
    if (email != null) await this.emailInput.fill(email);
    if (password != null) await this.passwordInput.fill(password);
    await this.updateButton.click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
