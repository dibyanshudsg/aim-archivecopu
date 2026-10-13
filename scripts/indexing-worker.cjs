// Run from the repository checkout with Node 22+, including dev dependencies.
const { root } = require('./register-web-typescript.cjs');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const envFile = path.join(root, 'apps/web/.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile); // Explicit environment takes precedence.
process.chdir(root);
const { heartbeatIndexingWorker } = require('../apps/web/src/lib/db/indexing-repository.ts');
const { processNextIndexingJob } = require('../apps/web/src/lib/indexing-worker.ts');
const { getDb } = require('../apps/web/src/lib/db/client.ts');
const id = crypto.randomUUID();
const drain = process.argv.includes('--drain');
const maxJobs = drain ? 3 : Infinity;
const stopClaimingAt = drain ? Date.now() + 20 * 60_000 : Infinity;
let processed = 0;
let stopping = false;
let heartbeat;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});
(async () => {
  for (const name of ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BASE_URL']) {
    if (!process.env[name]) throw new Error('Missing private storage configuration');
  }
  await heartbeatIndexingWorker(id);
  heartbeat = setInterval(
    () =>
      heartbeatIndexingWorker(id).catch(() => console.error('Indexing worker heartbeat failed')),
    20_000,
  );
  console.info('Indexing worker ready. English editions only.');
  do {
    // A hung native PDF/OCR operation must not monopolize a lease forever.
    // The supervisor restarts us; the next process resumes durable checkpoints.
    const watchdog = setTimeout(() => {
      console.error('Indexing exceeded 45 minutes; restarting from saved pages.');
      process.exit(1);
    }, 45 * 60_000);
    let worked;
    try {
      worked = await processNextIndexingJob();
    } finally {
      clearTimeout(watchdog);
    }
    if (worked) processed++;
    if (
      process.argv.includes('--once') ||
      (drain && (!worked || processed >= maxJobs || Date.now() >= stopClaimingAt))
    )
      break;
    if (!worked && !stopping) await new Promise((resolve) => setTimeout(resolve, 3000));
  } while (!stopping);
})()
  .catch(() => {
    console.error('Indexing worker stopped. Check database access, indexing migrations and private R2 credentials.');
    process.exitCode = 1;
  })
  .finally(async () => {
    clearInterval(heartbeat);
    try {
      await getDb().execute({ sql: 'DELETE FROM indexing_workers WHERE id=?', args: [id] });
    } finally {
      getDb().close();
    }
  });
