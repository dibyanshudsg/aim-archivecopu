// Exercises the built web app against the CI-created local database only.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
assert.ok(process.env.TURSO_DATABASE_URL?.startsWith('file:'), 'Local fixture database required');
assert.equal(process.env.ADMIN_PASSWORD, 'synthetic-ci-only-password');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3134'], {
  cwd: path.join(root, 'apps/web'), stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', data => { logs = (logs + data).slice(-8000); });
child.stderr.on('data', data => { logs = (logs + data).slice(-8000); });
const exited = new Promise(resolve => child.once('close', resolve));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
const base = 'http://127.0.0.1:3134';
async function request(route) { return fetch(base + route, { signal: AbortSignal.timeout(5000) }); }
(async () => {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('Test server exited before readiness');
    try { const response = await request('/admin/login'); await response.arrayBuffer(); if (response.ok) { ready = true; break; } } catch { /* wait for startup */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Test server readiness timeout');
  for (const [route, status] of [['/',200],['/browse',200],['/search',200],['/bookmarks',200],['/api/magazines',200],['/api/issues',200],['/api/admin/auth/check',401],['/api/admin/issues',401],['/api/pdf/fixture.pdf',404],['/api/issues/missing/pdf',404]]) {
    const response = await request(route); assert.equal(response.status, status, route); await response.arrayBuffer();
  }
  const image = await request('/_next/image?url=%2Flogo.png&w=64&q=75');
  assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /^image\//); assert.ok((await image.arrayBuffer()).byteLength);
  console.log('PASS built Linux HTTP routes, authorization denial, retired PDF denial and native Sharp image optimization.');
})().catch(error => { console.error(error.message, logs); process.exitCode = 1; }).finally(async () => {
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  await exited; clearTimeout(timer);
});
