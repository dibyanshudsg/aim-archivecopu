import type { PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import { findSearchLines, type SearchLine, type SearchReaderTarget } from './search-reader-target';

function matrix(a: number[], b: number[]) {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}

function normalizedBox(text: string, left: number, top: number, right: number, bottom: number, width: number, height: number): SearchLine {
  const x = Math.max(0, Math.min(1, left / width));
  const y = Math.max(0, Math.min(1, top / height));
  return { text, left: x, top: y, width: Math.max(0, Math.min(1, right / width) - x), height: Math.max(0, Math.min(1, bottom / height) - y) };
}

export async function locatePdfSearch(
  page: PDFPageProxy,
  target: SearchReaderTarget,
  signal: AbortSignal,
  onScan: () => void,
): Promise<SearchLine[]> {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  signal.throwIfAborted();
  const lines: SearchLine[] = [];
  let line: SearchLine | undefined;
  for (const value of content.items) {
    if (!('str' in value)) continue;
    const item = value as TextItem;
    if (!item.str.trim()) continue;
    const transform = matrix(viewport.transform, item.transform);
    const height = Math.hypot(transform[2], transform[3]);
    const angle = Math.atan2(transform[1], transform[0]);
    const ascent = (content.styles[item.fontName]?.ascent ?? 0.85) * height;
    const x = transform[4] + Math.sin(angle) * ascent;
    const y = transform[5] - Math.cos(angle) * ascent;
    const width = item.width * viewport.scale;
    const corners = [[x,y], [x+Math.cos(angle)*width,y+Math.sin(angle)*width], [x-Math.sin(angle)*height,y+Math.cos(angle)*height], [x+Math.cos(angle)*width-Math.sin(angle)*height,y+Math.sin(angle)*width+Math.cos(angle)*height]];
    const box = normalizedBox(item.str, Math.min(...corners.map(p=>p[0])), Math.min(...corners.map(p=>p[1])), Math.max(...corners.map(p=>p[0])), Math.max(...corners.map(p=>p[1])), viewport.width, viewport.height);
    const sameRow = line && Math.abs(line.top - box.top) < Math.max(line.height, box.height) * 0.45;
    const nearby = line && box.left >= line.left && box.left - (line.left + line.width) < box.height * 4;
    if (line && sameRow && nearby) {
      const right = Math.max(line.left + line.width, box.left + box.width);
      const bottom = Math.max(line.top + line.height, box.top + box.height);
      line.text += ` ${box.text}`;
      line.top = Math.min(line.top, box.top);
      line.width = right - line.left;
      line.height = bottom - line.top;
    } else {
      line = box;
      lines.push(line);
    }
    if (item.hasEOL) line = undefined;
  }
  const nativeMatch = findSearchLines(lines, target);
  if (nativeMatch.length) return nativeMatch;

  // The index stores text only. For scans (or unusable embedded text), recover
  // coordinates from this one page in the browser; never reindex the archive.
  onScan();
  const scanViewport = page.getViewport({ scale: Math.min(2.5, 2200 / Math.max(viewport.width, viewport.height)) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(scanViewport.width);
  canvas.height = Math.ceil(scanViewport.height);
  const context = canvas.getContext('2d');
  if (!context) return [];
  const render = page.render({ canvasContext: context, viewport: scanViewport });
  const cancelRender = () => render.cancel();
  signal.addEventListener('abort', cancelRender, { once: true });
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | undefined;
  let terminated = false;
  const terminate = () => {
    if (!worker || terminated) return;
    terminated = true;
    void worker.terminate().catch(() => {});
  };
  try {
    await render.promise;
    signal.throwIfAborted();
    const { createWorker } = await import('tesseract.js');
    signal.throwIfAborted();
    worker = await createWorker(/[\u0900-\u097f]/u.test(target.query + target.excerpt) ? 'eng+hin' : 'eng');
    signal.addEventListener('abort', terminate, { once: true });
    signal.throwIfAborted();
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    signal.throwIfAborted();
    const scannedLines = (data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.map(row =>
      normalizedBox(row.text, row.bbox.x0, row.bbox.y0, row.bbox.x1, row.bbox.y1, canvas.width, canvas.height),
    )));
    return findSearchLines(scannedLines, target);
  } finally {
    signal.removeEventListener('abort', cancelRender);
    signal.removeEventListener('abort', terminate);
    terminate();
    canvas.width = canvas.height = 0;
  }
}
