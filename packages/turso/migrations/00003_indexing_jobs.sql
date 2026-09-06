-- One durable current job per issue. Page checkpoints survive worker restarts.
CREATE TABLE IF NOT EXISTS indexing_jobs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','complete','review','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_until INTEGER,
  source_hash TEXT,
  extraction_version TEXT,
  completed_pages INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER,
  indexed_pages INTEGER NOT NULL DEFAULT 0,
  review_pages INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_claim ON indexing_jobs(status, available_at, lease_until);
CREATE TABLE IF NOT EXISTS indexing_job_pages (
  job_id TEXT NOT NULL REFERENCES indexing_jobs(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY(job_id, page_number)
);
CREATE TABLE IF NOT EXISTS indexing_workers (
  id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);
