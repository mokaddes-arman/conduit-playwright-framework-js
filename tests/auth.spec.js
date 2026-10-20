import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';
import { generateUser } from '../utils/testData.js';
import { registerUser } from '../utils/api.js';
import { readSetupAuth } from '../utils/auth.js';

const loggedInNav = (page) => page.locator('.navbar a', { hasText: 'New Article' });
const loggedOutNav = (page) => page.locator('.navbar a', { hasText: 'Sign in' });

test.describe('Authentication', { tag: '@regression' }, () => {
  test.describe('Registration', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('registers a new account and signs the user in', { tag: '@smoke' }, async ({ page }) => {
      const user = generateUser();
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(user);
      await expect(page).toHaveURL('/');
      await expect(page.locator('.navbar a', { hasText: user.username })).toBeVisible();
    });

    test('disables the register button until the form is filled', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await expect(registerPage.submitButton).toBeDisabled();
    });

    test('rejects a malformed email address', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.usernameInput.fill('someuser');
      await registerPage.emailInput.fill('notanemail');
      await registerPage.passwordInput.fill('password123');
      await registerPage.submitButton.click();
      // The backend rejects the malformed email, staying on the register page.
      await expect(page).toHaveURL('/register');
      await expect(registerPage.errorMessages).toContainText('email is invalid');
    });

    test('rejects a duplicate username or email', async ({ page, request }) => {
      const existing = generateUser();
      await registerUser(request, existing);

      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(existing);
      // The backend enforces unique email/username, so re-registration fails
      // and we stay on the register page with an error.
      await expect(page).toHaveURL('/register');
      // Both username and email errors are rendered as separate <li> items.
      await expect(registerPage.errorMessages.first()).toContainText('already been taken');
    });
  });

  test.describe('Login', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('logs in with valid credentials', { tag: '@smoke' }, async ({ page }) => {
      const { email, password, username } = readSetupAuth();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      await expect(page).toHaveURL('/');
      await expect(page.locator('.navbar a', { hasText: username })).toBeVisible();
    });

    test('disables the login button until the form is filled', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await expect(loginPage.submitButton).toBeDisabled();
    });

    test('shows an error when the password is wrong', async ({ page }) => {
      const { email, username } = readSetupAuth();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, 'wrongpassword123');
      await expect(loginPage.errorMessages).toContainText('invalid');
      await expect(page).toHaveURL('/login');
      await expect(loggedOutNav(page)).toBeVisible();
    });
  });

  test.describe('Route protection', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects logged-out users away from the editor', { tag: '@smoke' }, async ({ page }) => {
      await page.goto('/editor');
      await expect(page).not.toHaveURL(/\/editor/);
      await expect(loggedOutNav(page)).toBeVisible();
    });

    test('redirects logged-out users away from settings', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).not.toHaveURL(/\/settings/);
      await expect(loggedOutNav(page)).toBeVisible();
    });
  });

  test.describe('Session', () => {
    test('logs the user out and ends the session', { tag: '@smoke' }, async ({ page }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();
      await expect(loggedInNav(page)).toBeVisible();
      await settingsPage.logout();
      await expect(page).toHaveURL('/');
      await expect(loggedOutNav(page)).toBeVisible();
    });

    test('keeps the session across a page reload', async ({ page }) => {
      await page.goto('/');
      await expect(loggedInNav(page)).toBeVisible();
      await page.reload();
      await expect(loggedInNav(page)).toBeVisible();
      await expect(loggedOutNav(page)).toHaveCount(0);
    });
  });
});
