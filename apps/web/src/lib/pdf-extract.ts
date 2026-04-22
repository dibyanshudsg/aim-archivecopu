import { createCanvas } from 'canvas';
import { createWorker } from 'tesseract.js';

export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

/**
 * Extract text from a PDF buffer using OCR (Tesseract.js).
 * Renders each page to an image via pdfjs-dist + node-canvas, then runs OCR.
 * Supports scanned PDFs and image-based PDFs.
 */
export async function extractPdfText(
  buffer: Buffer,
  onProgress?: (page: number, total: number) => void,
): Promise<ExtractedPage[]> {
  const pages: ExtractedPage[] = [];

  // Dynamic import for ESM pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;

  // Create Tesseract worker (English + Hindi)
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
