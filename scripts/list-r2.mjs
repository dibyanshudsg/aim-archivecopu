#!/usr/bin/env node
// Quick listing of every object in the R2 bucket.
// Usage (from repo root):  node scripts/list-r2.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(repoRoot, '.env.r2.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const webRequire = createRequire(
  pathToFileURL(resolve(repoRoot, 'apps/web/package.json')).href,
);
const { S3Client, ListObjectsV2Command } = webRequire('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

let totalBytes = 0;
let totalObjects = 0;
let token;
const groups = new Map();

do {
  const r = await client.send(
    new ListObjectsV2Command({
      Bucket: env.R2_BUCKET,
      ContinuationToken: token,
      MaxKeys: 1000,
    }),
  );
  for (const obj of r.Contents ?? []) {
    totalObjects++;
    totalBytes += obj.Size ?? 0;
    const prefix = obj.Key.includes('/') ? obj.Key.split('/')[0] : '(root)';
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(obj);
  }
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);

for (const [prefix, items] of [...groups.entries()].sort()) {
  console.log(`\n${prefix}/  (${items.length} object${items.length > 1 ? 's' : ''})`);
  for (const obj of items.sort((a, b) => a.Key.localeCompare(b.Key))) {
    const name = obj.Key.includes('/') ? obj.Key.slice(prefix.length + 1) : obj.Key;
    const when = obj.LastModified ? new Date(obj.LastModified).toISOString().slice(0, 10) : '';
    console.log(`  ${name.padEnd(50)} ${fmtBytes(obj.Size ?? 0).padStart(10)}  ${when}`);
  }
}

console.log(
  `\nTotal: ${totalObjects} object${totalObjects === 1 ? '' : 's'}, ${fmtBytes(totalBytes)}`,
);
