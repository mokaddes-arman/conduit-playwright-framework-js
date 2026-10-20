import { test, expect } from '@playwright/test';
import { SettingsPage } from '../pages/SettingsPage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { generateSettings } from '../utils/testData.js';
import { readSetupAuth } from '../utils/auth.js';

test.describe('Profile & Settings', { tag: '@regression' }, () => {
  let auth;

  test.beforeAll(() => {
    auth = readSetupAuth();
  });

  test('updates the profile bio and avatar', { tag: '@smoke' }, async ({ page }) => {
    const settings = generateSettings();
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.updateSettings({ bio: settings.bio, image: settings.image });

    // Redirected to the profile and the changes are shown.
    await expect(page).toHaveURL(/\/profile\//);
    const profilePage = new ProfilePage(page);
    await expect(profilePage.username).toHaveText(auth.username);
    await expect(profilePage.bio).toHaveText(settings.bio);
    await expect(profilePage.profileImage).toHaveAttribute('src', settings.image);

    // Persisted after a reload.
    await page.reload();
    await expect(profilePage.bio).toHaveText(settings.bio);
    await expect(profilePage.profileImage).toHaveAttribute('src', settings.image);
  });

  test('shows the owner controls on your own profile', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto(auth.username);

    await expect(profilePage.username).toHaveText(auth.username);
    await expect(profilePage.editSettingsLink).toBeVisible();
    await expect(profilePage.myPostsTab).toHaveClass(/active/);
    await expect(profilePage.favoritedTab).toBeVisible();
  });

  test('ignores an empty username on save', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.usernameInput.fill('');
    await settingsPage.updateButton.click();

    // The backend ignores an empty username: we land on the profile and the
    // username is unchanged rather than blanked out.
    await expect(page).toHaveURL(/\/profile\//);
    const profilePage = new ProfilePage(page);
    await expect(profilePage.username).toHaveText(auth.username);
  });
});
