// Read-only measurements against the configured database; no asset or data writes.
const path = require('node:path');
const { createRequire } = require('node:module');
const { root, fromWeb } = require('./register-web-typescript.cjs');
createRequire(fromWeb.resolve('next/package.json'))('@next/env').loadEnvConfig(path.join(root, 'apps/web'), false, { info() {}, error() {} });
const { getDb } = require('../apps/web/src/lib/db/client.ts');
const pub = require('../apps/web/src/lib/db/public-repository.ts');
const search = require('../apps/web/src/lib/db/search-repository.ts');
(async () => {
  const db = getDb();
  const years = await pub.listHomeShelfYears();
  const shelf = await pub.listHomeShelfIssues(240, years.at(-1)?.year);
  const result = { shelf: { rows: shelf.length, years: years.length, jsonBytes: Buffer.byteLength(JSON.stringify({ years, issues: shelf })) }, search: [] };
  result.index = (await db.execute('SELECT count(*) AS pages FROM issue_text_fts')).rows;
  result.plan = (await db.execute({ sql: 'EXPLAIN QUERY PLAN SELECT rowid FROM issue_text_fts WHERE issue_text_fts MATCH ?', args: ['"mother"'] })).rows;
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    const rows = await search.searchIssueText({ query: 'mother', limit: 50 });
    result.search.push({ ms: Math.round(performance.now() - start), rows: rows.length });
  }
  console.log(JSON.stringify(result, null, 2));
  db.close();
})().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, '[endpoint]')); process.exitCode = 1; });
