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
  console.error('Missing @libsql/client. Install it in apps/web before running verification.');
  process.exit(1);
}

const TABLES = [
  'admins',
  'magazines',
  'issues',
  'issue_search_index',
  'analytics_visibility',
  'site_settings',
  'users',
  'user_bookmarks',
  'user_reading_history',
];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readExpected(exportDir, table) {
  const file = path.join(exportDir, `${table}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).length;
}

async function main() {
  loadEnv(path.join(root, 'apps/web/.env.local'));
  loadEnv(path.join(root, '.env.local'));

  const exportDirArg = argValue('--export');
  if (!exportDirArg) throw new Error('Usage: node scripts/verify-migrated-data.mjs --export .migration/supabase-export-...');
  const exportDir = path.resolve(root, exportDirArg);

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('Missing TURSO_DATABASE_URL');
  if (!authToken && !url.startsWith('file:')) throw new Error('Missing TURSO_AUTH_TOKEN');

  const db = createClient({ url, authToken });
  let ok = true;

  for (const table of TABLES) {
    const expected = readExpected(exportDir, table);
    const actual = await db.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    const count = Number(actual.rows[0].count);
    const status = expected === count ? 'ok' : 'mismatch';
    if (status !== 'ok') ok = false;
    console.log(`${table}: expected ${expected}, got ${count} (${status})`);
  }

  const issueSums = await db.execute(`
    SELECT
      SUM(read_count) AS reads,
      SUM(download_count) AS downloads,
      SUM(file_size_bytes) AS bytes,
      SUM(CASE WHEN is_published = 1 AND pdf_url LIKE '%supabase.co%' THEN 1 ELSE 0 END) AS published_supabase_pdf_urls,
      SUM(CASE WHEN is_published = 1 AND cover_image_url LIKE '%supabase.co%' THEN 1 ELSE 0 END) AS published_supabase_cover_urls
    FROM issues
  `);
  console.log('Issue sums:', JSON.stringify(issueSums.rows[0]));

  const publishedLegacy =
    Number(issueSums.rows[0].published_supabase_pdf_urls || 0) +
    Number(issueSums.rows[0].published_supabase_cover_urls || 0);
  if (publishedLegacy > 0) {
    ok = false;
    console.log(`Published Supabase-hosted asset URLs found: ${publishedLegacy}`);
  }

  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
