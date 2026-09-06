// Pure quality/snippet regression checks; no network or database credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const fromWeb = Module.createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const ts = fromWeb('typescript');
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    file,
  );
const {
  isReadableText,
  buildSearchSnippet,
  cleanExtractedText,
} = require('../apps/web/src/lib/search-text-quality.ts');
const noise = '3 7 i | ¢ i= 4 दे ys | ZN | 4 \\ 4 hug | 4D > go हे a है है /B |';
assert.equal(isReadableText(noise), false);
assert.equal(isReadableText(noise + ' Descent of the Superman'), false);
for (const text of [
  'Descent of the Superman',
  'Sri Aurobindo',
  'When superman is born as Nature’s king',
  'श्री अरविन्द और जीवन',
  'Life',
  'A life of self-giving.',
]) {
  assert.equal(isReadableText(text), true, text);
}
assert.equal(isReadableText('broken \ufffd text'), false);
assert.equal(cleanExtractedText('  Living\u0000\n\t truth  '), 'Living truth');
assert.equal(
  buildSearchSnippet(noise + '\nDescent of the Superman', 'Superman', 1),
  'Descent of the <mark>Superman</mark>',
);
assert.equal(
  buildSearchSnippet(noise + ' Descent of the Superman', 'Superman', 1),
  'Match found on page 1.',
);
assert.equal(
  buildSearchSnippet(
    'When superman is born as Nature’s king\nHis presence shall transfigure Matter’s world:',
    'superman',
    4,
  ),
  'When <mark>superman</mark> is born as Nature’s king',
);
assert.equal(
  buildSearchSnippet('His presence shall\ntransfigure Matter’s world', 'shall transfigure', 4),
  'His presence <mark>shall transfigure</mark> Matter’s world',
);
assert.equal(
  buildSearchSnippet('Truth. A life of love.', 'life', 3),
  'A <mark>life</mark> of love.',
);
const escaped = buildSearchSnippet('Life <script>alert(1)</script> is beautiful.', 'Life', 2);
assert.ok(!escaped.includes('<script>'));
assert.ok(escaped.includes('<mark>Life</mark>'));
assert.equal(
  buildSearchSnippet('The C++ guide to life.', 'C++', 2),
  'The <mark>C++</mark> guide to life.',
);
assert.equal(
  buildSearchSnippet('श्री अरविन्द और जीवन', 'जीवन', 3),
  'श्री अरविन्द और <mark>जीवन</mark>',
);
assert.equal(buildSearchSnippet('No matching text.', 'absent', 7), 'Match found on page 7.');
console.log(
  'PASS: cover noise rejected; meaningful English/Indic titles retained; clean matching lines and wrapped phrases selected; query highlighting HTML-safe.',
);

// Exercise the actual PDF extractor on a sparse title and a normal text page.
// The buffer contains selectable glyphs, so neither page should require OCR.
(async () => {
  const { createCanvas } = fromWeb('canvas');
  const canvas = createCanvas(400, 500, 'pdf');
  const context = canvas.getContext('2d');
  context.textDrawingMode = 'glyph';
  context.font = '20px Arial';
  context.fillText('Descent of the Superman', 20, 50);
  context.addPage();
  context.fillText('When superman is born', 20, 50);
  context.fillText('His presence shall transfigure', 20, 90);
  const { extractPdfText } = require('../apps/web/src/lib/pdf-extract.ts');
  const document = await extractPdfText(canvas.toBuffer());
  assert.equal(document.totalPages, 2);
  assert.deepEqual(
    document.pages.map((page) => page.method),
    ['native', 'native'],
  );
  assert.deepEqual(
    document.pages.map((page) => page.pageNumber),
    [1, 2],
  );
  assert.equal(document.pages[0].content, 'Descent of the Superman');
  assert.match(document.pages[1].content, /superman/);
  assert.ok(document.pages.every((page) => page.status === 'approved'));
  console.log(
    'PASS: actual PDF glyph extraction uses native text on both sparse cover and interior; physical pages preserved.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
