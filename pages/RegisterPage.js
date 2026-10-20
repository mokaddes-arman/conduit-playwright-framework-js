export class RegisterPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('[formcontrolname="username"]');
    this.emailInput = page.locator('[formcontrolname="email"]');
    this.passwordInput = page.locator('[formcontrolname="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessages = page.locator('.error-messages li');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register({ username, email, password }) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async submitEmpty() {
    await this.submitButton.click();
  }
}
