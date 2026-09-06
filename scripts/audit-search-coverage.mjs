// Read-only audit. Outputs aggregate metadata, never credentials or indexed page text.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
process.loadEnvFile(fileURLToPath(new URL('../apps/web/.env.local', import.meta.url)));
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const now = new Date();
const india = new Date(+now + 330 * 60_000);
const year = india.getUTCFullYear() - 5;
const month = india.getUTCMonth() + 1;
try {
  const { rows } = await db.execute({
    sql: `SELECT i.id, i.title, m.language, i.page_count AS expected_pages,
      CASE WHEN i.year < ? OR (i.year = ? AND i.month <= ?) THEN 1 ELSE 0 END AS readable,
      count(idx.page_number) AS index_rows,
      count(DISTINCT idx.page_number) AS indexed_pages,
      count(DISTINCT CASE WHEN length(trim(idx.content)) > 0 THEN idx.page_number END) AS nonempty_pages,
      sum(CASE WHEN idx.page_number IS NOT NULL AND (idx.page_number < 1 OR (i.page_count > 0 AND idx.page_number > i.page_count)) THEN 1 ELSE 0 END) AS out_of_range,
      sum(CASE WHEN length(trim(idx.content)) BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS short_text_pages
      FROM issues i JOIN magazines m ON m.id = i.magazine_id
      LEFT JOIN issue_search_index idx ON idx.issue_id = i.id
      WHERE i.is_published = 1 AND i.pdf_url NOT LIKE '%.supabase.co/%' AND trim(i.pdf_url) <> ''
      GROUP BY i.id ORDER BY m.language, i.year DESC, i.month DESC`,
    args: [year, year, month],
  });
  let fts;
  try {
    await db.execute("SELECT fts_match(content, 'grace') FROM issue_search_index LIMIT 1");
    fts = 'fts_match available';
  } catch (error) {
    fts = /no such function|fts_match|near.*USING/.test(String(error)) ? 'fts_match unavailable; repository uses LIKE fallback' : 'FTS probe failed; investigate separately';
  }
  const languages = [...new Set(rows.map(r => r.language))].map(language => {
    const group = rows.filter(r => r.language === language);
    return { language, listed: group.length, readable: group.filter(r => r.readable).length,
      indexedIssues: group.filter(r => Number(r.indexed_pages) > 0).length,
      readableIndexedIssues: group.filter(r => r.readable && Number(r.indexed_pages) > 0).length,
      unknownPageCounts: group.filter(r => !r.expected_pages).length,
      indexedPages: group.reduce((sum,r)=>sum+Number(r.indexed_pages),0),
      nonemptyPages: group.reduce((sum,r)=>sum+Number(r.nonempty_pages),0),
      outOfRange: group.reduce((sum,r)=>sum+Number(r.out_of_range),0),
      shortTextPages: group.reduce((sum,r)=>sum+Number(r.short_text_pages),0) };
  });
  console.log(JSON.stringify({ date: now.toISOString(), fts, languages,
    indexedIssues: rows.filter(r => Number(r.indexed_pages) > 0),
    ...(process.argv.includes('--details') ? { rows } : {}) }));
} finally { db.close(); }
