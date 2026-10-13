// Private P1-02 capture helper. Remote access is sync + read-only SQL only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@libsql/client');
const out = path.resolve(process.argv[2] || '');
if (!path.basename(out).startsWith('P1-02_turso_') ||
    path.dirname(out).toLowerCase() !== 'd:\\aim (project directory)') {
  throw new Error('Expected a newly protected P1-02 directory');
}
const env = {};
for (const line of fs.readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, '$2');
}
if (!env.TURSO_DATABASE_URL?.startsWith('libsql://') || !env.TURSO_AUTH_TOKEN) {
  throw new Error('Expected configured remote Turso source');
}
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const encode = (value) => {
  if (value === null) return ['null'];
  if (typeof value === 'bigint') return ['integer', value.toString()];
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return ['blob', Buffer.from(value instanceof ArrayBuffer ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).toString('hex')];
  return [typeof value, value];
};
async function inventory(db) {
  const schema = await db.execute("SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name");
  const tables = {};
  for (const row of schema.rows.filter(row => row.type === 'table')) {
    const data = await db.execute('SELECT * FROM ' + quote(row.name));
    const digests = data.rows.map(r => hash(JSON.stringify(data.columns.map((_, i) => encode(r[i]))))).sort();
    tables[row.name] = { rows: data.rows.length, columns: data.columns, sha256: hash(digests.join('\n')) };
  }
  return { schema_sha256: hash(JSON.stringify(schema.rows.map(r => Array.from(r)))), tables };
}
let remote, replica, tx;
try {
  const started = new Date().toISOString();
  const replicaPath = path.join(out, 'replica.db');
  if (fs.existsSync(replicaPath)) throw new Error('Refusing to overwrite replica');
  replica = createClient({ url: 'file:' + replicaPath.replaceAll('\\', '/'), syncUrl: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN, intMode: 'bigint' });
  const sync = await replica.sync();
  console.log(JSON.stringify({ stage: 'replica_synced' }));
  const localInventory = await inventory(replica);
  remote = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN, intMode: 'bigint' });
  tx = await remote.transaction('read');
  const remoteInventory = await inventory(tx);
  await tx.rollback();
  tx = null;
  if (JSON.stringify(localInventory) !== JSON.stringify(remoteInventory)) {
    throw new Error('Replica differs from remote read snapshot; capture must be repeated');
  }
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({
    source: env.TURSO_DATABASE_URL, source_config: 'apps/web/.env.local',
    capture_started_utc: started, capture_completed_utc: new Date().toISOString(),
    method: 'Fresh embedded replica sync; all table row digests and schema compared to remote read transaction',
    sync, ...localInventory,
  }, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ stage: 'remote_comparison_passed', tables: Object.keys(localInventory.tables).length }));
} catch (error) {
  // Provider exceptions may contain addresses or headers. Never print raw errors.
  console.error(JSON.stringify({ stage: 'capture_failed', type: error.name, code: error.code || null,
    reason: error.message?.startsWith('Replica differs') ? error.message : 'Capture unsuccessful; no verified backup declared' }));
  process.exitCode = 1;
} finally {
  if (tx) await tx.rollback().catch(() => {});
  remote?.close();
  replica?.close();
}
