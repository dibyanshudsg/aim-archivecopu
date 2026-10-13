#!/usr/bin/env node
/**
 * R2 connectivity smoke test.
 *
 * Usage (from the repo root):
 *   node scripts/test-r2.mjs --allow-write
 *
 * Reads creds from ../.env.r2.local at the repo root (gitignored). The
 * @aws-sdk/client-s3 package is resolved out of apps/web/node_modules so
 * the script works without adding the dep at the repo root. Performs:
 *   1. PutObject  — upload a small text file
 *   2. ListObjects — confirm it's there
 *   3. Authenticated HEAD — works with public access disabled
 *   4. Authenticated GET — confirm body matches
 *   5. DeleteObject — clean up
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

if (!process.argv.includes('--allow-write')) {
  console.error('This smoke test creates and deletes a synthetic object. Use --allow-write only with approval. For read-only inventory use reconcile-r2-readonly.cjs.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const envPath = resolve(repoRoot, '.env.r2.local');

// Resolve @aws-sdk/client-s3 out of apps/web/node_modules so this script
// runs without the dep at the repo root. createRequire rooted at apps/web
// uses Node's CJS resolution algorithm which handles the SDK's internal
// path references correctly (the ESM build relies on bundler magic).
const webRequire = createRequire(
  pathToFileURL(resolve(repoRoot, 'apps/web/package.json')).href,
);
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } =
  webRequire('@aws-sdk/client-s3');

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = env;

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const key = `test/r2-smoke-${Date.now()}.txt`;
const body = `hello from aim-archive r2 smoke test @ ${new Date().toISOString()}`;

console.log(`endpoint: ${endpoint}`);
console.log(`bucket:   ${R2_BUCKET}`);
console.log(`pub base: ${R2_PUBLIC_BASE_URL}`);
console.log(`key:      ${key}`);
console.log('');

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const step = async (name, fn) => {
  process.stdout.write(`[${name}]... `);
  try {
    const r = await fn();
    console.log('ok');
    return r;
  } catch (e) {
    console.log('FAIL');
    console.error(`  → ${e.name}: ${e.message}`);
    if (e.$metadata) console.error(`  → ${JSON.stringify(e.$metadata)}`);
    throw e;
  }
};

try {
  await step('put', () =>
    client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'text/plain',
      })
    )
  );

  await step('list', async () => {
    const r = await client.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: 'test/', MaxKeys: 10 })
    );
    const found = r.Contents?.find((c) => c.Key === key);
    if (!found) throw new Error(`uploaded key ${key} not found in listing`);
    console.log(`\n  → ${r.Contents.length} object(s) under test/, found ours (size ${found.Size})`);
  });

  await step('authenticated HEAD', async () => {
    const r = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (r.ContentLength !== Buffer.byteLength(body)) throw new Error('Size mismatch');
  });

  await step('authenticated GET', async () => {
    const r = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const got = await r.Body.transformToString();
    if (got !== body) throw new Error(`body mismatch: got "${got}"`);
    console.log(`\n  → body matches (${got.length} bytes)`);
  });

  await step('delete', () =>
    client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  );

  console.log('\nall checks complete.');
} catch {
  process.exitCode = 1;
}
