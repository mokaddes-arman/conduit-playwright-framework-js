import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/ProfilePage.js';
import { createActor } from '../utils/seed.js';
import { followUser } from '../utils/api.js';
import { readSetupToken } from '../utils/auth.js';

test.describe('Follow', { tag: '@regression' }, () => {
  let token;

  test.beforeAll(() => {
    token = readSetupToken();
  });

  test('follows an author and toggles the follow state', { tag: '@smoke' }, async ({ page, request }) => {
    // Follow a freshly seeded author so the test never depends on a specific
    // backend's seed accounts.
    const actor = await createActor(request);
    // Normalize to a not-following starting state.
    await followUser(request, token, actor.username, 'DELETE');

    const profilePage = new ProfilePage(page);
    await profilePage.goto(actor.username);
    await expect(profilePage.followButton).toBeVisible();
    await expect(profilePage.followButton).toHaveText(new RegExp(`Follow\\s+${actor.username}`));
    expect(await profilePage.isFollowing()).toBe(false);

    await profilePage.clickFollow();
    await expect
      .poll(async () => profilePage.isFollowing(), { timeout: 5000 })
      .toBe(true);
    await expect(profilePage.followButton).toHaveText(new RegExp(`Unfollow\\s+${actor.username}`));

    await profilePage.clickFollow();
    await expect
      .poll(async () => profilePage.isFollowing(), { timeout: 5000 })
      .toBe(false);
    await expect(profilePage.followButton).toHaveText(new RegExp(`Follow\\s+${actor.username}`));
  });
});
