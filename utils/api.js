const API_BASE_URL = process.env.API_BASE_URL;

const json = (data) => ({ headers: { 'Content-Type': 'application/json' }, data });
const auth = (token) => ({ Authorization: `Token ${token}` });

export async function registerUser(request, { username, email, password }) {
  const res = await request.post(`${API_BASE_URL}/users`, json({ user: { username, email, password } }));
  return { status: res.status(), body: await res.json() };
}

export async function loginUser(request, { email, password }) {
  const res = await request.post(`${API_BASE_URL}/users/login`, json({ user: { email, password } }));
  return { status: res.status(), body: await res.json() };
}

export async function getCurrentUser(request, token) {
  const res = await request.get(`${API_BASE_URL}/user`, { headers: auth(token) });
  return { status: res.status(), body: await res.json() };
}

export async function updateCurrentUser(request, token, user) {
  const res = await request.put(`${API_BASE_URL}/user`, { headers: { ...auth(token), 'Content-Type': 'application/json' }, data: { user } });
  return { status: res.status(), body: await res.json() };
}

export async function getProfile(request, username, token) {
  const res = await request.get(`${API_BASE_URL}/profiles/${username}`, token ? { headers: auth(token) } : {});
  return { status: res.status(), body: await res.json() };
}

export async function followUser(request, token, username, method = 'POST') {
  const res = await request.fetch(`${API_BASE_URL}/profiles/${username}/follow`, { method, headers: auth(token) });
  return { status: res.status(), body: await res.json() };
}

export async function createArticle(request, token, article) {
  const res = await request.post(`${API_BASE_URL}/articles`, { headers: { ...auth(token), 'Content-Type': 'application/json' }, data: { article } });
  return { status: res.status(), body: await res.json() };
}

export async function getArticle(request, slug, token) {
  const res = await request.get(`${API_BASE_URL}/articles/${slug}`, token ? { headers: auth(token) } : {});
  return { status: res.status(), body: await res.json() };
}

export async function updateArticle(request, token, slug, article) {
  const res = await request.put(`${API_BASE_URL}/articles/${slug}`, { headers: { ...auth(token), 'Content-Type': 'application/json' }, data: { article } });
  return { status: res.status(), body: await res.json() };
}

export async function deleteArticle(request, token, slug) {
  const res = await request.delete(`${API_BASE_URL}/articles/${slug}`, { headers: auth(token) });
  return { status: res.status() };
}

export async function favoriteArticle(request, token, slug, method = 'POST') {
  const res = await request.fetch(`${API_BASE_URL}/articles/${slug}/favorite`, { method, headers: auth(token) });
  return { status: res.status(), body: await res.json() };
}

export async function addComment(request, token, slug, body) {
  const res = await request.post(`${API_BASE_URL}/articles/${slug}/comments`, { headers: { ...auth(token), 'Content-Type': 'application/json' }, data: { comment: { body } } });
  return { status: res.status(), body: await res.json() };
}

export async function getComments(request, slug, token) {
  const res = await request.get(`${API_BASE_URL}/articles/${slug}/comments`, token ? { headers: auth(token) } : {});
  return { status: res.status(), body: await res.json() };
}

export async function deleteComment(request, token, slug, commentId) {
  const res = await request.delete(`${API_BASE_URL}/articles/${slug}/comments/${commentId}`, { headers: auth(token) });
  return { status: res.status() };
}

export async function getArticles(request, params = {}, token) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/articles${query ? `?${query}` : ''}`;
  const res = await request.get(url, token ? { headers: auth(token) } : {});
  return { status: res.status(), body: await res.json() };
}

export async function getFeed(request, token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/articles/feed${query ? `?${query}` : ''}`;
  const res = await request.get(url, { headers: auth(token) });
  return { status: res.status(), body: await res.json() };
}

export async function getTags(request) {
  const res = await request.get(`${API_BASE_URL}/tags`);
  return { status: res.status(), body: await res.json() };
}
