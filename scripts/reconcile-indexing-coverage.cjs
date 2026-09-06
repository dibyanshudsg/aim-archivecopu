// Backfill evidence only when every indexed page matches the saved rebuild.
// No PDF downloads, OCR, publication changes or search-index writes.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { root, fromWeb } = require('./register-web-typescript.cjs');
process.loadEnvFile(path.join(root, 'apps/web/.env.local'));
const local = process.argv.includes('--local'),
  apply = process.argv.includes('--apply');
const db = fromWeb('@libsql/client').createClient(
  local
    ? { url: 'file:' + path.join(root, '.migration/turso-local-smoke.db').replace(/\\/g, '/') }
    : { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
);
const { EXTRACTION_VERSION } = require('../apps/web/src/lib/pdf-extract.ts');
const dir = path.join(root, '.codex-logs/search-rebuild-v2');
(async () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(EXTRACTION_VERSION + '.json'));
  const issues = (
    await db.execute(
      "SELECT i.id,i.pdf_url,i.page_count FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE m.language='english'",
    )
  ).rows;
  const report = {
    scope: local ? 'local' : 'remote',
    apply,
    verified: 0,
    withheld: 0,
    skipped: [],
  };
  for (const issue of issues) {
    const documents = files
      .filter((f) => f.startsWith(issue.id + '-'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
      .filter(
        (d) => d.complete && d.sourceUrl === issue.pdf_url && d.version === EXTRACTION_VERSION,
      );
    if (documents.length !== 1) {
      report.skipped.push({ id: issue.id, reason: 'No unique matching source checkpoint' });
      continue;
    }
    const d = documents[0],
      tx = await db.transaction('write');
    try {
      const current = (
        await tx.execute({
          sql: 'SELECT pdf_url,page_count FROM issues WHERE id=?',
          args: [issue.id],
        })
      ).rows[0];
      assert.equal(current.pdf_url, d.sourceUrl);
      assert.equal(Number(current.page_count), d.totalPages);
      assert.equal(d.pages.length, d.totalPages);
      assert.equal(new Set(d.pages.map((p) => p.pageNumber)).size, d.totalPages);
      const expected = d.pages.filter((p) => p.status === 'approved' && p.content.trim());
      const actual = (
        await tx.execute({
          sql: 'SELECT page_number,content,created_at FROM issue_search_index WHERE issue_id=? ORDER BY page_number',
          args: [issue.id],
        })
      ).rows;
      assert.equal(actual.length, expected.length);
      for (const page of expected)
        assert.ok(
          actual.some(
            (r) => Number(r.page_number) === page.pageNumber && r.content === page.content,
          ),
        );
      const review = d.pages.filter((p) => p.status === 'review').map((p) => p.pageNumber),
        blank = d.pages.filter((p) => p.status === 'empty').map((p) => p.pageNumber);
      const indexedAt = actual
        .map((r) => String(r.created_at))
        .sort()
        .at(-1);
      assert.ok(indexedAt);
      assert.match(d.sourceHash, /^[a-f0-9]{64}$/);
      if (apply) {
        await tx.execute({
          sql: `INSERT OR IGNORE INTO issue_indexing_coverage(issue_id,pdf_url,source_hash,extraction_version,total_pages,indexed_pages,blank_pages_json,review_pages_json,indexed_at,evidence) VALUES(?,?,?,?,?,?,?,?,?,'verified_rebuild')`,
          args: [
            issue.id,
            d.sourceUrl,
            d.sourceHash,
            d.version,
            d.totalPages,
            expected.length,
            JSON.stringify(blank),
            JSON.stringify(review),
            indexedAt,
          ],
        });
        await tx.execute({
          sql: `INSERT OR IGNORE INTO indexing_runs(id,issue_id,trigger,status,stage,completed_pages,total_pages,indexed_pages,review_pages,created_at,finished_at,updated_at) VALUES(?,?,'verified_rebuild',?,?, ?,?,?,?,?,?,?)`,
          args: [
            'rebuild-' + issue.id + '-' + d.sourceHash,
            issue.id,
            review.length ? 'review' : 'complete',
            review.length ? 'review' : 'complete',
            d.totalPages,
            d.totalPages,
            expected.length,
            review.length,
            indexedAt,
            indexedAt,
            indexedAt,
          ],
        });
      }
      await tx.commit();
      report.verified++;
      report.withheld += review.length;
    } catch (error) {
      report.skipped.push({
        id: issue.id,
        reason: 'Current index or PDF does not match complete rebuild evidence',
      });
    } finally {
      tx.close();
    }
  }
  console.log(JSON.stringify(report, null, 2));
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
