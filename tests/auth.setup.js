import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateUser } from '../utils/testData.js';
import { AUTH_FILE, TOKEN_FILE } from '../utils/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.dirname(AUTH_FILE);

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });

  const user = generateUser();
  await page.goto('/register');
  await page.locator('[formcontrolname="username"]').fill(user.username);
  await page.locator('[formcontrolname="email"]').fill(user.email);
  await page.locator('[formcontrolname="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();

  // Registration redirects to the home page as an authenticated user.
  await expect(page).toHaveURL('/');
  await expect(page.locator('.navbar a', { hasText: user.username })).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });

  const token = await page.evaluate(() => window.localStorage.getItem('jwtToken'));
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, username: user.username, email: user.email, password: user.password }));
});
