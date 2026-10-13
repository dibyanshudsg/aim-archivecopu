// Synthetic fixtures only. No environment loading, credentials, networking or disk writes.
const currentBase = 'https://assets.example.test';
const formerBase = 'https://former-assets.example.test';
const now = '2026-10-08T09:00:00.000Z';
const cases = [
  ['released', 2020, 1, 1, true, true],
  ['restricted', 2026, 1, 1, false, true],
  ['draft-old', 2020, 2, 0, false, false],
  ['draft-recent', 2026, 2, 0, false, false],
  ['release-boundary', 2021, 10, 1, true, true],
  ['next-month', 2021, 11, 1, false, true],
];
const issues = cases.map(([name, year, month, published, publicPdf, publicCover], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  name, magazine_id: 'fixture-magazine', title: `Synthetic ${name}`, year, month,
  is_published: published, pdf_url: `${currentBase}/fixtures/${name}.pdf`,
  cover_image_url: `${currentBase}/fixtures/${name}.png`,
  expected: { publicPdf, publicCover, activeAdminPdf: true, unauthenticatedAdminPdf: false },
}));

function pdfBytes(label) {
  const content = `BT /F1 12 Tf 20 100 Td (Synthetic ${label}) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 160] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const start = Buffer.byteLength(data);
  data += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(data);
}

function createObjects() {
  const objects = new Map();
  // Valid synthetic 1x1 PNG; not an archive cover or extracted production asset.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAAC0lEQVQImWNgAAIAAAUAAWJVMogAAAAASUVORK5CYII=', 'base64');
  for (const issue of issues) {
    objects.set(`fixtures/${issue.name}.pdf`, { contentType: 'application/pdf', body: pdfBytes(issue.name) });
    objects.set(`fixtures/${issue.name}.png`, { contentType: 'image/png', body: Buffer.from(png) });
  }
  return objects;
}

const boundaryCases = [
  { at: '2026-09-30T18:29:59.999Z', embargoed: true },
  { at: '2026-09-30T18:30:00.000Z', embargoed: false },
  { at: '2026-09-30T18:30:00.001Z', embargoed: false },
];
const adversarial = {
  ids: ['unknown', '../released', '%2e%2e%2freleased', '', 'x'.repeat(1000)],
  locators: [
    'https://assets.example.test.attacker.invalid/fixtures/released.pdf',
    'https://assets.example.test@attacker.invalid/fixtures/released.pdf',
    'https://unconfigured.invalid/fixtures/released.pdf',
    `${currentBase}/../private.pdf`, `${currentBase}/%2e%2e/private.pdf`,
    `${currentBase}/fixtures/%252e%252e%252fprivate.pdf`, `${currentBase}/fixtures/%ZZ.pdf`,
    'file:///private.pdf', 'http://127.0.0.1/private.pdf',
  ],
  ranges: ['bytes=0-4', 'bytes=5-', 'bytes=-8', 'bytes=999999-', 'bytes=0-1,4-5', 'garbage'],
};
module.exports = { currentBase, formerBase, now, issues, createObjects, boundaryCases, adversarial };
