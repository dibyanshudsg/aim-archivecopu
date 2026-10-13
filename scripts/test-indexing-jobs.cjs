process.env.R2_PUBLIC_BASE_URL = 'https://example.test';
process.env.R2_LEGACY_PUBLIC_BASE_URLS = '';
// Real isolated libSQL transactions; never loads credentials or changes catalogue data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, fromWeb } = require('./register-web-typescript.cjs');
const testDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'aim-indexing-test-'));
const testFile = path.join(testDir, 'queue.db');
const db = fromWeb('@libsql/client').createClient({ url: 'file:' + testFile.replace(/\\/g, '/') });
require('../apps/web/src/lib/db/client.ts').getDb = () => db;
const repo = require('../apps/web/src/lib/db/indexing-repository.ts');
const admin = require('../apps/web/src/lib/db/admin-repository.ts');
const { processNextIndexingJob } = require('../apps/web/src/lib/indexing-worker.ts');
const document = {
  version: 'test',
  totalPages: 2,
  pages: [
    { pageNumber: 1, content: 'Descent of the Superman', status: 'approved' },
    { pageNumber: 2, content: '', status: 'review' },
  ],
};
const execute = (sql, args = []) => db.execute({ sql, args });
const jobRow = async (id) =>
  (await execute('SELECT * FROM indexing_jobs WHERE issue_id=?', [id])).rows[0];
async function createIssue(month = 1, language = 'aim') {
  return admin.createAdminIssueInDb({
    magazine_id: language,
    title: 'Worker test ' + month,
    theme: null,
    year: 2020,
    month,
    description: null,
    topics: [],
    pdf_url: 'https://example.test/test.pdf',
    cover_image_url: null,
    file_size_bytes: 100,
    is_published: false,
  });
}
(async () => {
  const schema = fs
    .readFileSync(path.join(root, 'packages/turso/migrations/00001_initial_schema.sql'), 'utf8')
    .replace(
      /CREATE INDEX IF NOT EXISTS idx_issue_search_content_fts\s+ON issue_search_index USING fts \(content\);/,
      '',
    );
  await db.executeMultiple(schema);
  await db.executeMultiple(
    fs.readFileSync(path.join(root, 'packages/turso/migrations/00003_indexing_jobs.sql'), 'utf8'),
  );
  await db.executeMultiple(fs.readFileSync(path.join(root, 'packages/turso/migrations/00004_indexing_workspace.sql'), 'utf8'));
  await db.executeMultiple(fs.readFileSync(path.join(root, 'packages/turso/migrations/00005_indexing_schedule.sql'), 'utf8'));
  await db.executeMultiple(fs.readFileSync(path.join(root, 'packages/turso/migrations/00006_indexing_controls.sql'), 'utf8'));
  await execute(
    "INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES('aim','AIM','english','now','now'),('agni','Agni','hindi','now','now')",
  );
  const issue = await createIssue();
  assert.ok(issue.indexing_job_id, 'Creating an English issue atomically creates a job');
  const hindi = await createIssue(1, 'agni');
  const workspace = require('../apps/web/src/lib/db/indexing-workspace-repository.ts');
  let catalogue = await workspace.listIndexingCatalogue({status:'all'});
  assert.equal(catalogue.total,2);
  assert.equal(catalogue.counts.queued,1);
  assert.equal(catalogue.counts.excluded,1);
  assert.equal(catalogue.eligible,1);
  assert.equal((await workspace.listIndexingCatalogue({status:'eligible'})).total,1);
  assert.equal((await workspace.listIndexingCatalogue({status:'all',q:'%'})).total,0,'Search treats wildcard characters literally');
  const runsBefore=(await workspace.listIndexingHistory()).total;
  await db.executeMultiple(fs.readFileSync(path.join(root, 'packages/turso/migrations/00004_indexing_workspace.sql'), 'utf8'));
  assert.equal((await workspace.listIndexingHistory()).total,runsBefore,'Migration reruns do not duplicate current runs');
  assert.equal(hindi.indexing_job_id, null);
  assert.equal(await repo.queueIssueIndexing(hindi.id), null);
  assert.equal(
    await repo.queueIssueIndexing(issue.id),
    issue.indexing_job_id,
    'Repeated clicks deduplicate active jobs',
  );
  const first = await repo.claimIndexingJob();
  assert.equal(await repo.claimIndexingJob(), null, 'A second worker cannot claim an active lease');
  await repo.prepareIndexingCheckpoint(first, 'hash', 'test');
  await repo.saveIndexingPage(first, document.pages[0], 2);
  await execute('UPDATE indexing_jobs SET lease_until=0 WHERE id=?', [first.id]);
  const resumed = await repo.claimIndexingJob();
  assert.notEqual(resumed.lease_token, first.lease_token);
  assert.equal(
    (await repo.prepareIndexingCheckpoint(resumed, 'hash', 'test')).length,
    1,
    'Crash recovery keeps completed pages',
  );
  await assert.rejects(repo.saveIndexingPage(first, document.pages[1], 2), /lease/);
  await assert.rejects(
    repo.completeIndexingJob(first, document),
    /lease/,
    'Expired worker cannot commit',
  );
  await repo.failIndexingJob(first, new Error('old worker'));
  assert.equal(
    (await jobRow(issue.id)).status,
    'processing',
    'Old worker cannot mark new lease failed',
  );
  await repo.saveIndexingPage(resumed, document.pages[1], 2);
  await execute(
    "CREATE TRIGGER fail_index BEFORE INSERT ON issue_search_index BEGIN SELECT RAISE(ABORT,'injected write failure'); END",
  );
  await assert.rejects(repo.completeIndexingJob(resumed, document), /injected/);
  assert.equal((await jobRow(issue.id)).status, 'processing', 'Job and index roll back together');
  await execute('DROP TRIGGER fail_index');
  assert.equal(await repo.completeIndexingJob(resumed, document), 1);
  assert.equal((await jobRow(issue.id)).status, 'review');
  assert.equal((await workspace.getIndexingIssueDetails(issue.id)).runs[0].trigger,'upload');
  assert.equal((await workspace.getIndexingIssueDetails(issue.id)).runs[0].attempts,2);
  assert.equal((await workspace.getIndexingIssueDetails(issue.id)).issue.status,'unverified','Older extraction version needs verification');
  assert.equal(
    (await execute('SELECT * FROM indexing_job_pages')).rows.length,
    1,
    'Only withheld evidence retained on success',
  );
  assert.equal((await repo.getIndexingOverview()).jobs[0].review_page_numbers, '2');

  await repo.queueIssueIndexing(issue.id);
  const replacing = await repo.claimIndexingJob();
  await admin.updateIssuePdfInDb(issue.id, 'https://example.test/replacement.pdf', 200);
  assert.ok((await workspace.getIndexingIssueDetails(issue.id)).runs.some(r=>r.status==='superseded'),'Replacement retains superseded work in history');
  assert.notEqual((await jobRow(issue.id)).id, replacing.id);
  assert.equal(
    (await execute('SELECT * FROM issue_search_index')).rows.length,
    0,
    'Replacement clears stale page targets atomically',
  );
  await assert.rejects(repo.completeIndexingJob(replacing, document), /lease|source/);
  const updated = await repo.claimIndexingJob();
  await repo.prepareIndexingCheckpoint(updated, 'old', 'v1');
  await repo.saveIndexingPage(updated, document.pages[0], 2);
  assert.equal(
    (
      await repo.prepareIndexingCheckpoint(
        { ...updated, source_hash: 'old', extraction_version: 'v1' },
        'new',
        'v1',
      )
    ).length,
    0,
    'Changed bytes invalidate checkpoints',
  );
  await repo.failIndexingJob(
    updated,
    new Error('Download failed https://secret.example/key?token=private'),
  );
  assert.equal((await jobRow(issue.id)).status, 'queued');
  assert.ok(!(await jobRow(issue.id)).error.includes('token='));
  assert.equal(await repo.claimIndexingJob(), null, 'Backoff is respected');
  await execute('UPDATE indexing_jobs SET available_at=0,attempts=2');
  const last = await repo.claimIndexingJob();
  await repo.failIndexingJob(last, new Error('offline'));
  assert.equal((await jobRow(issue.id)).status, 'failed', 'Retry limit becomes visible failure');
  await repo.queueIssueIndexing(issue.id);
  assert.equal((await jobRow(issue.id)).attempts, 0, 'Admin retry resets attempt budget');

  let firstAttempt = true;
  let cachedCount = -1;
  const extract = async (_buffer, _progress, options) => {
    cachedCount = options.cachedPages.length;
    if (!cachedCount) await options.onPage(document.pages[0], 2);
    if (firstAttempt) {
      firstAttempt = false;
      throw Error('simulated process interruption');
    }
    await options.onPage(document.pages[1], 2);
    return document;
  };
  await processNextIndexingJob({ download: async () => Buffer.from('same source'), extract });
  assert.equal((await jobRow(issue.id)).completed_pages, 1);
  await execute('UPDATE indexing_jobs SET available_at=0');
  await processNextIndexingJob({ download: async () => Buffer.from('same source'), extract });
  assert.equal(cachedCount, 1, 'Worker resumes extraction from persisted page evidence');
  assert.equal((await jobRow(issue.id)).status, 'review');
  const details=await workspace.getIndexingIssueDetails(issue.id);
  assert.equal(details.issue.status,'review');
  assert.deepEqual(details.issue.review_pages,[2]);
  assert.ok(details.runs.some(r=>r.status==='failed'));
  assert.ok(details.runs.some(r=>r.trigger==='retry'));
  assert.equal((await workspace.queueWorkspaceIssues({action:'selected',ids:[issue.id]})).queued.length,0,'Rebuilding indexed data requires explicit rebuild intent');
  const missing=await createIssue(3);
  await execute('DELETE FROM indexing_jobs WHERE issue_id=?',[missing.id]);
  assert.equal((await workspace.listIndexingCatalogue({status:'missing'})).total,1);
  assert.deepEqual((await workspace.queueWorkspaceIssues({action:'missing'})).queued,[missing.id]);
  assert.equal((await workspace.queueWorkspaceIssues({action:'missing'})).queued.length,0,'Batch rechecks current states and never duplicates active work');
  assert.equal((await workspace.queueWorkspaceIssues({action:'selected',ids:[hindi.id],rebuild:true})).queued.length,0);
  await execute('DELETE FROM issues WHERE id=?',[missing.id]);
  await repo.heartbeatIndexingWorker('test-worker');
  assert.equal((await repo.getIndexingOverview()).workerOnline, true);
  await execute('UPDATE indexing_workers SET last_seen=0');
  assert.equal((await repo.getIndexingOverview()).workerOnline, false);

  await execute(
    "CREATE TRIGGER fail_job BEFORE INSERT ON indexing_jobs BEGIN SELECT RAISE(ABORT,'queue unavailable'); END",
  );
  await assert.rejects(createIssue(2), /queue unavailable/);
  assert.equal(
    (await execute('SELECT COUNT(*) n FROM issues WHERE month=2')).rows[0].n,
    0,
    'Queue failure rolls back issue creation',
  );
  const oldUrl = (await execute('SELECT pdf_url FROM issues WHERE id=?', [issue.id])).rows[0]
    .pdf_url;
  await assert.rejects(
    admin.updateIssuePdfInDb(issue.id, 'https://example.test/broken.pdf', 1),
    /queue unavailable/,
  );
  assert.equal(
    (await execute('SELECT pdf_url FROM issues WHERE id=?', [issue.id])).rows[0].pdf_url,
    oldUrl,
    'Queue failure rolls back PDF replacement',
  );
  await execute('DROP TRIGGER fail_job');
  await execute('DELETE FROM issues WHERE id=?', [issue.id]);
  assert.equal((await execute('SELECT * FROM indexing_jobs')).rows.length, 0);
  assert.equal(
    (await execute('SELECT * FROM indexing_job_pages')).rows.length,
    0,
    'Deleting issues removes job/checkpoint data',
  );
  console.log(
    'PASS: durable upload/replacement, English guard, duplicate claims, crash resume, stale fencing, atomic rollback, source hash invalidation, retry backoff/limit, worker health, review evidence, cascade cleanup.',
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
    // The Windows native SQLite binding can retain a handle until process exit.
    try {
      for (const suffix of ['', '-wal', '-shm']) fs.rmSync(testFile + suffix, { force: true });
      fs.rmdirSync(testDir);
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
    }
  });
