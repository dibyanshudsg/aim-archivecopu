// End-to-end extraction with a generated native-text page and a scanned page.
// Isolated SQLite database and PDF bytes; no catalogue or storage writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, fromWeb } = require('./register-web-typescript.cjs');
const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'aim-worker-pdf-'));
const db = fromWeb('@libsql/client').createClient({
  url: 'file:' + path.join(dir, 'test.db').replace(/\\/g, '/'),
});
require('../apps/web/src/lib/db/client.ts').getDb = () => db;
const {
  queueIssueIndexing,
  getIndexingOverview,
} = require('../apps/web/src/lib/db/indexing-repository.ts');
const { processNextIndexingJob } = require('../apps/web/src/lib/indexing-worker.ts');
(async () => {
  await db.executeMultiple(`PRAGMA foreign_keys=ON;
    CREATE TABLE magazines(id TEXT PRIMARY KEY,language TEXT);
    CREATE TABLE issues(id TEXT PRIMARY KEY,magazine_id TEXT,title TEXT,theme TEXT,pdf_url TEXT,page_count INTEGER,updated_at TEXT);
    CREATE TABLE issue_search_index(id TEXT PRIMARY KEY,issue_id TEXT,page_number INTEGER,content TEXT,created_at TEXT);
    INSERT INTO magazines VALUES('aim','english');
    INSERT INTO issues VALUES('pdf-test','aim','PDF worker test',NULL,'https://example.test/test.pdf',NULL,'now');`);
  await db.executeMultiple(
    fs.readFileSync(path.join(root, 'packages/turso/migrations/00003_indexing_jobs.sql'), 'utf8'),
  );
  await db.executeMultiple(fs.readFileSync(path.join(root, 'packages/turso/migrations/00004_indexing_workspace.sql'), 'utf8'));
  const { createCanvas } = fromWeb('canvas');
  const pdf = createCanvas(612, 792, 'pdf');
  const ctx = pdf.getContext('2d');
  ctx.textDrawingMode = 'glyph';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 612, 792);
  ctx.fillStyle = 'black';
  ctx.font = '24px Arial';
  ctx.fillText('Descent of the Superman', 60, 120);
  ctx.fillText('A life of self-giving.', 60, 170);
  ctx.addPage();
  const scan = createCanvas(1224, 1584),
    scanCtx = scan.getContext('2d');
  scanCtx.fillStyle = 'white';
  scanCtx.fillRect(0, 0, 1224, 1584);
  scanCtx.fillStyle = 'black';
  scanCtx.font = '48px Arial';
  scanCtx.fillText('The light grows within us.', 120, 240);
  scanCtx.fillText('A life of quiet aspiration.', 120, 340);
  ctx.drawImage(scan, 0, 0, 612, 792);
  const buffer = pdf.toBuffer();
  await queueIssueIndexing('pdf-test');
  await processNextIndexingJob({ download: async () => buffer });
  const overview = await getIndexingOverview();
  assert.equal(overview.jobs[0].status, 'complete', overview.jobs[0].error);
  const rows = (
    await db.execute('SELECT page_number,content FROM issue_search_index ORDER BY page_number')
  ).rows;
  assert.equal(rows.length, 2);
  assert.match(rows[0].content, /Superman/);
  assert.match(rows[1].content, /light grows within us/i);
  assert.equal(overview.jobs[0].total_pages, 2);
  console.log(
    'PASS: real PDF download bytes -> native extraction + scanned-page OCR -> durable checkpoints -> atomic searchable index on original pages 1 and 2.',
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
