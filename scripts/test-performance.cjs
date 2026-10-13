// Local regression checks: no credentials or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
require('./register-web-typescript.cjs');
const { TtlCache, AsyncTtlCache } = require('../apps/web/src/lib/ttl-cache.ts');

(async () => {
  const realNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    const cache = new TtlCache(100, 3);
    cache.set('a', 1); cache.set('b', 2); cache.set('c', 3);
    assert.equal(cache.get('a'), 1);
    cache.set('d', 4);
    assert.equal(cache.get('b'), undefined, 'least recently used entry evicted');
    for (let i = 0; i < 1000; i++) cache.set(String(i), i);
    assert.equal(cache.size, 3);
    now += 101; cache.set('new', 1);
    assert.equal(cache.size, 1, 'untouched expired entries swept');
    const asyncCache = new AsyncTtlCache(100, 3);
    let calls = 0;
    const first = asyncCache.get('same', async () => ++calls);
    assert.equal(asyncCache.get('same', async () => ++calls), first);
    assert.equal(await first, 1);
    let reject;
    const old = asyncCache.get('race', () => new Promise((_, fail) => { reject = fail; }));
    await Promise.resolve();
    now += 101;
    asyncCache.set('race', 42);
    reject(new Error('old failure'));
    await assert.rejects(old);
    assert.equal(await asyncCache.get('race', async () => 0), 42);
    console.log('PASS bounded LRU, expiry sweep, deduplication and rejection replacement race');
  } finally { Date.now = realNow; }

  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE issue_search_index (content TEXT)');
  const contents = ['Motherly love', 'Divine\nGrace', 'श्री अरविन्द और माता', '100% devotion_understood', 'Say "yes"', 'माँ'];
  const insert = db.prepare('INSERT INTO issue_search_index VALUES (?)');
  contents.forEach(content => insert.run(content));
  const migration = fs.readFileSync('packages/turso/migrations/00007_substring_search.sql', 'utf8');
  db.exec(migration);
  const indexed = db.prepare('SELECT rowid FROM issue_text_fts WHERE issue_text_fts MATCH ? ORDER BY rowid');
  const scan = db.prepare("SELECT rowid FROM issue_search_index WHERE lower(replace(replace(content, char(10), ' '), char(13), ' ')) LIKE ? ESCAPE '\\' ORDER BY rowid");
  for (const q of ['mother', 'Divine Grace', 'अरविन्द', '100%', '_under', '"yes"', 'माँ']) {
    const phrase = `"${q.toLowerCase().replace(/"/g, '""')}"`;
    const pattern = `%${q.toLowerCase().replace(/[\\%_]/g, x => '\\' + x)}%`;
    assert.deepEqual(indexed.all(phrase), scan.all(pattern), q);
  }
  db.exec("UPDATE issue_search_index SET content = 'new searchable phrase' WHERE rowid = 1");
  assert.equal(indexed.all('"mother"').length, 0);
  assert.equal(indexed.all('"searchable"').length, 1);
  db.exec('DELETE FROM issue_search_index WHERE rowid = 1');
  assert.equal(indexed.all('"searchable"').length, 0);
  db.exec(migration);
  assert.equal(db.prepare('SELECT count(*) n FROM issue_text_fts').get().n, 5);
  assert.match(JSON.stringify(db.prepare('EXPLAIN QUERY PLAN SELECT rowid FROM issue_text_fts WHERE issue_text_fts MATCH ?').all('"grace"')), /VIRTUAL TABLE INDEX/);
  db.exec(`CREATE TABLE magazines(id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE issues(id TEXT PRIMARY KEY,magazine_id TEXT,title TEXT,theme TEXT,description TEXT,topics_json TEXT);
    CREATE TABLE indexing_runs(job_id TEXT,created_at TEXT);
    INSERT INTO magazines VALUES ('m','Magazine');
    INSERT INTO issues VALUES ('i','m','Motherly','Animals','श्री अरविन्द','[]');`);
  const metadataMigration = fs.readFileSync('packages/turso/migrations/00008_metadata_search.sql', 'utf8');
  db.exec(metadataMigration);
  db.prepare('UPDATE issues SET topics_json=?').run(JSON.stringify(['say "yes"', '100% devotion']));
  const metadata = db.prepare('SELECT rowid FROM issue_metadata_fts WHERE issue_metadata_fts MATCH ?');
  for (const query of ['mother', 'animals', 'अरविन्द', 'say "yes"', '100%']) {
    assert.equal(metadata.all(`"${query.replace(/"/g, '""')}"`).length, 1, query);
  }
  db.exec("UPDATE magazines SET name='Renamed publication'");
  assert.equal(metadata.all('"magazine"').length, 0);
  assert.equal(metadata.all('"renamed"').length, 1);
  db.exec("DELETE FROM issues WHERE id='i'");
  assert.equal(metadata.all('"renamed"').length, 0);
  db.exec(metadataMigration);
  db.close();
  console.log('PASS indexed substring/phrase/Hindi/literal wildcard parity, triggers, rerun and query plan');
})().catch(error => { console.error(error); process.exitCode = 1; });
