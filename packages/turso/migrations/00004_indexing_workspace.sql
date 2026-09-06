CREATE TABLE IF NOT EXISTS indexing_runs (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_pages INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER,
  indexed_pages INTEGER NOT NULL DEFAULT 0,
  review_pages INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_indexing_runs_issue ON indexing_runs(issue_id,created_at);
CREATE INDEX IF NOT EXISTS idx_indexing_runs_job ON indexing_runs(job_id,finished_at);
CREATE TABLE IF NOT EXISTS issue_indexing_coverage (
  issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  extraction_version TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  indexed_pages INTEGER NOT NULL,
  blank_pages_json TEXT NOT NULL DEFAULT '[]',
  review_pages_json TEXT NOT NULL DEFAULT '[]',
  indexed_at TEXT NOT NULL,
  evidence TEXT NOT NULL
);
INSERT OR IGNORE INTO indexing_runs(id,job_id,issue_id,trigger,status,stage,attempts,completed_pages,total_pages,indexed_pages,review_pages,error,created_at,finished_at,updated_at)
SELECT id,id,issue_id,'previous_job',status,CASE WHEN status='processing' THEN 'extracting' ELSE status END,attempts,completed_pages,total_pages,indexed_pages,review_pages,error,created_at,CASE WHEN status IN ('complete','review','failed') THEN updated_at ELSE NULL END,updated_at FROM indexing_jobs WHERE NOT EXISTS (SELECT 1 FROM indexing_runs r WHERE r.job_id=indexing_jobs.id);
