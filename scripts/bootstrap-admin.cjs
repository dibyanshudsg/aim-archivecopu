#!/usr/bin/env node
// Create the first Owner only in an explicitly selected, empty local database.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fromWeb } = require('./register-web-typescript.cjs');
const { hashAdminPassword } = require('../apps/web/src/lib/admin-password.ts');

async function main() {
  const args = process.argv.slice(2);
  const value = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]; };
  const local = value('--local'), email = value('--email'), name = value('--name');
  if (!local || !email || !name || args.length !== 6 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Usage: node scripts/bootstrap-admin.cjs --local PATH --email ADDRESS --name NAME');
  const target = path.resolve(local);
  if (!fs.existsSync(target)) throw new Error('Selected local database does not exist; apply migrations first.');
  const db = fromWeb('@libsql/client').createClient({ url: `file:${target.replace(/\\/g, '/')}` });
  try {
    const tables = await db.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('admins','admin_roles')");
    if (tables.rows.length !== 2) throw new Error('Admin roles migration is required.');
    const existing = await db.execute('SELECT count(*) AS count FROM admins');
    if (Number(existing.rows[0].count) !== 0) throw new Error('Bootstrap is only allowed before the first admin exists.');
    const password = crypto.randomBytes(24).toString('base64url');
    const hash = await hashAdminPassword(password);
    await db.execute({ sql: 'INSERT INTO admins (id,email,name,created_at,password_hash,role_id,is_active,session_version,must_change_password,temporary_password_expires_at) VALUES (?,?,?,?,?,\'owner\',1,0,1,?)', args: [crypto.randomUUID(), email.toLowerCase(), name, new Date().toISOString(), hash, new Date(Date.now() + 86400000).toISOString()] });
    console.log(`First Owner created in selected local database.\nEmail: ${email.toLowerCase()}\nTemporary password: ${password}\nChange this password within 24 hours. This output is shown once.`);
  } finally { db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
