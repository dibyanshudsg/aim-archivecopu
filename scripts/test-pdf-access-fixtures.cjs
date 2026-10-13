// P2-02 fixture validation, NOT proof of the future P2-03 access gate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { pathToFileURL } = require('node:url');
const fixture = require('./fixtures/pdf-access.cjs');
global.fetch = async () => { throw new Error('Networking forbidden in fixture validation'); };
const { root, fromWeb } = require('./register-web-typescript.cjs');
const { isEmbargoed } = require('../apps/web/src/lib/embargo.ts');
const db = new DatabaseSync(':memory:');
(async () => {
  db.exec(fs.readFileSync(path.join(root, 'packages/turso/migrations/00001_initial_schema.sql'), 'utf8'));
  db.prepare('INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES(?,?,?,?,?)')
    .run('fixture-magazine', 'Synthetic magazine', 'english', fixture.now, fixture.now);
  const objects = fixture.createObjects();
  const { loadImage } = fromWeb('canvas');
  const pdfjs = await import(pathToFileURL(fromWeb.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
  for (const issue of fixture.issues) {
    const image = await loadImage(objects.get(`fixtures/${issue.name}.png`).body);
    assert.equal(image.width, 1);
    assert.equal(image.height, 1);
    const object = objects.get(`fixtures/${issue.name}.pdf`);
    db.prepare(`INSERT INTO issues(id,magazine_id,title,year,month,is_published,pdf_url,cover_image_url,file_size_bytes,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(issue.id, issue.magazine_id, issue.title, issue.year, issue.month,
        issue.is_published, issue.pdf_url, issue.cover_image_url, object.body.length, fixture.now, fixture.now);
    assert.equal(Boolean(issue.is_published) && !isEmbargoed(issue.year, issue.month, new Date(fixture.now)), issue.expected.publicPdf);
    assert.equal(Boolean(issue.is_published), issue.expected.publicCover);
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(object.body), useSystemFonts: true }).promise;
    try {
      assert.equal(pdf.numPages, 1);
      const text = await (await pdf.getPage(1)).getTextContent();
      assert.ok(text.items.some(item => item.str === `Synthetic ${issue.name}`));
    } finally { await pdf.destroy(); }
  }
  for (const test of fixture.boundaryCases) assert.equal(isEmbargoed(2021, 10, new Date(test.at)), test.embargoed);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM issues').get().n, 6);
  // Replacement/revocation scenarios use disposable rows, never production.
  const released = fixture.issues[0];
  db.prepare('UPDATE issues SET is_published=0 WHERE id=?').run(released.id);
  assert.equal(db.prepare('SELECT is_published FROM issues WHERE id=?').get(released.id).is_published, 0);
  const replacement = `${fixture.currentBase}/fixtures/released-revision.pdf`;
  objects.set('fixtures/released-revision.pdf', { contentType: 'application/pdf', body: objects.get('fixtures/released.pdf').body });
  db.prepare('UPDATE issues SET pdf_url=? WHERE id=?').run(replacement, released.id);
  assert.notEqual(db.prepare('SELECT pdf_url FROM issues WHERE id=?').get(released.id).pdf_url, released.pdf_url);
  console.log('PASS: six schema-valid issues, six parsed one-page PDFs, six decoded PNGs, three IST boundary instants, disposable publication/replacement scenarios; no network or persistent database. Access-gate tests remain P2-03/07.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
