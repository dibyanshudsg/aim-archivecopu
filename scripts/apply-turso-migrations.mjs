#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const requireFromWeb = createRequire(path.join(root, 'apps/web/package.json'));

let createClient;
try {
  ({ createClient } = requireFromWeb('@libsql/client'));
} catch {
  console.error('Missing @libsql/client. Install web dependencies before running migrations.');
  process.exit(1);
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function splitSql(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  loadEnv(path.join(root, 'apps/web/.env.local'));
  loadEnv(path.join(root, '.env.local'));

  const localDbPath = path.join(root, process.env.LOCAL_TURSO_DB || '.migration/turso-local-smoke.db');
  const useLocal = hasFlag('--local');
  const url = useLocal ? `file:${localDbPath.replace(/\\/g, '/')}` : process.env.TURSO_DATABASE_URL;
  const authToken = useLocal ? undefined : process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('Missing TURSO_DATABASE_URL');
  if (!authToken && !url.startsWith('file:')) throw new Error('Missing TURSO_AUTH_TOKEN');

  const db = createClient({ url, authToken });
  const migrationsDir = path.join(root, 'packages/turso/migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  const onlyIndex = process.argv.indexOf('--only');
  const onlyFile = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
  if (onlyIndex >= 0 && !migrationFiles.includes(onlyFile)) throw new Error('--only must name an existing migration');

  const skipFts = useLocal || hasFlag('--skip-fts');
  for (const file of migrationFiles) {
    if (onlyFile && file !== onlyFile) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const statement of splitSql(sql)) {
      if (skipFts && statement.includes('USING fts')) continue;
      await db.execute(statement);
    }
    console.log(`Applied ${file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
