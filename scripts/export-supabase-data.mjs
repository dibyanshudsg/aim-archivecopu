#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const requireFromSupabasePackage = createRequire(path.join(root, 'packages/supabase/package.json'));
const { createClient } = requireFromSupabasePackage('@supabase/supabase-js');

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

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function fetchAll(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
    from += pageSize;
  }
}

function summarize(table, rows) {
  if (table !== 'issues') return {};
  return {
    published: rows.filter((row) => row.is_published).length,
    drafts: rows.filter((row) => !row.is_published).length,
    read_count_sum: rows.reduce((sum, row) => sum + (row.read_count || 0), 0),
    download_count_sum: rows.reduce((sum, row) => sum + (row.download_count || 0), 0),
    file_size_bytes_sum: rows.reduce((sum, row) => sum + Number(row.file_size_bytes || 0), 0),
    supabase_pdf_urls: rows.filter((row) => isSupabaseStorageUrl(row.pdf_url)).length,
    supabase_cover_urls: rows.filter((row) => isSupabaseStorageUrl(row.cover_image_url)).length,
  };
}

function isSupabaseStorageUrl(url) {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/magazines/');
}

async function main() {
  loadEnv(path.join(root, 'apps/web/.env.local'));
  loadEnv(path.join(root, '.env.local'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const outDir = path.resolve(
    root,
    argValue('--out') ?? path.join('.migration', `supabase-export-${timestamp()}`),
  );
  fs.mkdirSync(outDir, { recursive: true });

  const supabase = createClient(url, serviceRoleKey);
  const manifest = {
    exported_at: new Date().toISOString(),
    project_ref: new URL(url).hostname.split('.')[0],
    tables: {},
  };

  for (const table of TABLES) {
    const rows = await fetchAll(supabase, table);
    const file = path.join(outDir, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 2) + '\n');
    manifest.tables[table] = {
      rows: rows.length,
      sha256: hashFile(file),
      ...summarize(table, rows),
    };
    console.log(`${table}: ${rows.length} rows`);
  }

  const manifestFile = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nExport written to ${path.relative(root, outDir)}`);
  console.log(`Manifest SHA-256: ${hashFile(manifestFile)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
