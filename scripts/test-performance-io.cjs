// No remote requests or storage writes. Exercises limits at the I/O boundary.
const assert = require('node:assert/strict');
require('./register-web-typescript.cjs');
const { downloadAsZip } = require('../apps/web/src/lib/download-zip.ts');
const { normalizePublicAssetUrl } = require('../apps/web/src/lib/asset-url.ts');
(async () => {
  const originalFetch = global.fetch;
  let fetches = 0;
  global.fetch = async () => { fetches++; throw new Error('unexpected request'); };
  await assert.rejects(downloadAsZip({ files: [{ name: 'large', url: '/example', sizeBytes: 51 * 1024 * 1024 }], zipName: 'test' }), /too large/);
  assert.equal(fetches, 0, 'known oversized selection rejected before downloading');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(downloadAsZip({ files: [], zipName: 'test', signal: controller.signal }), { name: 'AbortError' });
  global.fetch = async () => new Response(new ReadableStream({
    pull(stream) { stream.enqueue(new Uint8Array(1024 * 1024)); },
  }));
  await assert.rejects(downloadAsZip({ files: [{ name: 'unknown size', url: '/api/issues/test/pdf' }], zipName: 'test' }), /too large/);
  global.fetch = originalFetch;
  process.env.R2_PUBLIC_BASE_URL = 'https://assets.example';
  process.env.R2_LEGACY_PUBLIC_BASE_URLS = 'https://old.example';
  assert.equal(normalizePublicAssetUrl('https://old.example/a%20b.pdf?v=1'), 'https://assets.example/a%20b.pdf?v=1');
  assert.equal(normalizePublicAssetUrl('https://old.example.attacker.test/a.pdf'), 'https://old.example.attacker.test/a.pdf');
  assert.equal(normalizePublicAssetUrl('https://unrelated.example/a.pdf'), 'https://unrelated.example/a.pdf');
  // The metrics fixture has no database; bucket transactions are covered by the rate-limit suite.
  require('../apps/web/src/lib/rate-limit.ts').publicRateLimit = async () => null;
  const { POST } = require('../apps/web/src/app/api/vitals/route.ts');
  const { NextRequest } = require('../apps/web/node_modules/next/server');
  process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS = 'true';
  const request = body => new NextRequest('http://localhost/api/vitals', { method: 'POST', headers: { origin: 'http://localhost' }, body });
  assert.equal((await POST(request('x'.repeat(513)))).status, 413);
  assert.equal((await POST(request(JSON.stringify({ name: 'unexpected', value: 1, rating: 'good' })))).status, 400);
  assert.equal((await POST(request(JSON.stringify({ name: 'LCP', value: 123, rating: 'good' })))).status, 204);
  console.log('PASS ZIP metadata/stream budgets, early abort, precise asset aliases, bounded/validated metrics');
})().catch(error => { console.error(error); process.exitCode = 1; });
