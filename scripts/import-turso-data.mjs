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
  console.error('Missing @libsql/client. Install it in apps/web before running this importer.');
  process.exit(1);
}

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

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJson(exportDir, table) {
  return JSON.parse(fs.readFileSync(path.join(exportDir, `${table}.json`), 'utf8'));
}

function toIntBoolean(value) {
  return value ? 1 : 0;
}

function iso(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function isSupabaseStorageUrl(url) {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/magazines/');
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

async function executeSchema(db, schemaFile, options = {}) {
  const sql = fs.readFileSync(schemaFile, 'utf8');
  for (const statement of splitSql(sql)) {
    if (options.skipFts && statement.includes('USING fts')) continue;
    await db.execute(statement);
  }
}

async function executeMigrations(db, options = {}) {
  const migrationsDir = path.join(root, 'packages/turso/migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of migrationFiles) {
    await executeSchema(db, path.join(migrationsDir, file), options);
  }
}

async function clearTables(db) {
  const tables = [
    'navigation_items',
    'navigation_menus',
    'user_reading_history',
    'user_bookmarks',
    'users',
    'issue_search_index',
    'site_settings',
    'analytics_visibility',
    'issues',
    'magazines',
    'admins',
  ];
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

async function batch(db, statements) {
  if (statements.length === 0) return;
  await db.batch(statements, 'write');
}

async function main() {
  loadEnv(path.join(root, 'apps/web/.env.local'));
  loadEnv(path.join(root, '.env.local'));

  const exportDirArg = argValue('--export');
  if (!exportDirArg) throw new Error('Usage: node scripts/import-turso-data.mjs --export .migration/supabase-export-... [--reset]');
  const exportDir = path.resolve(root, exportDirArg);

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('Missing TURSO_DATABASE_URL');
  if (!authToken && !url.startsWith('file:')) {
    throw new Error('Missing TURSO_AUTH_TOKEN');
  }

  const assetPolicy = argValue('--asset-policy') ?? 'draft-legacy-assets';
  if (!['draft-legacy-assets', 'allow-existing-urls'].includes(assetPolicy)) {
    throw new Error('Unsupported --asset-policy. Use draft-legacy-assets or allow-existing-urls.');
  }

  const skipFts = hasFlag('--skip-fts');
  const db = createClient({ url, authToken });
  await executeMigrations(db, { skipFts });
  if (hasFlag('--reset')) {
    await clearTables(db);
    await executeMigrations(db, { skipFts });
  }

  const admins = readJson(exportDir, 'admins');
  const magazines = readJson(exportDir, 'magazines');
  const issues = readJson(exportDir, 'issues');
  const indexRows = readJson(exportDir, 'issue_search_index');
  const visibility = readJson(exportDir, 'analytics_visibility');
  const settings = readJson(exportDir, 'site_settings');
  const users = readJson(exportDir, 'users');
  const bookmarks = readJson(exportDir, 'user_bookmarks');
  const history = readJson(exportDir, 'user_reading_history');

  await batch(db, admins.map((row) => ({
    sql: 'INSERT INTO admins (id, email, name, created_at) VALUES (?, ?, ?, ?)',
    args: [row.id, row.email, row.name, iso(row.created_at)],
  })));

  await batch(db, magazines.map((row) => ({
    sql: 'INSERT INTO magazines (id, name, language, description, cover_image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [row.id, row.name, row.language, row.description ?? '', row.cover_image_url, iso(row.created_at), iso(row.updated_at)],
  })));

  let draftedForLegacyAssets = 0;
  await batch(db, issues.map((row) => {
    const hasLegacyAsset = isSupabaseStorageUrl(row.pdf_url) || isSupabaseStorageUrl(row.cover_image_url);
    const isPublished = assetPolicy === 'draft-legacy-assets' && hasLegacyAsset ? 0 : toIntBoolean(row.is_published);
    if (toIntBoolean(row.is_published) === 1 && isPublished === 0) draftedForLegacyAssets += 1;
    return {
      sql: `INSERT INTO issues (
        id, magazine_id, title, year, month, description, topics_json, pdf_url,
        epub_url, mobi_url, cover_image_url, page_count, file_size_bytes,
        read_count, download_count, is_published, created_at, updated_at, theme
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        row.id,
        row.magazine_id,
        row.title,
        row.year,
        row.month,
        row.description,
        JSON.stringify(row.topics ?? []),
        row.pdf_url,
        row.epub_url,
        row.mobi_url,
        row.cover_image_url,
        row.page_count,
        Number(row.file_size_bytes || 0),
        row.read_count || 0,
        row.download_count || 0,
        isPublished,
        iso(row.created_at),
        iso(row.updated_at),
        row.theme,
      ],
    };
  }));

  const searchStatements = indexRows.map((row) => ({
    sql: 'INSERT INTO issue_search_index (id, issue_id, page_number, content, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [row.id, row.issue_id, row.page_number, row.content, iso(row.created_at)],
  }));
  for (let i = 0; i < searchStatements.length; i += 250) {
    await batch(db, searchStatements.slice(i, i + 250));
  }

  await batch(db, visibility.map((row) => ({
    sql: 'INSERT INTO analytics_visibility (id, metric_name, is_public, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [row.id, row.metric_name, toIntBoolean(row.is_public), row.updated_by, iso(row.updated_at)],
  })));

  await batch(db, settings.map((row) => ({
    sql: 'INSERT INTO site_settings (key, value, description, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [row.key, row.value ?? '', row.description, row.updated_by, iso(row.updated_at)],
  })));

  await batch(db, users.map((row) => ({
    sql: 'INSERT INTO users (id, google_id, email, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [row.id, row.google_id, row.email, row.display_name, iso(row.created_at)],
  })));

  await batch(db, bookmarks.map((row) => ({
    sql: 'INSERT INTO user_bookmarks (id, user_id, issue_id, created_at) VALUES (?, ?, ?, ?)',
    args: [row.id, row.user_id, row.issue_id, iso(row.created_at)],
  })));

  await batch(db, history.map((row) => ({
    sql: 'INSERT INTO user_reading_history (id, user_id, issue_id, last_page, last_read_at) VALUES (?, ?, ?, ?, ?)',
    args: [row.id, row.user_id, row.issue_id, row.last_page, iso(row.last_read_at)],
  })));

  if (!skipFts) {
    try {
      await db.execute('OPTIMIZE INDEX idx_issue_search_content_fts');
    } catch (error) {
      console.warn(`FTS optimize skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('Import complete.');
  console.log(`Asset policy: ${assetPolicy}`);
  console.log(`Issues drafted for legacy Supabase assets: ${draftedForLegacyAssets}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
