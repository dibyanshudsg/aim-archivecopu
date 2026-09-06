// Resumable English-only extraction/reindex. Default: extract/review without writes.
// --apply commits validated issues; --local targets only the local smoke DB.
// --ids a,b selects explicit IDs; --limit N allows a bounded pilot.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const fromWeb = Module.createRequire(path.join(root, 'apps/web/package.json'));
const ts = fromWeb('typescript');
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
const { extractPdfText, EXTRACTION_VERSION } = require('../apps/web/src/lib/pdf-extract.ts');
const { createClient } = fromWeb('@libsql/client');
process.loadEnvFile(path.join(root, 'apps/web/.env.local'));
const local = process.argv.includes('--local');
const apply = process.argv.includes('--apply');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  const value = process.argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
};
const ids = arg('--ids')?.split(',');
const limit = Number(arg('--limit') || Infinity);
if (ids?.some((id) => !/^[a-f0-9-]{36}$/i.test(id))) throw new Error('Invalid issue ID list');
if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1))
  throw new Error('--limit must be a positive integer');
const dir = path.join(root, '.codex-logs', 'search-rebuild-v2');
fs.mkdirSync(dir, { recursive: true });
const scope = local ? 'local' : 'remote';
const runDir = path.join(dir, `${scope}-${Date.now()}`);
fs.mkdirSync(runDir, { recursive: true });
const db = createClient(
  local
    ? { url: 'file:' + path.join(root, '.migration/turso-local-smoke.db').replace(/\\/g, '/') }
    : { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const json = (file, value) => {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
};
const lock = path.join(dir, scope + '.lock');
let lockHandle;
const report = {
  scope,
  apply,
  version: EXTRACTION_VERSION,
  startedAt: new Date().toISOString(),
  outcomes: [],
};

// v5 changes only standard-font availability during OCR rendering. Reuse v4
// extraction if its OCR pages do not request standard fonts. For an affected
// PDF, retain native text and re-OCR every image-rendered page conservatively.
async function reusableV4Pages(buffer, document) {
  const { pathToFileURL } = require('node:url');
  const pdfjs = await import(
    pathToFileURL(fromWeb.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  );
  const fontDir = path.join(
    path.dirname(fromWeb.resolve('pdfjs-dist/package.json')),
    'standard_fonts',
  );
  let requestedStandardFont = false;
  class FontProbe {
    async fetch({ filename }) {
      requestedStandardFont = true;
      return new Uint8Array(await fs.promises.readFile(path.join(fontDir, filename)));
    }
  }
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    StandardFontDataFactory: FontProbe,
    useWorkerFetch: false,
  }).promise;
  try {
    for (const page of document.pages.filter((page) => page.method === 'ocr')) {
      const pdfPage = await pdf.getPage(page.pageNumber);
      // Text parsing loads the same font resources without decoding page images.
      try {
        await pdfPage.getTextContent();
      } finally {
        pdfPage.cleanup();
      }
      if (requestedStandardFont) break;
    }
  } finally {
    await pdf.destroy();
  }
  return {
    pages: requestedStandardFont
      ? document.pages.filter((page) => page.method === 'native')
      : document.pages,
    requestedStandardFont,
  };
}

async function main() {
  lockHandle = fs.openSync(lock, 'wx');
  fs.writeSync(lockHandle, String(process.pid));
  const { rows } = await db.execute(
    `SELECT i.id,i.title,i.pdf_url,i.updated_at,i.page_count,i.is_published,m.language FROM issues i JOIN magazines m ON m.id=i.magazine_id ORDER BY i.year DESC,i.month DESC,i.id`,
  );
  const eligible = rows.filter(
    (row) => row.language === 'english' && row.pdf_url && !row.pdf_url.includes('.supabase.co/'),
  );
  const selected = eligible.filter((row) => !ids || ids.includes(row.id)).slice(0, limit);
  if (ids?.some((id) => !eligible.some((row) => row.id === id)))
    throw new Error('Requested issue is missing or outside the supported English/PDF scope');
  report.inventory = {
    totalIssues: rows.length,
    eligible: eligible.length,
    selected: selected.length,
    excluded: rows
      .filter((row) => !eligible.includes(row))
      .map((row) => ({
        id: row.id,
        language: row.language,
        reason:
          row.language !== 'english' ? 'outside English-only scope' : 'legacy/missing PDF source',
      })),
  };
  json(path.join(runDir, 'manifest.json'), selected);
  const excludedIds = report.inventory.excluded.map((row) => row.id);
  const excludedSql = excludedIds.length
    ? `SELECT * FROM issue_search_index WHERE issue_id IN (${excludedIds.map(() => '?').join(',')}) ORDER BY issue_id,page_number,id`
    : null;
  const excludedBefore = excludedSql
    ? (await db.execute({ sql: excludedSql, args: excludedIds })).rows
    : [];
  json(path.join(runDir, 'excluded-index-backup.json'), excludedBefore);
  report.excludedIndexHashBefore = hash(JSON.stringify(excludedBefore));
  console.log(
    JSON.stringify({
      scope,
      apply,
      selected: selected.length,
      excluded: report.inventory.excluded.length,
      runDir,
    }),
  );
  for (const [index, issue] of selected.entries()) {
    const started = Date.now();
    const out = { id: issue.id, title: issue.title };
    try {
      const sourceFile = path.join(dir, hash(issue.pdf_url) + '.pdf');
      // Revalidate source on every run; 304 reuses cached bytes while still
      // detecting replacements at an unchanged URL.
      const sourceMetaFile = sourceFile + '.json';
      let previous;
      try {
        previous = JSON.parse(fs.readFileSync(sourceMetaFile, 'utf8'));
      } catch {}
      const headers =
        previous?.etag && fs.existsSync(sourceFile) ? { 'If-None-Match': previous.etag } : {};
      const response = await fetch(issue.pdf_url, { headers, signal: AbortSignal.timeout(90000) });
      let buffer;
      if (response.status === 304) buffer = fs.readFileSync(sourceFile);
      else {
        if (!response.ok) throw new Error(`PDF download HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.subarray(0, 1024).indexOf('%PDF-') < 0) throw new Error('Source is not a PDF');
        fs.writeFileSync(sourceFile, buffer);
        json(sourceMetaFile, { etag: response.headers.get('etag'), sourceUrl: issue.pdf_url });
      }
      const sourceHash = hash(buffer);
      const checkpointFile = path.join(dir, `${issue.id}-${sourceHash}-${EXTRACTION_VERSION}.json`);
      let checkpoint;
      try {
        checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      } catch {}
      let pages =
        checkpoint?.version === EXTRACTION_VERSION && checkpoint.sourceHash === sourceHash
          ? checkpoint.pages
          : [];
      if (!pages.length && EXTRACTION_VERSION === 'native-first-english-v5') {
        const legacyFile = path.join(dir, `${issue.id}-${sourceHash}-native-first-english-v4.json`);
        if (fs.existsSync(legacyFile)) {
          const legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
          if (
            legacy.complete &&
            legacy.sourceHash === sourceHash &&
            legacy.sourceUrl === issue.pdf_url
          ) {
            const reuse = await reusableV4Pages(buffer, legacy);
            pages = reuse.pages;
            out.reusedV4Pages = pages.length;
            out.standardFontRepair = reuse.requestedStandardFont;
          }
        }
      }
      const extracted = await extractPdfText(buffer, undefined, {
        cachedPages: pages,
        ocrCachePath: dir,
        onPage: async (page, totalPages) => {
          pages.push(page);
          json(checkpointFile, {
            version: EXTRACTION_VERSION,
            sourceHash,
            sourceUrl: issue.pdf_url,
            totalPages,
            pages,
            complete: false,
          });
        },
      });
      json(checkpointFile, { ...extracted, sourceHash, sourceUrl: issue.pdf_url, complete: true });
      const searchable = extracted.pages.filter(
        (page) => page.status === 'approved' && page.content.trim(),
      );
      const review = extracted.pages.filter((page) => page.status === 'review');
      if (!searchable.length) throw new Error('No reliable text; existing index retained');
      if (review.length > Math.max(4, Math.floor(extracted.totalPages * 0.15)))
        throw new Error(
          `Too many uncertain pages (${review.length}/${extracted.totalPages}); existing index retained for review`,
        );
      Object.assign(out, {
        physicalPages: extracted.totalPages,
        indexedPages: searchable.length,
        nativePages: extracted.pages.filter((page) => page.method === 'native').length,
        ocrPages: extracted.pages.filter((page) => page.method === 'ocr').length,
        reviewPages: review.map((page) => page.pageNumber),
        emptyPages: extracted.pages
          .filter((page) => page.status === 'empty')
          .map((page) => page.pageNumber),
        rejectedLines: extracted.pages.reduce(
          (n, page) => n + (page.lines || []).filter((line) => !line.accepted).length,
          0,
        ),
        sourceHash,
      });
      if (apply) {
        const tx = await db.transaction('write');
        try {
          const current = (
            await tx.execute({
              sql: 'SELECT i.pdf_url,i.updated_at,m.language FROM issues i JOIN magazines m ON m.id=i.magazine_id WHERE i.id=?',
              args: [issue.id],
            })
          ).rows[0];
          if (
            !current ||
            current.pdf_url !== issue.pdf_url ||
            current.updated_at !== issue.updated_at ||
            current.language !== 'english'
          )
            throw new Error('Issue changed during extraction; no replacement performed');
          const oldRows = (
            await tx.execute({
              sql: 'SELECT * FROM issue_search_index WHERE issue_id=? ORDER BY page_number',
              args: [issue.id],
            })
          ).rows;
          json(path.join(runDir, issue.id + '-backup.json'), { issue, index: oldRows });
          const same =
            Number(issue.page_count) === extracted.totalPages &&
            oldRows.length === searchable.length &&
            searchable.every((page) =>
              oldRows.some(
                (row) =>
                  Number(row.page_number) === page.pageNumber && row.content === page.content,
              ),
            );
          if (same) out.status = 'unchanged';
          else {
            await tx.execute({
              sql: 'DELETE FROM issue_search_index WHERE issue_id=?',
              args: [issue.id],
            });
            await tx.batch(
              searchable.map((page) => ({
                sql: 'INSERT INTO issue_search_index(id,issue_id,page_number,content,created_at) VALUES(?,?,?,?,?)',
                args: [
                  crypto.randomUUID(),
                  issue.id,
                  page.pageNumber,
                  page.content,
                  new Date().toISOString(),
                ],
              })),
            );
            await tx.execute({
              sql: 'UPDATE issues SET page_count=?,updated_at=? WHERE id=?',
              args: [extracted.totalPages, new Date().toISOString(), issue.id],
            });
            out.status = 'indexed';
          }
          await tx.commit();
        } catch (error) {
          await tx.rollback();
          throw error;
        } finally {
          tx.close();
        }
      } else out.status = 'extracted';
    } catch (error) {
      out.status = 'failed';
      out.error = error.message;
    }
    out.seconds = +((Date.now() - started) / 1000).toFixed(2);
    report.outcomes.push(out);
    json(path.join(runDir, 'report.json'), report);
    console.log(JSON.stringify({ progress: `${index + 1}/${selected.length}`, ...out }));
  }
  report.completedAt = new Date().toISOString();
  const excludedAfter = excludedSql
    ? (await db.execute({ sql: excludedSql, args: excludedIds })).rows
    : [];
  report.excludedIndexHashAfter = hash(JSON.stringify(excludedAfter));
  report.excludedIndexesUnchanged =
    report.excludedIndexHashBefore === report.excludedIndexHashAfter;
  json(path.join(runDir, 'report.json'), report);
  console.log(
    JSON.stringify({
      completed: true,
      counts: report.outcomes.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] || 0) + 1;
        return counts;
      }, {}),
      report: path.join(runDir, 'report.json'),
    }),
  );
  if (report.outcomes.some((row) => row.status === 'failed')) process.exitCode = 1;
  if (!report.excludedIndexesUnchanged) {
    console.error('Excluded indexes changed during this run; investigate concurrent writers.');
    process.exitCode = 1;
  }
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
    if (lockHandle !== undefined) {
      fs.closeSync(lockHandle);
      fs.unlinkSync(lock);
    }
  });
