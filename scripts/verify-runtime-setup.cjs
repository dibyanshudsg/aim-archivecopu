// Offline checks: no environment values, credentials, or remote database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const fromWeb = createRequire(path.join(root, 'apps/web/package.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
assert.equal(process.versions.node.split('.')[0], '22', 'Supported runtime is Node 22');
const pinnedNode = fs.readFileSync(path.join(root, '.node-version'), 'utf8').trim();
assert.equal(process.versions.node, pinnedNode, 'Use the reviewed .node-version runtime for release verification');
assert.equal(manifest.packageManager, 'pnpm@10.33.0');
assert.ok(manifest.pnpm.overrides['@types/react'] && manifest.pnpm.overrides['@types/react-dom']);
assert.ok(fromWeb('pdfjs-dist/package.json').version.startsWith('4.'));
const worker = fs.readFileSync(path.join(root, 'apps/web/public/pdf.worker-4.8.69.min.mjs'));
assert.equal(crypto.createHash('sha256').update(worker).digest('hex'), crypto.createHash('sha256').update(fs.readFileSync(fromWeb.resolve('pdfjs-dist/build/pdf.worker.min.mjs'))).digest('hex'));
const fontDir = path.join(path.dirname(fromWeb.resolve('pdfjs-dist/package.json')), 'standard_fonts');
assert.ok(fs.readdirSync(fontDir).some(file => file.endsWith('.pfb')));
const { createCanvas } = fromWeb('canvas');
assert.ok(createCanvas(32, 32, 'pdf').toBuffer().subarray(0, 5).equals(Buffer.from('%PDF-')));
const uiFonts = path.join(root, 'apps/web/src/app/fonts');
for (const entry of JSON.parse(fs.readFileSync(path.join(uiFonts, 'manifest.json'))).files) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(uiFonts, entry.file))).digest('hex'), entry.sha256);
}
assert.ok(!fs.readFileSync(path.join(root, 'apps/web/src/app/layout.tsx'), 'utf8').includes('next/font/google'));
console.log('PASS Node/pnpm contract, React overrides, PDF.js v4 worker byte identity/standard fonts, native canvas PDF and vendored font/license hashes.');
