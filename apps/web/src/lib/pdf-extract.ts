import { cleanExtractedText, isReadableText } from './search-text-quality';

export const EXTRACTION_VERSION = 'native-first-english-v5';

export interface ExtractedLine {
  text: string;
  confidence: number | null;
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
  accepted: boolean;
  originalText?: string;
  originalConfidence?: number;
}

export interface ExtractedPage {
  pageNumber: number;
  content: string;
  method?: 'native' | 'ocr';
  status?: 'approved' | 'review' | 'empty';
  confidence?: number | null;
  lines?: ExtractedLine[];
}

export interface ExtractedDocument {
  /** Physical PDF page count, including blank and image-only pages. */
  totalPages: number;
  pages: ExtractedPage[];
  version?: string;
}

/**
 * Prefer readable native PDF text; use confidence-filtered English OCR for
 * image-only or unusable text layers. Keep uncertain pages available for review.
 * All heavy dependencies are dynamically imported to avoid build-time bundling issues.
 */
export async function extractPdfText(
  buffer: Buffer,
  onProgress?: (page: number, total: number) => void,
  options: {
    cachedPages?: ExtractedPage[];
    onPage?: (page: ExtractedPage, totalPages: number) => Promise<void>;
    ocrCachePath?: string;
  } = {},
): Promise<ExtractedDocument> {
  const pages: ExtractedPage[] = [];

  // Dynamic imports — these only run server-side in API routes
  const { createCanvas } = await import('canvas');
  const { createWorker } = await import('tesseract.js');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createRequire } = await import('node:module');
  const { dirname, join, resolve, sep } = await import('node:path');
  // Resolve from the web package both when invoked by Next and from the root
  // batch runner. Standard fonts must be present when rendering OCR input;
  // otherwise PDF.js can silently omit unembedded Times/Helvetica glyphs.
  const fromWeb = createRequire(resolve(process.cwd(), 'apps/web/package.json'));
  const standardFontDataUrl =
    join(dirname(fromWeb.resolve('pdfjs-dist/package.json')), 'standard_fonts') + sep;

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, standardFontDataUrl }).promise;
  const totalPages = doc.numPages;

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);

      const cached = options.cachedPages?.find((page) => page.pageNumber === pageNum);
      if (cached) {
        pages.push(cached);
        continue;
      }

      const page = await doc.getPage(pageNum);
      try {
        const native = await page.getTextContent();
        const nativeLines: ExtractedLine[] = [];
        let current = '';
        const finishLine = () => {
          const text = cleanExtractedText(current);
          if (text)
            nativeLines.push({
              text,
              confidence: null,
              bbox: null,
              accepted: isReadableText(text),
            });
          current = '';
        };
        for (const item of native.items) {
          if (!('str' in item)) continue;
          current += `${item.str} `;
          if (item.hasEOL) finishLine();
        }
        finishLine();
        const acceptedNative = nativeLines.filter((line) => line.accepted);
        const nativeCharacters = nativeLines.reduce((sum, line) => sum + line.text.length, 0);
        const goodCharacters = acceptedNative.reduce((sum, line) => sum + line.text.length, 0);
        let extracted: ExtractedPage;
        // Sparse but valid cover titles count as usable text. No arbitrary
        // minimum of 80 characters that would force cover artwork through OCR.
        if (acceptedNative.length && goodCharacters / Math.max(1, nativeCharacters) >= 0.8) {
          extracted = {
            pageNumber: pageNum,
            content: acceptedNative.map((line) => line.text).join('\n'),
            method: 'native',
            confidence: null,
            lines: nativeLines,
            status: 'approved',
          };
        } else {
          worker ??= await createWorker(
            'eng',
            1,
            options.ocrCachePath ? { cachePath: options.ocrCachePath } : {},
          );
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          const context = canvas.getContext('2d');

          try {
            await page.render({
              canvasContext: context as unknown as CanvasRenderingContext2D,
              viewport,
            }).promise;

            const imageBuffer = canvas.toBuffer('image/png');

            const { data: ocrResult } = await worker.recognize(imageBuffer, {}, { blocks: true });
            const lines = (ocrResult.blocks || []).flatMap((block) =>
              block.paragraphs.flatMap((paragraph) =>
                paragraph.lines.map((line) => {
                  const text = cleanExtractedText(line.text);
                  const weakWords = line.words.filter((word) => word.confidence < 45).length;
                  return {
                    text,
                    confidence: line.confidence,
                    bbox: {
                      x0: line.bbox.x0 / canvas.width,
                      y0: line.bbox.y0 / canvas.height,
                      x1: line.bbox.x1 / canvas.width,
                      y1: line.bbox.y1 / canvas.height,
                    },
                    accepted:
                      line.confidence >= 70 &&
                      weakWords / Math.max(1, line.words.length) <= 0.2 &&
                      isReadableText(text),
                  };
                }),
              ),
            );
            // A decorative cover can confuse whole-page segmentation even when its
            // title is legible. Re-read plausible low-confidence lines in isolation
            // instead of either trusting them blindly or dropping the real title.
            const retryLines = lines
              .filter(
                (line) => !line.accepted && line.confidence >= 50 && isReadableText(line.text),
              )
              .slice(0, 6);
            if (retryLines.length) {
              await worker.setParameters({
                tessedit_pageseg_mode: '7' as import('tesseract.js').PSM,
              });
              try {
                for (const line of retryLines) {
                  const left = Math.max(0, Math.floor(line.bbox.x0 * canvas.width) - 6);
                  const top = Math.max(0, Math.floor(line.bbox.y0 * canvas.height) - 6);
                  const width = Math.min(
                    canvas.width - left,
                    Math.ceil((line.bbox.x1 - line.bbox.x0) * canvas.width) + 12,
                  );
                  const height = Math.min(
                    canvas.height - top,
                    Math.ceil((line.bbox.y1 - line.bbox.y0) * canvas.height) + 12,
                  );
                  const retry = await worker.recognize(imageBuffer, {
                    rectangle: { left, top, width, height },
                  });
                  const candidate = cleanExtractedText(retry.data.text);
                  if (retry.data.confidence >= 80 && isReadableText(candidate)) {
                    Object.assign(line, {
                      originalText: line.text,
                      originalConfidence: line.confidence,
                      text: candidate,
                      confidence: retry.data.confidence,
                      accepted: true,
                    });
                  }
                }
              } finally {
                await worker.setParameters({
                  tessedit_pageseg_mode: '3' as import('tesseract.js').PSM,
                });
              }
            }
            const accepted = lines.filter((line) => line.accepted);
            const candidateText = accepted.map((line) => line.text).join('\n');
            const text =
              (candidateText.match(/[\p{L}\p{M}]/gu) || []).length >= 5 ? candidateText : '';
            extracted = {
              pageNumber: pageNum,
              content: text,
              method: 'ocr',
              confidence: ocrResult.confidence,
              lines,
              status: text ? 'approved' : ocrResult.text.trim() ? 'review' : 'empty',
            };
          } finally {
            canvas.width = canvas.height = 0;
          }
        }
        pages.push(extracted);
        await options.onPage?.(extracted, totalPages);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    try {
      await worker?.terminate();
    } finally {
      await doc.destroy();
    }
  }

  return { totalPages, pages, version: EXTRACTION_VERSION };
}
