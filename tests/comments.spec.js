import { test, expect } from '@playwright/test';
import { ArticlePage } from '../pages/ArticlePage.js';
import { generateArticle, generateComment } from '../utils/testData.js';
import { createArticle } from '../utils/api.js';
import { readSetupToken } from '../utils/auth.js';

test.describe('Comments', { tag: '@regression' }, () => {
  let token;
  let slug;

  test.beforeAll(async () => {
    token = readSetupToken();
  });

  // Each test works on a freshly created article so comment state is isolated.
  test.beforeEach(async ({ request }) => {
    const seed = generateArticle();
    const res = await createArticle(request, token, { ...seed, tagList: [] });
    slug = res.body.article.slug;
  });

  test('adds a comment and keeps it after a reload', { tag: '@smoke' }, async ({ page }) => {
    const articlePage = new ArticlePage(page);
    const comment = generateComment();

    await articlePage.goto(slug);
    await articlePage.addComment(comment.body);

    await expect(articlePage.commentByText(comment.body)).toHaveCount(1);
    await page.reload();
    await expect(articlePage.commentByText(comment.body)).toHaveCount(1);
  });

  test('deletes a comment from an article', async ({ page }) => {
    const articlePage = new ArticlePage(page);
    const comment = generateComment();

    await articlePage.goto(slug);
    await articlePage.addComment(comment.body);
    await expect(articlePage.commentByText(comment.body)).toHaveCount(1);

    await articlePage.deleteComment(comment.body);
    await expect(articlePage.commentByText(comment.body)).toHaveCount(0);
    await page.reload();
    await expect(articlePage.commentByText(comment.body)).toHaveCount(0);
  });
});
