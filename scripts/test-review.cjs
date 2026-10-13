process.env.R2_PUBLIC_BASE_URL = 'https://assets.example';
process.env.R2_LEGACY_PUBLIC_BASE_URLS = '';
// Run with node scripts/test-review.cjs. No credentials or live database needed.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/web/node_modules/typescript'));
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  return resolve.call(this, name, parent, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);

const embargo = require('../apps/web/src/lib/embargo.ts');
for (const [year, month, instant] of [
  [2021, 9, '2026-08-31T18:30:00.000Z'],
  [2021, 12, '2026-11-30T18:30:00.000Z'],
  [2022, 1, '2026-12-31T18:30:00.000Z'],
]) {
  const at = new Date(instant);
  assert.equal(embargo.computeEmbargoLiftDate(year, month).toISOString(), instant);
  assert.equal(embargo.isEmbargoed(year, month, new Date(+at - 1)), true);
  assert.equal(embargo.isEmbargoed(year, month, at), false);
  assert.equal(embargo.isEmbargoed(year, month, new Date(+at + 1)), false);
  assert.deepEqual(embargo.readableCutoffIssueMonth(at), { year, month });
}

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE magazines (id TEXT, name TEXT, language TEXT, description TEXT, cover_image_url TEXT, created_at TEXT);
CREATE TABLE issues (id TEXT, magazine_id TEXT, title TEXT, theme TEXT, year INTEGER, month INTEGER, description TEXT,
topics_json TEXT, pdf_url TEXT, epub_url TEXT, mobi_url TEXT, cover_image_url TEXT, page_count INTEGER,
file_size_bytes INTEGER, read_count INTEGER, download_count INTEGER, is_published INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE issue_search_index (issue_id TEXT, page_number INTEGER, content TEXT);
CREATE TABLE indexing_runs (job_id TEXT, created_at TEXT);
INSERT INTO magazines VALUES ('m', 'All India Magazine', 'english', '', NULL, '2020-01-01');`);
const cutoff = embargo.readableCutoffIssueMonth();
const add = db.prepare('INSERT INTO issues (id, magazine_id, title, theme, year, month, pdf_url, is_published, created_at, topics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const [id, year, month, pdf, published] of [
  ['public', cutoff.year, cutoff.month, 'https://assets.example/public.pdf', 1],
  ['older', cutoff.year - 1, 1, 'https://assets.example/older.pdf', 1],
  ['draft', cutoff.year, cutoff.month, 'https://assets.example/draft.pdf', 0],
  ['locked', cutoff.year + 1, 1, 'https://assets.example/locked.pdf', 1],
  ['missing', cutoff.year, cutoff.month, '', 1],
  ['legacy', cutoff.year, cutoff.month, 'https://unconfigured.example/storage.pdf', 1],
]) add.run(id, 'm', `${id} title`, 'Animals', year, month, pdf, published, '2026-01-01', '["Faith"]');

const client = require('../apps/web/src/lib/db/client.ts');
const statements = [];
const execute = async (input) => {
  const sql = typeof input === 'string' ? input : input.sql;
  statements.push(sql);
  return { rows: db.prepare(sql).all(...(typeof input === 'string' ? [] : input.args ?? [])) };
};
client.getDb = () => ({ execute, batch: inputs => Promise.all(inputs.map(execute)) });

(async () => {
  db.exec(fs.readFileSync(path.join(root, 'packages/turso/migrations/00007_substring_search.sql'), 'utf8'));
  db.exec(fs.readFileSync(path.join(root, 'packages/turso/migrations/00008_metadata_search.sql'), 'utf8'));
  const repo = require('../apps/web/src/lib/db/public-repository.ts');
  const shelf = await repo.listHomeShelfIssues(1);
  assert.deepEqual(shelf.map((i) => i.id), ['public'], 'locked/draft/unusable rows must be excluded before LIMIT');
  assert.equal(shelf[0].is_embargoed, false);
  const summary = await repo.getPublicCollectionSummary();
  assert.deepEqual(summary, { listed: 3, readable: 2, languages: ['English'] });
  assert.equal('description' in shelf[0], false, 'shelf DTO excludes full article descriptions');
  const related = await repo.listRelatedReadableIssues(await repo.getPublicIssueById('public'));
  assert.deepEqual(related.map(i=>i.id), ['older'], 'related issues exclude self, drafts, restrictions and missing PDFs');
  console.log('PASS: IST release boundaries, readable cutoff, shelf SQL filtering before limit, scoped catalogue counts.');
  const search = require('../apps/web/src/lib/db/search-repository.ts');
  db.exec("INSERT INTO issue_search_index VALUES ('public', 7, 'Divine Grace <script>unsafe</script>'), ('locked', 3, 'Divine Grace RESTRICTED_CANARY');");
  assert.equal((await search.searchIssueMetadata({query:'Animals'})).length, 2);
  assert.equal((await search.searchIssueMetadata({query:'Animals',availability:'all'})).length, 3);
  assert.deepEqual((await search.searchIssueMetadata({query:'Animals',availability:'subscriber'})).map(i=>i.id), ['locked']);
  assert.equal((await search.searchIssueMetadata({query:'%'})).length, 0, 'literal wildcard must not match everything');
  const text = await search.searchIssueText({query:'Divine Grace'});
  assert.equal(text.length, 1); assert.equal(text[0].page_number, 7); assert.equal(text[0].match_kind, 'page_text');
  assert.ok(!text[0].snippet.includes('<script>'));
  const lockedText = await search.searchIssueText({query:'Divine Grace', availability:'subscriber'});
  assert.equal(lockedText[0].page_number, null); assert.equal(lockedText[0].pdf_url, null);
  assert.ok(!lockedText[0].snippet.includes('RESTRICTED_CANARY'));
  assert.deepEqual(await search.listSearchTopics({query:''}), ['Faith']);
  const { GET } = require('../apps/web/src/app/api/search/route.ts');
  const { NextRequest } = require('../apps/web/node_modules/next/server');
  const request = (query) => GET(new NextRequest('http://localhost/api/search?'+query));
  const metadata = await (await request('q=Animals')).json();
  assert.equal(metadata.type, 'matches'); assert.equal(metadata.total, 2);
  assert.ok(metadata.data.every(i=>i.match_kind==='theme' && i.page_number===null));
  assert.equal((await request('q=Animals&year_from=2025&year_to=2020')).status, 400);
  assert.equal((await request('q=Animals&availability=invalid')).status, 400);
  assert.equal((await (await request('q=nonsense')).json()).total, 0);
  const { parsePublicIssueListInput } = require('../apps/web/src/lib/public-issues.ts');
  const browseInput = parsePublicIssueListInput({ q: 'Animals', page_size: '1' });
  const firstPage = await repo.listPublicIssues(browseInput);
  assert.equal(firstPage.total, 2);
  statements.length = 0;
  const secondPage = await repo.listPublicIssues({ ...browseInput, page: 2, sort: 'title' });
  assert.equal(secondPage.data.length, 1);
  assert.equal(statements.length, 1, 'page/sort changes execute only the row query, sharing counts and facets');
  assert.equal((await repo.listPublicIssues(parsePublicIssueListInput({ q: '%' }))).total, 0);
  assert.deepEqual((await repo.listHomeShelfIssues(240, cutoff.year - 1)).map(row => row.id), ['older']);
  client.getDb = () => ({ execute: async () => { throw new Error('offline'); } });
  assert.equal((await request('q=Animals')).status, 503);
  console.log('PASS: search availability, literal wildcard, metadata provenance, page navigation, restricted snippet redaction, topic suggestions, validation, empty state, database error response.');
  db.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
