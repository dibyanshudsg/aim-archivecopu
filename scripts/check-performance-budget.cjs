// Run after NEXT_DIST_DIR=.next-performance pnpm build (from the web app).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const build = path.resolve(__dirname, '../apps/web', process.argv[2] || '.next-performance');
const manifest = JSON.parse(fs.readFileSync(path.join(build, 'app-build-manifest.json'), 'utf8'));
for (const [route, budgetKiB] of [['/page', 220], ['/browse/page', 220], ['/read/[id]/page', 350]]) {
  const files = [...new Set([...(manifest.pages['/layout'] || []), ...(manifest.pages[route] || [])])];
  if (!manifest.pages[route]) throw new Error(`Missing route in production manifest: ${route}`);
  const gzipBytes = files.reduce((sum, file) => sum + zlib.gzipSync(fs.readFileSync(path.join(build, file))).byteLength, 0);
  console.log(`${route}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip; budget ${budgetKiB} KiB`);
  if (gzipBytes > budgetKiB * 1024) process.exitCode = 1;
  if (route === '/page' && files.some(file => fs.readFileSync(path.join(build, file), 'utf8').includes('Invalid PDF structure'))) {
    console.error('Homepage initial scripts contain the PDF engine'); process.exitCode = 1;
  }
}
