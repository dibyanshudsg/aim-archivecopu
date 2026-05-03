/**
 * Client-side ZIP builder for bulk PDF download. JSZip is dynamic-imported
 * so it only ships to users who actually trigger a download (~28 KB gzipped).
 *
 * PDFs are already DEFLATE-compressed inside, so we use STORE (no extra
 * compression) — much faster CPU, near-zero size penalty.
 */

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

  // Worker-pool over a shared queue. Concurrency caps simultaneous fetches so
  // we don't hammer storage and so memory peaks stay bounded.
  const queue = files.map((f, idx) => ({ ...f, idx }));
  let aborted = false;

  const worker = async () => {
    while (queue.length > 0) {
      if (aborted || signal?.aborted) return;
      const item = queue.shift();
      if (!item) return;
      try {
        const res = await fetch(item.url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
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
        if (signal?.aborted) {
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
  for (let i = 0; i < Math.min(concurrency, total); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

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
      if (signal?.aborted) return;
      emit('zipping', Math.round(meta.percent));
    },
  );

  if (signal?.aborted) {
    emit('error', 0, 'Cancelled');
    return;
  }

  triggerBrowserDownload(blob, `${safeFilename(zipName)}.zip`);
  emit('done', 100);
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
