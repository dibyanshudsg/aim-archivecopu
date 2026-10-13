import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '../..');
const fromWeb = createRequire(path.join(root, 'apps/web/package.json'));
export const { createClient } = fromWeb('@libsql/client');
const ledger = 'aim_schema_migrations';

export function readMigrations(directory = path.join(root, 'packages/turso/migrations')) {
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.sql')).sort();
  if (!files.length || files.some((file, index) => !/^\d{5}_[\w-]+\.sql$/.test(file) || Number(file.slice(0, 5)) !== index + 1)) {
    throw new Error('Migration files must be a nonempty consecutive sequence: 00001_name.sql, 00002_name.sql, ...');
  }
  return files.map(file => {
    // Normalize checkout line endings; preserve all other bytes in the checksum.
    const sql = fs.readFileSync(path.join(directory, file), 'utf8').replace(/\r\n/g, '\n');
    return { file, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}

export function splitSql(sql) {
  const statements = sql.includes('-- statement-breakpoint')
    ? sql.split('-- statement-breakpoint')
    : sql.split(/\r?\n/).filter(line => !line.trim().startsWith('--')).join('\n').split(/;\s*(?:\r?\n|$)/);
  return statements.map(s => s.trim()).filter(s => s && !/^PRAGMA foreign_keys\s*=/i.test(s));
}

async function schema(db) {
  const result = await db.execute("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name != 'aim_schema_migrations' AND tbl_name != 'aim_schema_migrations' ORDER BY type,name");
  return result.rows.map(row => [row.type, row.name, row.tbl_name, String(row.sql ?? '').replace(/\s+/g, ' ').trim()]);
}

export async function migrationState(db, migrations) {
  const exists = await db.execute({ sql: "SELECT name FROM sqlite_schema WHERE type='table' AND name=?", args: [ledger] });
  const rows = exists.rows.length ? (await db.execute(`SELECT name,checksum,mode FROM ${ledger} ORDER BY name`)).rows : [];
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].name !== migrations[index]?.file || rows[index].checksum !== migrations[index]?.checksum) {
      throw new Error('Migration history has a gap, unknown entry or changed checksum; stop and reconcile the reviewed release.');
    }
  }
  const objects = await schema(db);
  return {
    applied: rows.map(row => ({ name: row.name, mode: row.mode })),
    pending: migrations.slice(rows.length).map(m => m.file),
    needsBaseline: rows.length === 0 && objects.length > 0,
    schemaObjects: objects.length,
  };
}

export async function verifyMigrationSchema(db, migrations) {
  const shadow = createClient({ url: 'file::memory:' });
  try {
    for (const migration of migrations) await shadow.batch(splitSql(migration.sql), 'write');
    if (JSON.stringify(await schema(db)) !== JSON.stringify(await schema(shadow))) {
      throw new Error('Schema differs from the selected migration prefix; inspect the isolated target and use reviewed forward migrations.');
    }
  } finally { shadow.close(); }
}

async function assertIntegrity(db) {
  const integrity = await db.execute('PRAGMA integrity_check');
  if (integrity.rows.length !== 1 || Object.values(integrity.rows[0])[0] !== 'ok') throw new Error('Database integrity check failed.');
  if ((await db.execute('PRAGMA foreign_key_check')).rows.length) throw new Error('Foreign-key validation failed.');
}

async function createLedger(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS ${ledger} (
    name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('apply','baseline')), evidence TEXT NOT NULL
  )`);
}

async function record(db, migration, mode, evidence) {
  await db.execute({ sql: `INSERT INTO ${ledger}(name,checksum,applied_at,mode,evidence) VALUES(?,?,?,?,?)`,
    args: [migration.file, migration.checksum, new Date().toISOString(), mode, evidence] });
}

export async function applyMigrations(db, migrations, { through, baseline = false, evidence = '' } = {}) {
  const end = through ? migrations.findIndex(m => m.file === through) + 1 : migrations.length;
  if (end === 0) throw new Error('Unknown --through migration filename.');
  if (baseline && (!through || !evidence.trim())) throw new Error('Baseline requires --through and a reviewed backup/evidence reference.');
  await db.execute('PRAGMA foreign_keys=ON');
  const tx = await db.transaction('write');
  try {
    const state = await migrationState(tx, migrations);
    if (end < state.applied.length) throw new Error('Downgrades are not supported.');
    if (baseline) {
      if (!state.needsBaseline || state.applied.length) throw new Error('Baseline requires an existing schema with no recorded migrations.');
      await verifyMigrationSchema(tx, migrations.slice(0, end));
    } else {
      if (state.needsBaseline) throw new Error('Existing schema has no ledger. Review and baseline it; never replay migrations blindly.');
      await verifyMigrationSchema(tx, migrations.slice(0, state.applied.length));
    }
    await createLedger(tx);
    for (const migration of migrations.slice(state.applied.length, end)) {
      if (!baseline) for (const statement of splitSql(migration.sql)) await tx.execute(statement);
      await record(tx, migration, baseline ? 'baseline' : 'apply', evidence);
    }
    await verifyMigrationSchema(tx, migrations.slice(0, end));
    await assertIntegrity(tx);
    await tx.commit();
    return { applied: migrations.slice(state.applied.length, end).map(m => m.file), mode: baseline ? 'baseline' : 'apply' };
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally { tx.close(); }
}
