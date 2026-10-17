const assert = require('node:assert/strict');

const base = process.env.ADMIN_PREVIEW_URL || 'http://localhost:3001';
const firstPassword = process.env.ADMIN_PREVIEW_PASSWORD;
if (!firstPassword) throw new Error('Set ADMIN_PREVIEW_PASSWORD for the isolated preview account.');

async function call(path, method = 'GET', data, cookie) {
  const response = await fetch(base + path, {
    method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { Origin: base } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: data ? JSON.stringify(data) : undefined, redirect: 'manual',
  });
  const result = await response.json().catch(() => ({}));
  return { response, result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

(async () => {
  assert.equal((await call('/api/admin/users')).response.status, 401);
  let login = await call('/api/admin/auth', 'POST', { email: 'owner@preview.test', password: firstPassword });
  assert.equal(login.response.status, 200);
  assert.equal(login.result.mustChangePassword, true);
  assert.equal((await call('/api/admin/users', 'GET', undefined, login.cookie)).response.status, 403);
  const password = 'LocalPreviewOwnerChanged2026!';
  const changed = await call('/api/admin/password', 'POST', { currentPassword: firstPassword, newPassword: password }, login.cookie);
  assert.equal(changed.response.status, 200);
  assert.equal((await call('/api/admin/users', 'GET', undefined, login.cookie)).response.status, 401);
  login = await call('/api/admin/auth', 'POST', { email: 'owner@preview.test', password });
  assert.equal(login.response.status, 200);
  const ownerCookie = login.cookie;
  assert.equal((await call('/api/admin/users', 'GET', undefined, ownerCookie)).response.status, 200);
  const role = await call('/api/admin/roles', 'POST', { name: 'Preview reviewer', description: 'Read catalogue only', permissions: ['catalogue.view'] }, ownerCookie);
  assert.equal(role.response.status, 201);
  const created = await call('/api/admin/users', 'POST', { name: 'Preview Reviewer', email: 'reviewer@preview.test', roleId: role.result.id }, ownerCookie);
  assert.equal(created.response.status, 201);
  const reviewerLogin = await call('/api/admin/auth', 'POST', { email: 'reviewer@preview.test', password: created.result.temporaryPassword });
  assert.equal(reviewerLogin.response.status, 200);
  assert.equal((await call('/api/admin/issues', 'GET', undefined, reviewerLogin.cookie)).response.status, 401);
  const reviewerPassword = await call('/api/admin/password', 'POST', { currentPassword: created.result.temporaryPassword, newPassword: 'LocalPreviewReviewer2026!' }, reviewerLogin.cookie);
  assert.equal(reviewerPassword.response.status, 200);
  const reviewer = await call('/api/admin/auth', 'POST', { email: 'reviewer@preview.test', password: 'LocalPreviewReviewer2026!' });
  assert.equal(reviewer.response.status, 200);
  assert.equal((await call('/api/admin/issues', 'GET', undefined, reviewer.cookie)).response.status, 200);
  assert.equal((await call('/api/admin/storage', 'DELETE', { key: 'nothing' }, reviewer.cookie)).response.status, 403);
  const revoke = await call(`/api/admin/users/${created.result.id}`, 'PATCH', { isActive: false }, ownerCookie);
  assert.equal(revoke.response.status, 200);
  assert.equal((await call('/api/admin/issues', 'GET', undefined, reviewer.cookie)).response.status, 401);
  assert.equal((await call('/api/admin/auth', 'POST', { email: 'reviewer@preview.test', password: 'LocalPreviewReviewer2026!' })).response.status, 401);
  console.log('PASS isolated admin preview: first sign-in, forced password change, old-session revocation, role/user creation, permission enforcement, deactivation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
