import { createHash } from 'node:crypto';
import { extractPdfText, EXTRACTION_VERSION } from './pdf-extract';
import {
  claimIndexingJob,
  completeIndexingJob,
  failIndexingJob,
  prepareIndexingCheckpoint,
  renewIndexingLease,
  saveIndexingPage,
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
    const buffer = await (options.download ?? downloadIndexingPdf)(job.pdf_url);
    if (leaseError) throw leaseError;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const cachedPages = await prepareIndexingCheckpoint(job, hash, EXTRACTION_VERSION);
    await setIndexingStage(job, 'extracting');
    const document = await (options.extract ?? extractPdfText)(buffer, undefined, {
      cachedPages,
      ocrCachePath: process.env.INDEXING_OCR_CACHE_PATH,
      onPage: async (page, total) => {
        if (leaseError) throw leaseError;
        await saveIndexingPage(job, page, total);
      },
    });
    if (leaseError) throw leaseError;
    await setIndexingStage(job, 'saving');
    await completeIndexingJob(job, document);
    console.info(`Indexing complete: ${job.issue_id} (${document.totalPages} pages)`);
  } catch (error) {
    await failIndexingJob(job, error);
    console.error(
      `Indexing attempt ${job.attempts} failed for ${job.issue_id}; see Admin Issues for details.`,
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

async function downloadIndexingPdf(url: string) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`PDF download failed (HTTP ${response.status})`);
  if (!response.body) throw new Error('PDF download was empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > 100 * 1024 * 1024) throw new Error('PDF exceeds the 100MB indexing limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
