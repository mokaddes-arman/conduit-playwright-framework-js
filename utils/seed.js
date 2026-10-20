import { registerUser, loginUser, createArticle, deleteArticle, followUser, favoriteArticle } from './api.js';
import { generateUser, generateArticle } from './testData.js';

/**
 * Create a secondary actor: a fresh user who optionally authors one article.
 *
 * Tests need a NON-self author/article because the UI hides the favorite and
 * follow controls on your own content. Seeding an actor keeps the suite free of
 * any backend-specific seed data (works from .env alone).
 */
export async function createActor(request, { withArticle = false, tagList = [] } = {}) {
  const creds = generateUser();
  await registerUser(request, creds);
  // Log in for a token that is valid on any Conduit backend.
  const { body } = await loginUser(request, creds);
  const token = body.user.token;

  let article = null;
  if (withArticle) {
    const res = await createArticle(request, token, generateArticle({ tagList }));
    article = res.body.article;
  }
  return { ...creds, token, article };
}

/** Best-effort cleanup so repeated runs do not pile up articles. */
export async function destroyActor(request, token, article) {
  if (article?.slug) await deleteArticle(request, token, article.slug);
}
/** Follow/unfollow or favorite/unfavorite as the given user (API precondition). */
export const follow = (request, token, username, on = 'POST') => followUser(request, token, username, on);
export const favorite = (request, token, slug, on = 'POST') => favoriteArticle(request, token, slug, on);
