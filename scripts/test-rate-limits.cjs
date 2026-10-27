const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fromWeb } = require('./register-web-typescript.cjs');
const { readMigrations, applyMigrations } = require('./lib/turso-migrations.mjs');

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aim-rate-limits-'));
  const target = path.join(dir, 'rate.db');
  process.env.TURSO_DATABASE_URL = `file:${target.replace(/\\/g, '/')}`;
  process.env.ADMIN_SESSION_SECRET = 'isolated-rate-limit-test-secret-2026';
  const db = fromWeb('@libsql/client').createClient({ url: process.env.TURSO_DATABASE_URL });
  try {
    await applyMigrations(db, readMigrations());
    const { consumeRateLimit, clientAddress } = require('../apps/web/src/lib/rate-limit.ts');
    const first = { scope: 'test:account', identity: 'admin@example.test', capacity: 2, windowSeconds: 3600 };
    const second = { scope: 'test:ip', identity: '203.0.113.10', capacity: 10, windowSeconds: 3600 };
    assert.equal((await consumeRateLimit([first, second])).allowed, true);
    assert.equal((await consumeRateLimit([first, second])).allowed, true);
    const limited = await consumeRateLimit([first, second]);
    assert.equal(limited.allowed, false);
    assert.ok(limited.retryAfter > 0);
    // A denied multi-bucket request must not consume the still-available IP bucket.
    for (let i = 0; i < 8; i++) assert.equal((await consumeRateLimit([second])).allowed, true);
    assert.equal((await consumeRateLimit([second])).allowed, false);
    const rows = await db.execute('SELECT key_hash FROM rate_limit_buckets');
    assert.equal(rows.rows.length, 2);
    assert.ok(rows.rows.every(row => /^[a-f0-9]{64}$/.test(String(row.key_hash))));
    const simultaneous = await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit([{ scope: 'test:concurrent', identity: 'shared', capacity: 2, windowSeconds: 3600 }])));
    assert.equal(simultaneous.filter(result => result.allowed).length, 2);
    const request = new Request('http://localhost/', { headers: { 'x-forwarded-for': '203.0.113.25' } });
    assert.equal(clientAddress(request), '203.0.113.25');
    await db.execute({ sql: 'INSERT INTO admins(id,email,name,created_at,password_hash,role_id) VALUES(?,?,?,?,?,?)', args: ['viewer-1', 'viewer@example.test', 'Viewer', new Date().toISOString(), 'synthetic-hash', 'viewer'] });
    const { findAdminAccountByEmail } = require('../apps/web/src/lib/db/admin-accounts.ts');
    const viewer = await findAdminAccountByEmail('viewer@example.test');
    assert.equal(viewer.roleName, 'Viewer');
    assert.ok(viewer.permissions.includes('catalogue.view'));
    assert.ok(!viewer.permissions.includes('catalogue.edit'));
    // An audit failure must roll back account creation rather than leave an unlogged admin.
    await db.execute('DROP TABLE admin_audit_log');
    const { createAdminAccount } = require('../apps/web/src/lib/db/admin-accounts.ts');
    await assert.rejects(createAdminAccount({ name: 'Rollback Test', email: 'rollback@example.test', roleId: 'viewer', hash: 'synthetic-hash' }, 'actor'));
    assert.equal((await db.execute("SELECT count(*) AS n FROM admins WHERE email='rollback@example.test'")).rows[0].n, 0);
    console.log('PASS shared token buckets: multi-key limits, atomic denial, retry, HMAC keys, client address and audited account rollback.');
  } finally { db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
