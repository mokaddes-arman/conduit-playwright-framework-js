import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage.js';
import { generateArticle } from '../utils/testData.js';
import { createArticle, deleteArticle, followUser, getTags, getArticles } from '../utils/api.js';
import { createActor, destroyActor } from '../utils/seed.js';
import { readSetupToken } from '../utils/auth.js';

// Tags are discovered from the API so the tests carry no backend-specific data.
async function pickTagWithArticles(request) {
  const { body } = await getTags(request);
  for (const tag of body.tags) {
    const { body: res } = await getArticles(request, { tag });
    if (res.articlesCount > 0) return tag;
  }
  throw new Error('backend exposes no tag with articles');
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Feeds', { tag: '@regression' }, () => {
  let token;

  test.beforeAll(async () => {
    token = readSetupToken();
  });

  test('shows a newly published article in the Global Feed', { tag: '@smoke' }, async ({ page, request }) => {
    // Seed one article so the check never depends on backend seed content.
    const created = await createArticle(request, token, generateArticle());
    try {
      const homePage = new HomePage(page);
      await homePage.goto();
      await expect(homePage.globalFeedTab).toHaveClass(/active/);
      await expect(homePage.articlePreviews.filter({ hasText: created.body.article.title }).first()).toBeVisible();
    } finally {
      await deleteArticle(request, token, created.body.article.slug);
    }
  });

  test('filters the feed by a selected tag', { tag: '@smoke' }, async ({ page, request }) => {
    const tag = await pickTagWithArticles(request);
    const tagText = new RegExp(`^\\s*${escapeRegExp(tag)}\\s*$`);

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.clickTag(tag);

    // Filtering happens in place: the tag tab becomes the active feed tab.
    await expect(homePage.activeFeedTab).toHaveText(tagText);
    // The feed refreshes a couple of times while settling, so poll until the
    // list is stable with every preview carrying the selected tag.
    await expect
      .poll(
        async () => {
          const total = await homePage.getArticleCount();
          if (total === 0) return false;
          const tagged = await homePage.articlePreviews.filter({
            has: page.locator('.tag-list li', { hasText: tagText }),
          }).count();
          return tagged === total;
        },
        { timeout: 10000 }
      )
      .toBe(true);
  });

  test('clears the tag filter when switching back to Global Feed', async ({ page, request }) => {
    const tag = await pickTagWithArticles(request);
    const tagText = new RegExp(`^\\s*${escapeRegExp(tag)}\\s*$`);

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.clickTag(tag);
    await expect(homePage.activeFeedTab).toHaveText(tagText);

    await homePage.gotoGlobalFeed();
    // The app leaves an empty tab with the active class behind, so assert on
    // the explicit tabs instead of "the single active tab".
    await expect(homePage.globalFeedTab).toHaveClass(/active/);
    await expect(homePage.feedTabs.filter({ hasText: tagText })).toHaveCount(0);
  });

  test('shows a followed author in Your Feed', { tag: '@smoke' }, async ({ page, request }) => {
    const homePage = new HomePage(page);
    // Follow a freshly seeded author, then check the feed reflects it.
    const actor = await createActor(request, { withArticle: true });
    try {
      await followUser(request, token, actor.username, 'POST');
      await homePage.goto();
      await homePage.gotoYourFeed();
      await expect(homePage.yourFeedTab).toHaveClass(/active/);
      await expect(homePage.articlePreviews.filter({ hasText: actor.article.title }).first()).toBeVisible();
    } finally {
      await followUser(request, token, actor.username, 'DELETE');
      await destroyActor(request, actor.token, actor.article);
    }
  });

  test('paginates the Global Feed', async ({ page, request }) => {
    const homePage = new HomePage(page);
    // Seed enough fresh articles to guarantee a second page.
    const prefix = `PGSEED ${Date.now()}`;
    const slugs = [];
    try {
      for (let i = 0; i < 12; i++) {
        const res = await createArticle(request, token, generateArticle({ title: `${prefix} ${i}`, tagList: [] }));
        slugs.push(res.body.article.slug);
      }

      await homePage.goto();
      await expect(homePage.globalFeedTab).toHaveClass(/active/);
      await expect(homePage.pageTwoButton).toBeVisible();

      const pageOneFirst = await homePage.getPreviewTitle(0);
      await homePage.goToPage(2);

      // The second page becomes active and shows different content.
      await expect(homePage.pageTwoItem).toHaveClass(/active/);
      const pageTwoFirst = await homePage.getPreviewTitle(0);
      expect(pageTwoFirst).not.toBe(pageOneFirst);
    } finally {
      for (const slug of slugs) {
        await deleteArticle(request, token, slug);
      }
    }
  });
});
