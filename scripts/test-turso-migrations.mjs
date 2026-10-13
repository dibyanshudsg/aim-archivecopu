import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient, readMigrations, splitSql, migrationState, applyMigrations } from './lib/turso-migrations.mjs';

const migrations = readMigrations();
const clients = [];
const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aim-migration-test-'));
// libSQL releases a transaction connection; anonymous :memory: databases would
// disappear on the next client call. File targets also exercise the actual CLI path.
function db() { const client = createClient({ url: `file:${path.join(databaseDir, clients.length + '.db').replace(/\\/g, '/')}` }); clients.push(client); return client; }
async function count(client, table) { return Number((await client.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n); }
async function seed(client) {
  await client.execute("INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES('m','Fixture Magazine','english','now','now')");
  await client.execute("INSERT INTO issues(id,magazine_id,title,year,month,pdf_url,created_at,updated_at) VALUES('i','m','Aspiration',2000,1,'https://example.test/i.pdf','now','now')");
  await client.execute("INSERT INTO issue_search_index VALUES('p','i',1,'A quiet aspiration','now')");
}

try {
  const fresh = db();
  assert.equal((await migrationState(fresh, migrations)).needsBaseline, false);
  assert.equal((await applyMigrations(fresh, migrations)).applied.length, 8);
  assert.equal(await count(fresh, 'navigation_menus'), 5);
  assert.equal(await count(fresh, 'navigation_items'), 15);
  assert.deepEqual((await applyMigrations(fresh, migrations)).applied, []);
  await seed(fresh);
  assert.equal(await count(fresh, 'issue_text_fts'), 1);
  assert.equal(await count(fresh, 'issue_metadata_fts'), 1);

  const upgrade = db();
  await applyMigrations(upgrade, migrations, { through: migrations[5].file });
  await seed(upgrade);
  assert.equal((await applyMigrations(upgrade, migrations)).applied.length, 2);
  assert.equal((await upgrade.execute("SELECT count(*) n FROM issue_text_fts WHERE issue_text_fts MATCH 'aspiration'")).rows[0].n, 1);
  assert.equal((await upgrade.execute("SELECT count(*) n FROM issue_metadata_fts WHERE issue_metadata_fts MATCH 'aspiration'")).rows[0].n, 1);
  await upgrade.execute("UPDATE issue_search_index SET content='A peaceful silence'");
  assert.equal((await upgrade.execute("SELECT count(*) n FROM issue_text_fts WHERE issue_text_fts MATCH 'silence'")).rows[0].n, 1);
  await upgrade.execute("UPDATE magazines SET name='Changed Magazine'");
  assert.equal((await upgrade.execute("SELECT count(*) n FROM issue_metadata_fts WHERE issue_metadata_fts MATCH 'changed'")).rows[0].n, 1);
  await upgrade.execute("DELETE FROM issues WHERE id='i'");
  assert.equal(await count(upgrade, 'issue_search_index'), 0);
  assert.equal(await count(upgrade, 'issue_text_fts'), 0);
  assert.equal(await count(upgrade, 'issue_metadata_fts'), 0);

  const legacy = db();
  for (const migration of migrations.slice(0, 6)) await legacy.batch(splitSql(migration.sql), 'write');
  await seed(legacy);
  await legacy.execute("UPDATE navigation_items SET label='Custom home' WHERE id='nav-header-home'");
  await assert.rejects(applyMigrations(legacy, migrations), /no ledger/);
  await assert.rejects(applyMigrations(legacy, migrations, { baseline: true, through: migrations[7].file, evidence: 'synthetic-backup' }), /Schema differs/);
  assert.equal((await migrationState(legacy, migrations)).applied.length, 0);
  await applyMigrations(legacy, migrations, { baseline: true, through: migrations[5].file, evidence: 'synthetic-backup' });
  await applyMigrations(legacy, migrations);
  assert.equal((await legacy.execute("SELECT label FROM navigation_items WHERE id='nav-header-home'")).rows[0].label, 'Custom home');
  assert.equal(await count(legacy, 'issue_text_fts'), 1);
  assert.equal((await migrationState(legacy, migrations)).applied[0].mode, 'baseline');

  const broken = db();
  const invalid = [{ file: '00001_broken.sql', checksum: 'fixture', sql: 'CREATE TABLE fixture(id TEXT);\nINVALID SQL;' }];
  await assert.rejects(applyMigrations(broken, invalid));
  assert.equal((await broken.execute("SELECT count(*) n FROM sqlite_schema WHERE name IN ('fixture','aim_schema_migrations')")).rows[0].n, 0);
  await fresh.execute("UPDATE aim_schema_migrations SET checksum='changed' WHERE name='00001_initial_schema.sql'");
  await assert.rejects(applyMigrations(fresh, migrations), /checksum/);
  await legacy.execute('CREATE TABLE unexpected(id TEXT)');
  await assert.rejects(applyMigrations(legacy, migrations), /Schema differs/);
  const gap = db();
  await applyMigrations(gap, migrations);
  await gap.execute("DELETE FROM aim_schema_migrations WHERE name='00003_indexing_jobs.sql'");
  await assert.rejects(migrationState(gap, migrations), /gap/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aim-migration-cli-'));
  const target = path.join(dir, 'never-created.db');
  function cli(args) {
    const result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'apply-turso-migrations.mjs'), ...args], {
      encoding: 'utf8', env: { ...process.env, TURSO_DATABASE_URL: 'libsql://invalid.example', TURSO_AUTH_TOKEN: 'synthetic-token' },
    });
    if (result.error) throw result.error;
    return result;
  }
  assert.equal(cli([]).status, 1, 'Must not use an inherited production target');
  assert.equal(cli(['--local', target]).status, 0);
  assert.equal(fs.existsSync(target), false, 'Status must not create an absent database');
  assert.equal(cli(['--url-env', 'TURSO_DATABASE_URL', '--apply']).status, 1, 'Remote writes need explicit target confirmation');
  assert.equal(cli(['--local', target, '--only', migrations[2].file]).status, 1);
  assert.equal(cli(['--local', target, '--apply', '--status']).status, 1);
  fs.writeFileSync(path.join(dir, '00001_fixture.sql'), 'CREATE TABLE fixture(id TEXT);\r\n');
  const checksum = readMigrations(dir)[0].checksum;
  fs.writeFileSync(path.join(dir, '00001_fixture.sql'), 'CREATE TABLE fixture(id TEXT);\n');
  assert.equal(readMigrations(dir)[0].checksum, checksum, 'CRLF must not change migration identity');
  console.log('PASS fresh schema, all eight migrations, no-op repeat, populated upgrade/FTS triggers, baseline preservation/refusal, rollback, checksum/gap/schema drift, explicit CLI targets and read-only status.');
} finally { for (const client of clients) client.close(); }
