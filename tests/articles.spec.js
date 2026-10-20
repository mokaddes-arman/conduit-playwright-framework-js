import { test, expect } from '@playwright/test';
import { EditorPage } from '../pages/EditorPage.js';
import { ArticlePage } from '../pages/ArticlePage.js';
import { generateArticle } from '../utils/testData.js';
import { createArticle } from '../utils/api.js';
import { readSetupToken } from '../utils/auth.js';

test.describe('Articles', { tag: '@regression' }, () => {
  let token;

  test.beforeAll(async () => {
    token = readSetupToken();
  });

  test('publishes a new article and shows it after a reload', { tag: '@smoke' }, async ({ page }) => {
    const editorPage = new EditorPage(page);
    const articlePage = new ArticlePage(page);
    const article = generateArticle();

    await editorPage.goto();
    await editorPage.fillForm(article);
    await editorPage.publish();

    await expect(page).toHaveURL(/\/article\/.+/);
    await expect(articlePage.title).toHaveText(article.title);
    await expect(articlePage.body).toContainText(article.body.split('\n')[0]);
    for (const tag of article.tagList) {
      await expect(articlePage.tags.filter({ hasText: tag })).toHaveCount(1);
    }

    // Re-navigate to confirm persistence, not just client-side state.
    await page.reload();
    await expect(articlePage.title).toHaveText(article.title);
    await expect(articlePage.body).toContainText(article.body.split('\n')[0]);
  });

  test('blocks publishing when required fields are empty', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.publish();
    await expect(page).toHaveURL(/\/editor/);
    await expect(editorPage.errorMessages).toContainText("title can't be blank");
  });

  test('edits an existing article and persists the change', { tag: '@smoke' }, async ({ page, request }) => {
    const editorPage = new EditorPage(page);
    const articlePage = new ArticlePage(page);

    const seed = generateArticle();
    const created = (await createArticle(request, token, { ...seed, tagList: seed.tagList })).body.article;
    const updated = generateArticle();

    await editorPage.gotoEdit(created.slug);
    await expect(editorPage.titleInput).toHaveValue(created.title);
    await editorPage.fillForm(updated);
    await editorPage.publish();

    await expect(page).toHaveURL(/\/article\/.+/);
    await expect(articlePage.title).toHaveText(updated.title);

    await page.reload();
    await expect(articlePage.title).toHaveText(updated.title);
  });

  test('keeps the original title when it is cleared on edit', async ({ page, request }) => {
    const editorPage = new EditorPage(page);
    const articlePage = new ArticlePage(page);

    const seed = generateArticle();
    const created = (await createArticle(request, token, { ...seed, tagList: seed.tagList })).body.article;

    await editorPage.gotoEdit(created.slug);
    await expect(editorPage.titleInput).toHaveValue(created.title);
    await editorPage.titleInput.fill('');
    await editorPage.publish();

    // The backend ignores an empty title on update: the save succeeds and the
    // article keeps its original title.
    await expect(page).toHaveURL(`/article/${created.slug}`);
    await expect(articlePage.title).toHaveText(created.title);

    await page.reload();
    await expect(articlePage.title).toHaveText(created.title);
  });

  test('deletes an article and stops serving its URL', { tag: '@smoke' }, async ({ page, request }) => {
    const articlePage = new ArticlePage(page);
    const seed = generateArticle();
    const created = (await createArticle(request, token, { ...seed, tagList: seed.tagList })).body.article;

    await articlePage.goto(created.slug);
    await expect(articlePage.title).toHaveText(created.title);

    await articlePage.clickDelete();
    await expect(page).toHaveURL('/');

    // The deleted article no longer resolves (app redirects home on 404).
    await page.goto(`/article/${created.slug}`);
    await expect(page).toHaveURL('/');
  });

  test('views an article with its author, date and tags', async ({ page, request }) => {
    const articlePage = new ArticlePage(page);
    const seed = generateArticle();
    const created = (await createArticle(request, token, { ...seed, tagList: seed.tagList })).body.article;

    await articlePage.goto(created.slug);
    await expect(articlePage.title).toHaveText(created.title);
    await expect(articlePage.authorLink).toBeVisible();
    await expect(articlePage.date).toBeVisible();
    for (const tag of seed.tagList) {
      await expect(articlePage.tags.filter({ hasText: tag })).toHaveCount(1);
    }
  });
});
