// Isolated regression checks: no remote requests or object writes.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
require('./register-web-typescript.cjs');
const { isSupportedAssetUrl, supportedAssetSql } = require('../apps/web/src/lib/asset-url.ts');
const { storageKeyFromUrl } = require('../apps/web/src/lib/r2-client.ts');
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE issues(pdf_url TEXT)');
process.env.R2_PUBLIC_BASE_URL = 'https://assets.example';
process.env.R2_LEGACY_PUBLIC_BASE_URLS = 'https://old.example';
for (const [url, expected] of [
  ['https://assets.example/a.pdf', true], ['https://old.example/a%20b.pdf?v=2', true],
  ['https://assets.example.attacker.test/a.pdf', false], ['https://assets.example@attacker.test/a.pdf', false],
  ['https://unconfigured.example/magazines/a.pdf', false], ['https://assets.example/', false],
  ['', false], [null, false], ['http://assets.example/a.pdf', false],
]) {
  db.exec('DELETE FROM issues');
  db.prepare('INSERT INTO issues VALUES (?)').run(url);
  assert.equal(isSupportedAssetUrl(url), expected);
  assert.equal(Boolean(db.prepare('SELECT ' + supportedAssetSql('pdf_url') + ' AS usable FROM issues').get().usable), expected);
}
assert.equal(storageKeyFromUrl('https://unconfigured.example/magazines/a.pdf'), null);
assert.equal(storageKeyFromUrl('https://old.example/a%20b.pdf?v=2'), 'a b.pdf');
process.env.R2_PUBLIC_BASE_URL = "https://assets.example/quote'_%";
const url = "https://assets.example/quote'_%/a.pdf";
db.exec('DELETE FROM issues'); db.prepare('INSERT INTO issues VALUES (?)').run(url);
assert.equal(db.prepare('SELECT ' + supportedAssetSql('pdf_url') + ' AS usable FROM issues').get().usable, 1);
delete process.env.R2_PUBLIC_BASE_URL;
assert.equal(isSupportedAssetUrl(url), false);
assert.equal(db.prepare('SELECT ' + supportedAssetSql('pdf_url') + ' AS usable FROM issues').get().usable, 0);
db.close();
console.log('PASS configured asset origins, aliases, missing/null inputs, host spoofing, SQL literal escaping and unrelated-key rejection.');
