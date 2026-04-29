/**
 * Build a single-page PDF that contains exactly one full-page JPEG image.
 *
 * Pure browser/Node code — no dependencies. We hand-roll the PDF because
 * pulling in a full PDF library (pdf-lib, jsPDF) for this one trivial case
 * is wasteful and was hitting Windows install issues.
 *
 * Page dimensions equal the JPEG's pixel dimensions (1 PDF point = 1 px),
 * so the image fills the page exactly.
 */
export function buildJpegPdf(
  jpegBytes: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [0]; // index 0 unused; offsets[n] = byte position of object n

  const push = (s: string | Uint8Array) => {
    const b = typeof s === 'string' ? enc.encode(s) : s;
    parts.push(b);
    length += b.length;
  };
  const startObject = (n: number) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
  };
  const endObject = () => push('endobj\n');

  // PDF header + binary marker (tells parsers this file contains arbitrary bytes)
  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));

  // 1: Catalog
  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  // 2: Pages
  startObject(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  endObject();

  // 3: Page
  startObject(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> ` +
      `/Contents 5 0 R >>\n`,
  );
  endObject();

  // 4: Image XObject (JPEG)
  startObject(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpegBytes.length} >>\nstream\n`,
  );
  push(jpegBytes);
  push('\nendstream\n');
  endObject();

  // 5: Content stream — paint Im0 covering the whole MediaBox
  const contentStr = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = enc.encode(contentStr);
  startObject(5);
  push(`<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push('endstream\n');
  endObject();

  // xref table — must be exactly 20 bytes per entry: "NNNNNNNNNN GGGGG x \n"
  const xrefOffset = length;
  push('xref\n0 6\n');
  push('0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    push(`${offsets[i].toString().padStart(10, '0')} 00000 n \n`);
  }

  // Trailer
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}
