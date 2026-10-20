export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('[formcontrolname="email"]');
    this.passwordInput = page.locator('[formcontrolname="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessages = page.locator('.error-messages li');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async isErrorVisible() {
    return this.errorMessages.first().isVisible();
  }
}
