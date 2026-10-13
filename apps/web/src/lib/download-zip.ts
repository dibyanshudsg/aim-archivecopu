/**
 * Client-side ZIP builder for bulk PDF download. JSZip is dynamic-imported
 * so it only ships to users who actually trigger a download (~28 KB gzipped).
 *
 * PDFs are already DEFLATE-compressed inside, so we use STORE (no extra
 * compression) — much faster CPU, near-zero size penalty.
 */

import { fetchPublicPdf } from './public-pdf-fetch';
export type ZipPhase = 'fetching' | 'zipping' | 'done' | 'error';

export interface ZipDownloadProgress {
  phase: ZipPhase;
  /** How many of the source files we've finished fetching. */
  fetched: number;
  total: number;
  /** ZIP-build progress 0–100 (only meaningful during the 'zipping' phase). */
  zipPercent: number;
  /** Files that failed to download (will be omitted from the ZIP). */
  skipped: string[];
  errorMessage?: string;
}

export interface ZipFileSpec {
  /** Becomes the filename inside the ZIP (sanitized; `.pdf` appended if not present). */
  name: string;
  url: string;
  sizeBytes?: number;
}

export interface DownloadZipOptions {
  files: ZipFileSpec[];
  /** Final ZIP filename (without `.zip`). */
  zipName: string;
  concurrency?: number;
  onProgress?: (p: ZipDownloadProgress) => void;
  signal?: AbortSignal;
}

export async function downloadAsZip(opts: DownloadZipOptions): Promise<void> {
  const { files, zipName, concurrency = 3, onProgress, signal } = opts;
  // Includes headroom for JSZip's final output and transient copies. Larger
  // archives should be downloaded in smaller selections on memory-limited phones.
  const maxBytes = 50 * 1024 * 1024;
  const budgetMessage = 'This selection is too large for a ZIP. Select fewer issues (up to 50 MB), or download them individually.';
  if (files.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0) > maxBytes) throw new Error(budgetMessage);
  signal?.throwIfAborted();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  let receivedBytes = 0;
  let budgetExceeded = false;
  try {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const skipped: string[] = [];
  let fetched = 0;
  const total = files.length;

  const emit = (
    phase: ZipPhase,
    zipPercent = 0,
    errorMessage?: string,
  ) => {
    onProgress?.({ phase, fetched, total, zipPercent, skipped: [...skipped], errorMessage });
  };

  emit('fetching');

  // Concurrency bounds active downloads; the byte counter bounds their total.
  const queue = files.map((f, idx) => ({ ...f, idx }));
  let aborted = false;

  const worker = async () => {
    while (queue.length > 0) {
      if (aborted || signal?.aborted) return;
      const item = queue.shift();
      if (!item) return;
      try {
        const res = await fetchPublicPdf(item.url, controller.signal);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error('Download stream unavailable');
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedBytes += value.byteLength;
            if (receivedBytes > maxBytes) {
              budgetExceeded = true;
              controller.abort();
              throw new Error(budgetMessage);
            }
            chunks.push(new Uint8Array(value));
          }
        } finally {
          if (controller.signal.aborted) await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        const blob = new Blob(chunks, { type: 'application/pdf' });
        const filename = ensurePdfExt(safeFilename(item.name));
        // Append a numeric suffix if a duplicate name slipped in.
        let key = filename;
        let n = 2;
        while (zip.file(key)) {
          key = filename.replace(/\.pdf$/i, ` (${n}).pdf`);
          n += 1;
        }
        zip.file(key, blob);
      } catch (err) {
        if (controller.signal.aborted) {
          aborted = true;
          return;
        }
        // Soft-fail: record and continue with the rest.
        skipped.push(item.name);
        console.warn(`Skipping "${item.name}":`, err);
      } finally {
        fetched += 1;
        emit('fetching');
      }
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(Math.max(1, concurrency), 3, total); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (budgetExceeded) throw new Error(budgetMessage);

  if (aborted || signal?.aborted) {
    emit('error', 0, 'Cancelled');
    return;
  }

  // Nothing made it into the ZIP — surface as an error so the modal doesn't
  // claim success on an empty download.
  if (Object.keys(zip.files).length === 0) {
    emit('error', 0, 'No files could be downloaded.');
    return;
  }

  emit('zipping', 0);
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (meta) => {
      signal?.throwIfAborted();
      emit('zipping', Math.round(meta.percent));
    },
  );

  if (signal?.aborted) {
    emit('error', 0, 'Cancelled');
    return;
  }

  triggerBrowserDownload(blob, `${safeFilename(zipName)}.zip`);
  emit('done', 100);
  } finally { signal?.removeEventListener('abort', cancel); controller.abort(); }
}

function safeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function ensurePdfExt(name: string): string {
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
