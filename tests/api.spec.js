import { test, expect } from '@playwright/test';
import { generateUser, generateArticle, generateComment } from '../utils/testData.js';
import * as api from '../utils/api.js';
import { createActor, destroyActor } from '../utils/seed.js';
import { readSetupToken } from '../utils/auth.js';

// Conduit backends disagree on success codes (200/201/204), so assert the
// outcome class instead of a literal — keeps the suite working from .env alone.
const success = (status) => {
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(300);
};
const clientError = (status) => {
  expect(status).toBeGreaterThanOrEqual(400);
  expect(status).toBeLessThan(500);
};

test.describe('API', { tag: ['@regression', '@api'] }, () => {
  let token;

  test.beforeAll(() => {
    token = readSetupToken();
  });

  test.describe('Authentication', () => {
    test('registers a user and returns a login token', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'POST /users → POST /users/login' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const user = generateUser();
      const reg = await api.registerUser(request, user);
      success(reg.status);
      expect(reg.body.user.username).toBe(user.username);

      const login = await api.loginUser(request, user);
      success(login.status);
      expect(login.body.user.username).toBe(user.username);
      expect(login.body.user.token).toBeTruthy();
    });

    test('rejects invalid credentials', { annotation: [{ type: 'endpoint', description: 'POST /users/login' }, { type: 'status', description: '403' }] }, async ({ request }) => {
      const res = await api.loginUser(request, {
        email: 'nobody@nowhere.invalid',
        password: 'wrong-password',
      });
      clientError(res.status);
      expect(JSON.stringify(res.body)).toMatch(/invalid/i);
    });

    test('reads the current user and updates the bio', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'GET /user → PUT /user' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const me = await api.getCurrentUser(request, token);
      success(me.status);
      expect(me.body.user.username).toBeTruthy();

      const bio = `bio ${Date.now()}`;
      const upd = await api.updateCurrentUser(request, token, { bio });
      success(upd.status);
      expect(upd.body.user.bio).toBe(bio);
    });
  });

  test.describe('Articles', () => {
    test('manages an article through its full lifecycle', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'POST /articles → GET /articles/:slug → PUT /articles/:slug → DELETE /articles/:slug' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const seed = generateArticle();
      const created = await api.createArticle(request, token, { ...seed, tagList: [] });
      success(created.status);
      expect(created.body.article.title).toBe(seed.title);
      const slug = created.body.article.slug;

      try {
        const got = await api.getArticle(request, slug);
        success(got.status);
        expect(got.body.article.title).toBe(seed.title);

        // Update a non-title field so the slug stays stable.
        const upd = await api.updateArticle(request, token, slug, { description: 'updated description' });
        success(upd.status);
        expect(upd.body.article.description).toBe('updated description');
        expect(upd.body.article.slug).toBe(slug);
      } finally {
        success((await api.deleteArticle(request, token, slug)).status);
      }

      const gone = await api.getArticle(request, slug);
      expect(gone.status).toBe(404);
    });

    test('lists articles and tags', { annotation: [{ type: 'endpoint', description: 'GET /articles → GET /tags' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const list = await api.getArticles(request);
      success(list.status);
      expect(Array.isArray(list.body.articles)).toBe(true);

      const tags = await api.getTags(request);
      success(tags.status);
      expect(tags.body.tags.length).toBeGreaterThan(0);
    });

    test('favorites and unfavorites an article', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'POST /articles/:slug/favorite → DELETE /articles/:slug/favorite' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const actor = await createActor(request, { withArticle: true });
      try {
        const fav = await api.favoriteArticle(request, token, actor.article.slug, 'POST');
        success(fav.status);
        expect(fav.body.article.favorited).toBe(true);

        const unfav = await api.favoriteArticle(request, token, actor.article.slug, 'DELETE');
        success(unfav.status);
        expect(unfav.body.article.favorited).toBe(false);
      } finally {
        await destroyActor(request, actor.token, actor.article);
      }
    });
  });

  test.describe('Comments', () => {
    test('manages a comment through its full lifecycle', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'POST /articles/:slug/comments → GET /articles/:slug/comments → DELETE /articles/:slug/comments/:id' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const created = await api.createArticle(request, token, { ...generateArticle(), tagList: [] });
      const slug = created.body.article.slug;

      try {
        const comment = generateComment();
        const add = await api.addComment(request, token, slug, comment.body);
        success(add.status);
        const id = add.body.comment.id;

        const list = await api.getComments(request, slug, token);
        success(list.status);
        expect(list.body.comments.some((c) => c.id === id)).toBe(true);

        success((await api.deleteComment(request, token, slug, id)).status);

        const after = await api.getComments(request, slug, token);
        expect(after.body.comments.some((c) => c.id === id)).toBe(false);
      } finally {
        await api.deleteArticle(request, token, slug);
      }
    });
  });

  test.describe('Profiles & Follow', () => {
    test('follows and unfollows an author', { tag: '@smoke', annotation: [{ type: 'endpoint', description: 'GET /profiles/:username → POST /profiles/:username/follow → DELETE /profiles/:username/follow' }, { type: 'status', description: '200' }] }, async ({ request }) => {
      const actor = await createActor(request);
      const prof = await api.getProfile(request, actor.username, token);
      success(prof.status);
      expect(prof.body.profile.username).toBe(actor.username);

      const follow = await api.followUser(request, token, actor.username, 'POST');
      success(follow.status);
      expect(follow.body.profile.following).toBe(true);

      const unfollow = await api.followUser(request, token, actor.username, 'DELETE');
      success(unfollow.status);
      expect(unfollow.body.profile.following).toBe(false);
    });
  });
});
