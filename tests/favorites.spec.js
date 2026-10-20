import { test, expect } from '@playwright/test';
import { ArticlePage } from '../pages/ArticlePage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { createActor, destroyActor } from '../utils/seed.js';
import { favoriteArticle, getArticles } from '../utils/api.js';
import { readSetupAuth } from '../utils/auth.js';

test.describe('Favorites', { tag: '@regression' }, () => {
  let auth;

  test.beforeAll(() => {
    auth = readSetupAuth();
  });

  test('favorites an article and toggles the counter', { tag: '@smoke' }, async ({ page, request }) => {
    // The UI only shows the favorite control on articles you do NOT author,
    // so favorite an article belonging to a freshly seeded actor.
    const actor = await createActor(request, { withArticle: true });
    try {
      const articlePage = new ArticlePage(page);
      await articlePage.goto(actor.article.slug);
      await expect(articlePage.favoriteButton).toBeVisible();
      expect(await articlePage.isFavorited()).toBe(false);
      const initial = await articlePage.getFavoriteCount();

      await articlePage.clickFavorite();
      await expect
        .poll(async () => articlePage.isFavorited(), { timeout: 5000 })
        .toBe(true);
      expect(await articlePage.getFavoriteCount()).toBe(initial + 1);

      await articlePage.clickFavorite();
      await expect
        .poll(async () => articlePage.isFavorited(), { timeout: 5000 })
        .toBe(false);
      expect(await articlePage.getFavoriteCount()).toBe(initial);
    } finally {
      await destroyActor(request, actor.token, actor.article);
    }
  });

  test('lists a favorited article under Favorited Posts', async ({ page, request }) => {
    // The favorites list only contains articles already in the backend index,
    // so pick one at runtime instead of favoriting a freshly created article.
    const { body } = await getArticles(request);
    const article = body.articles[0];
    await favoriteArticle(request, auth.token, article.slug, 'POST');
    try {
      const profilePage = new ProfilePage(page);
      await profilePage.gotoFavorites(auth.username);
      await expect(profilePage.favoritedTab).toHaveClass(/active/);
      await expect(
        profilePage.articlePreviews.filter({ hasText: article.title }).first()
      ).toBeVisible();
    } finally {
      await favoriteArticle(request, auth.token, article.slug, 'DELETE');
    }
  });
});
