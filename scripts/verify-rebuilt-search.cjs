// Read-only checks against the configured database, or --local smoke database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const fromWeb = Module.createRequire(path.join(root, 'apps/web/package.json'));
const ts = fromWeb('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  return resolve.call(this, name, parent, ...args);
};
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
process.loadEnvFile(path.join(root, 'apps/web/.env.local'));
const local = process.argv.includes('--local');
const db = fromWeb('@libsql/client').createClient(
  local
    ? { url: 'file:' + path.join(root, '.migration/turso-local-smoke.db').replace(/\\/g, '/') }
    : { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
);
require('../apps/web/src/lib/db/client.ts').getDb = () => db;
(async () => {
  try {
    const { searchIssueText } = require('../apps/web/src/lib/db/search-repository.ts');
    const id = local
      ? '4df4568d-0a39-46e1-a0d0-aafc7d386e93'
      : '4ab3ba26-82f9-4af6-8cf9-ef58f0820b66';
    const results = await searchIssueText({
      query: 'superman',
      yearFrom: 2019,
      yearTo: 2019,
      limit: 500,
    });
    const page = results.find((row) => row.issue_id === id && row.page_number === 4);
    assert.ok(page, 'January 2019 physical page 4 should match');
    assert.match(page.snippet, /When <mark>superman<\/mark> is born/);
    assert.ok(
      !results.some((row) => /¢|\|.*\|.*\|/.test(row.snippet)),
      'No illustrated-cover garbage in snippets',
    );
    const {
      searchReaderPath,
      parseSearchReaderTarget,
      findSearchLines,
    } = require('../apps/web/src/lib/search-reader-target.ts');
    const link = searchReaderPath(id, {
      page: 4,
      query: 'superman',
      excerpt: page.snippet.replace(/<\/?mark>/g, ''),
    });
    assert.ok(link.includes('page=4'));
    const target = parseSearchReaderTarget(new URL(link, 'http://localhost').searchParams);
    const source = (
      await db.execute({
        sql: 'SELECT content FROM issue_search_index WHERE issue_id=? AND page_number=4',
        args: [id],
      })
    ).rows[0].content;
    const located = findSearchLines(
      source
        .split('\n')
        .map((text, i) => ({ text, left: 0, top: i / 100, width: 1, height: 0.01 })),
      target,
    );
    assert.ok(
      located.some((line) => line.text.includes('When superman is born')),
      'Clean excerpt must still select the matching reader line',
    );
    const phrase = await searchIssueText({
      query: 'shall transfigure',
      yearFrom: 2019,
      yearTo: 2019,
      limit: 500,
    });
    assert.ok(phrase.some((row) => row.issue_id === id && row.page_number === 4));
    if (process.argv.includes('--complete')) {
      const { EXTRACTION_VERSION } = require('../apps/web/src/lib/pdf-extract.ts');
      const cacheDir = path.join(root, '.codex-logs/search-rebuild-v2');
      const files = fs
        .readdirSync(cacheDir)
        .filter((file) => file.endsWith(EXTRACTION_VERSION + '.json'));
      const catalogue = (
        await db.execute(
          'SELECT i.id,i.pdf_url,i.page_count,i.is_published,m.language FROM issues i JOIN magazines m ON m.id=i.magazine_id',
        )
      ).rows;
      const eligible = catalogue.filter(
        (issue) =>
          issue.language === 'english' && issue.pdf_url && !issue.pdf_url.includes('.supabase.co/'),
      );
      const scope = local ? 'local' : 'remote';
      const fullRuns = fs
        .readdirSync(cacheDir)
        .filter(
          (file) =>
            file.startsWith(scope + '-') && fs.statSync(path.join(cacheDir, file)).isDirectory(),
        )
        .sort()
        .reverse();
      const fullRun = fullRuns.find((file) => {
        const reportPath = path.join(cacheDir, file, 'report.json');
        if (!fs.existsSync(reportPath)) return false;
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        return (
          report.apply &&
          report.version === EXTRACTION_VERSION &&
          report.inventory.selected === report.inventory.eligible
        );
      });
      assert.ok(fullRun, 'A full-scope apply report is required for final verification');
      const report = JSON.parse(
        fs.readFileSync(path.join(cacheDir, fullRun, 'report.json'), 'utf8'),
      );
      const manifest = JSON.parse(
        fs.readFileSync(path.join(cacheDir, fullRun, 'manifest.json'), 'utf8'),
      );
      assert.equal(
        catalogue.length,
        report.inventory.totalIssues,
        'Catalogue record count changed',
      );
      assert.equal(eligible.length, manifest.length, 'Supported catalogue count changed');
      for (const before of manifest) {
        const after = eligible.find((issue) => issue.id === before.id);
        assert.ok(
          after && after.pdf_url === before.pdf_url && after.is_published === before.is_published,
          `Issue source/publication changed: ${before.id}`,
        );
      }
      let physicalPages = 0;
      let indexedPages = 0;
      let reviewPages = 0;
      let emptyPages = 0;
      for (const issue of eligible) {
        const checkpoints = files
          .filter((file) => file.startsWith(issue.id + '-'))
          .map((file) => JSON.parse(fs.readFileSync(path.join(cacheDir, file), 'utf8')))
          .filter((document) => document.complete && document.sourceUrl === issue.pdf_url);
        assert.equal(
          checkpoints.length,
          1,
          `Expected one complete current-source checkpoint for ${issue.id}`,
        );
        const document = checkpoints[0];
        const expected = document.pages.filter(
          (page) => page.status === 'approved' && page.content.trim(),
        );
        const actual = (
          await db.execute({
            sql: 'SELECT page_number,content FROM issue_search_index WHERE issue_id=? ORDER BY page_number',
            args: [issue.id],
          })
        ).rows;
        assert.equal(
          Number(issue.page_count),
          document.totalPages,
          `Physical page count differs for ${issue.id}`,
        );
        assert.equal(actual.length, expected.length, `Indexed page count differs for ${issue.id}`);
        assert.equal(
          new Set(actual.map((page) => page.page_number)).size,
          actual.length,
          `Duplicate page numbers for ${issue.id}`,
        );
        for (const page of expected) {
          assert.ok(
            actual.some(
              (row) => Number(row.page_number) === page.pageNumber && row.content === page.content,
            ),
            `Index differs from approved extraction: ${issue.id} page ${page.pageNumber}`,
          );
        }
        physicalPages += document.totalPages;
        indexedPages += actual.length;
        reviewPages += document.pages.filter((page) => page.status === 'review').length;
        emptyPages += document.pages.filter((page) => page.status === 'empty').length;
      }
      console.log(
        JSON.stringify({
          verification:
            'Every supported English index matches its complete current-source extraction checkpoint',
          issues: eligible.length,
          physicalPages,
          indexedPages,
          reviewPages,
          emptyPages,
        }),
      );
    }
    const stats = await db.execute(
      `SELECT m.language,count(DISTINCT i.id) AS indexed_issues,count(*) AS indexed_pages FROM issue_search_index s JOIN issues i ON i.id=s.issue_id JOIN magazines m ON m.id=i.magazine_id GROUP BY m.language`,
    );
    console.log(
      JSON.stringify({
        scope: local ? 'local' : 'remote',
        status: 'PASS',
        sample: page.snippet,
        coverage: stats.rows,
      }),
    );
  } finally {
    db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
