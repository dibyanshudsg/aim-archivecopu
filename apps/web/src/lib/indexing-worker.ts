import { createHash } from 'node:crypto';
import { readPrivatePdf } from './private-pdf';
import { extractPdfText, EXTRACTION_VERSION } from './pdf-extract';
import {
  claimIndexingJob,
  completeIndexingJob,
  failIndexingJob,
  prepareIndexingCheckpoint,
  renewIndexingLease,
  saveIndexingPages,
  setIndexingStage,
} from './db/indexing-repository';

/** One leased issue at a time; safe to run multiple independent worker processes. */
export async function processNextIndexingJob(
  options: {
    extract?: typeof extractPdfText;
    download?: (url: string) => Promise<Buffer>;
  } = {},
) {
  const job = await claimIndexingJob();
  if (!job) return false;
  let leaseError: Error | null = null;
  let renewing = false;
  let pending: Parameters<typeof saveIndexingPages>[1] = [];
  let totalPages = 0;
  let lastCheckpoint = 0;
  const flush = async () => {
    if (!pending.length) return;
    await saveIndexingPages(job, pending, totalPages);
    pending = [];
    lastCheckpoint = Date.now();
  };
  const heartbeat = setInterval(() => {
    if (renewing) return;
    renewing = true;
    renewIndexingLease(job)
      .catch((error) => {
        leaseError = error;
      })
      .finally(() => {
        renewing = false;
      });
  }, 20_000);
  try {
    const buffer = await (options.download ?? readPrivatePdf)(job.pdf_url);
    if (leaseError) throw leaseError;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const cachedPages = await prepareIndexingCheckpoint(job, hash, EXTRACTION_VERSION);
    await setIndexingStage(job, 'extracting');
    const document = await (options.extract ?? extractPdfText)(buffer, undefined, {
      cachedPages,
      ocrCachePath: process.env.INDEXING_OCR_CACHE_PATH,
      onPage: async (page, total) => {
        if (leaseError) throw leaseError;
        pending.push(page);
        totalPages = total;
        // Fast native extraction amortizes remote transactions; slow OCR still
        // checkpoints each completed page. At most four fast pages need replay.
        if (pending.length >= 5 || Date.now() - lastCheckpoint >= 5000) await flush();
      },
    });
    if (leaseError) throw leaseError;
    await flush();
    await setIndexingStage(job, 'saving');
    await completeIndexingJob(job, document);
    console.info(`Indexing complete: ${job.issue_id} (${document.totalPages} pages)`);
  } catch (error) {
    try { await flush(); } catch { /* A lost lease must not save stale pages. */ }
    await failIndexingJob(job, error);
    console.error(
      `Indexing attempt ${job.attempts} failed for ${job.issue_id}; see Admin Issues for details.`,
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

