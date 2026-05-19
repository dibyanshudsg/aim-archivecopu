#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const requireFromWeb = createRequire(resolve(ROOT, 'apps/web/package.json'));
const { S3Client, PutObjectCommand } = requireFromWeb('@aws-sdk/client-s3');
const { createClient } = requireFromWeb('@supabase/supabase-js');

loadEnvFile(resolve(ROOT, 'apps/web/.env.local'));

const APPLY = process.argv.includes('--apply');
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'magazines';

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
];

for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const r2Bucket = process.env.R2_BUCKET;
const r2Base = process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');

console.log(`AIM Archive storage migration ${APPLY ? '(apply mode)' : '(dry run)'}`);
console.log(`Supabase bucket: ${SUPABASE_BUCKET}`);
console.log(`R2 bucket: ${r2Bucket}`);

const objects = await listSupabaseObjects('');
console.log(`Found ${objects.length} Supabase Storage object(s).`);

let uploaded = 0;
let skipped = 0;

for (const object of objects) {
  if (!APPLY) {
    console.log(`[dry-run] copy ${object.key} (${object.size ?? 0} bytes)`);
    continue;
  }

  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(object.key);
  if (error || !data) {
    console.warn(`Skip ${object.key}: ${error?.message ?? 'download failed'}`);
    skipped += 1;
    continue;
  }

  const body = new Uint8Array(await data.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: object.key,
      Body: body,
      ContentType: contentTypeForKey(object.key),
    }),
  );
  uploaded += 1;
  console.log(`Copied ${object.key}`);
}

const { data: issues, error: issueError } = await supabase
  .from('issues')
  .select('id, title, pdf_url, cover_image_url');

if (issueError) {
  console.error(`Could not list issues: ${issueError.message}`);
  process.exit(1);
}

let rowsToUpdate = 0;
let rowsUpdated = 0;

for (const issue of issues ?? []) {
  const patch = {};
  const pdfKey = supabaseStorageKey(issue.pdf_url);
  const coverKey = issue.cover_image_url ? supabaseStorageKey(issue.cover_image_url) : null;

  if (pdfKey) patch.pdf_url = r2PublicUrl(pdfKey);
  if (coverKey) patch.cover_image_url = r2PublicUrl(coverKey);

  if (Object.keys(patch).length === 0) continue;
  rowsToUpdate += 1;

  if (!APPLY) {
    console.log(`[dry-run] update issue "${issue.title}"`, patch);
    continue;
  }

  const { error } = await supabase.from('issues').update(patch).eq('id', issue.id);
  if (error) {
    console.warn(`Could not update "${issue.title}": ${error.message}`);
    continue;
  }
  rowsUpdated += 1;
}

console.log('');
console.log('Summary');
console.log(`Objects copied: ${uploaded}${APPLY ? '' : ' (dry run only)'}`);
console.log(`Objects skipped: ${skipped}`);
console.log(`Issue rows needing URL updates: ${rowsToUpdate}`);
console.log(`Issue rows updated: ${rowsUpdated}${APPLY ? '' : ' (dry run only)'}`);
if (!APPLY) {
  console.log('Run again with --apply to copy objects and update issue URLs.');
}

async function listSupabaseObjects(prefix) {
  const found = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Storage list failed at "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const key = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        found.push(...(await listSupabaseObjects(key)));
      } else {
        found.push({ key, size: item.metadata?.size });
      }
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return found;
}

function supabaseStorageKey(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
}

function r2PublicUrl(key) {
  return `${r2Base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function contentTypeForKey(key) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Optional convenience only; deployed/CI environments can provide vars directly.
  }
}
