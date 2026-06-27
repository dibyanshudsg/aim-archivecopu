export async function renderPdfFirstPageCoverFromFile(file: File): Promise<File | null> {
  const data = new Uint8Array(await file.arrayBuffer());
  const baseName = file.name.replace(/\.pdf$/i, '');
  return renderPdfFirstPageCover(data, baseName);
}

export async function renderPdfFirstPageCoverFromUrl(
  url: string,
  baseName: string,
): Promise<File | null> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download PDF: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  return renderPdfFirstPageCover(data, sanitizeFileBaseName(baseName));
}

async function renderPdfFirstPageCover(
  data: Uint8Array,
  baseName: string,
): Promise<File | null> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const doc = await pdfjsLib.getDocument({ data }).promise;

  try {
    const page = await doc.getPage(1);
    const desiredWidth = 600;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = desiredWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return null;

    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86),
    );
    if (!blob) return null;

    return new File([blob], `${baseName}-thumb.jpg`, { type: 'image/jpeg' });
  } finally {
    doc.destroy();
  }
}

function sanitizeFileBaseName(value: string): string {
  return value
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || 'cover';
}
