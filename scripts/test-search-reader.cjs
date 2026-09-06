// Run with node scripts/test-search-reader.cjs. No credentials or live writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../apps/web/node_modules/typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { findSearchLines, parseSearchReaderTarget, searchReaderPath } = require('../apps/web/src/lib/search-reader-target.ts');
const line = (text, top) => ({ text, left: 0.1, top, width: 0.8, height: 0.025 });
const target = { page: 4, query: 'superman', excerpt: "When superman is born as Nature's king His presence shall transfigure Matter's world" };
const lines = [line('Descent of the Superman', 0.1), line("When superman is born as Nature's king", 0.5), line("His presence shall transfigure Matter's world", 0.53)];
assert.equal(findSearchLines(lines, target)[0].top, 0.5, 'excerpt context must prefer the body occurrence over a repeated title');
assert.deepEqual(findSearchLines([line('The divine', 0.4), line('grace comes to all.', 0.43)], { ...target, query: 'divine grace', excerpt: 'The divine grace comes to all.' }).map(l => l.top), [0.4, 0.43], 'phrase spanning lines highlights both lines');
assert.equal(findSearchLines([line('जीवन में दिव्य कृपा', 0.5)], { ...target, query: 'दिव्य कृपा', excerpt: '' }).length, 1);
assert.equal(findSearchLines([line('A literal C++ example', 0.5)], { ...target, query: 'C++', excerpt: '' }).length, 1);
assert.deepEqual(findSearchLines(lines, { ...target, query: 'no-such-passage' }), [], 'never fabricate a match');
assert.deepEqual(findSearchLines(lines, { ...target, query: ' ' }), []);
assert.deepEqual(findSearchLines([line('Descent of the Superman', 0.1)], target), [], 'a title-only hit must not masquerade as the requested body passage');
const href = searchReaderPath('issue-one', { ...target, page: 1, query: 'life & grace' });
const url = new URL(href, 'https://example.test');
assert.equal(url.searchParams.get('page'), '1', 'page one must override saved reading position');
assert.deepEqual(parseSearchReaderTarget(url.searchParams), { ...target, page: 1, query: 'life & grace' });
for (const page of ['0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740993']) {
  assert.equal(parseSearchReaderTarget(new URLSearchParams({ matchPage: page, find: 'life' })), null);
}
assert.equal(parseSearchReaderTarget(new URLSearchParams('find=life')), null, 'metadata-only searches must not invent a target page');

(async () => {
  const { locatePdfSearch } = require('../apps/web/src/lib/locate-pdf-search.ts');
  const page = {
    getViewport: () => ({ width: 600, height: 800, scale: 1, transform: [1, 0, 0, -1, 0, 800] }),
    getTextContent: async () => ({ styles: { f: { ascent: 0.8 } }, items: [
      { str: 'When superman is born', width: 220, transform: [12, 0, 0, 12, 60, 400], fontName: 'f', hasEOL: true },
    ] }),
  };
  const found = await locatePdfSearch(page, target, new AbortController().signal, () => assert.fail('Native text should not start OCR'));
  assert.equal(found.length, 1);
  assert.equal(found[0].left, 0.1);
  assert.ok(found[0].top > 0.48 && found[0].top < 0.5);
  assert.ok(found[0].height > 0 && found[0].height < 0.05);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(locatePdfSearch(page, target, abort.signal, () => {}), { name: 'AbortError' });
  console.log('PASS: contextual passage selection, wrapped phrases, Hindi, literal query characters, missing matches, deep links, native PDF coordinates, cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
