#!/usr/bin/env node
// Sync the configured catalogue into a new local-only preview database.
// The remote client is used only for read queries; all migrations happen later on the copy.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@libsql/client');
const target = path.join(root, '.cache/current-catalogue-preview.db');
const config = path.join(root, 'apps/web/.env.local');

function readConfig() {
  const values = {};
  for (const line of fs.readFileSync(config, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  if (!values.TURSO_DATABASE_URL?.startsWith('libsql://') || !values.TURSO_AUTH_TOKEN)
    throw new Error('Configured remote Turso database and token are required.');
  return values;
}

async function counts(client) {
  const [magazines, issues, published] = await Promise.all([
    client.execute('SELECT COUNT(*) AS n FROM magazines'),
    client.execute('SELECT COUNT(*) AS n FROM issues'),
    client.execute('SELECT COUNT(*) AS n FROM issues WHERE is_published = 1'),
  ]);
  return {
    magazines: Number(magazines.rows[0].n),
    issues: Number(issues.rows[0].n),
    published: Number(published.rows[0].n),
  };
}

async function main() {
  if (fs.existsSync(target)) throw new Error('Preview copy already exists; refusing to overwrite it.');
  const { TURSO_DATABASE_URL: syncUrl, TURSO_AUTH_TOKEN: authToken } = readConfig();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const replica = createClient({ url: `file:${target.replaceAll('\\', '/')}`, syncUrl, authToken });
  const remote = createClient({ url: syncUrl, authToken });
  try {
    await replica.sync();
    const [localCounts, remoteCounts] = await Promise.all([counts(replica), counts(remote)]);
    if (JSON.stringify(localCounts) !== JSON.stringify(remoteCounts))
      throw new Error('Catalogue counts differ from the configured source; do not use this copy.');
    console.log(JSON.stringify({ localCopy: '.cache/current-catalogue-preview.db', ...localCounts, remoteWrites: 0 }));
  } catch (error) {
    console.error(JSON.stringify({ error: 'Catalogue preview sync failed; inspect the local copy before retrying.', code: error.code ?? null }));
    process.exitCode = 1;
  } finally {
    remote.close();
    replica.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
