export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

/**
 * Extract text from a PDF buffer using OCR (Tesseract.js).
 * All heavy dependencies are dynamically imported to avoid build-time bundling issues.
 */
export async function extractPdfText(
  buffer: Buffer,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractedPage[]> {
  const pages: ExtractedPage[] = [];

  // Dynamic imports — these only run server-side in API routes
  const { createCanvas } = await import('canvas');
  const { createWorker } = await import('tesseract.js');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;

  const worker = await createWorker('eng+hin');

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);

      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      const imageBuffer = canvas.toBuffer('image/png');

      const { data: ocrResult } = await worker.recognize(imageBuffer);
      const text = ocrResult.text.replace(/\s+/g, ' ').trim();

      if (text.length > 20) {
        pages.push({ pageNumber: pageNum, content: text });
      }

      page.cleanup();
    }
  } finally {
    await worker.terminate();
    doc.destroy();
  }

  return pages;
}
