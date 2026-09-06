CREATE TABLE IF NOT EXISTS indexing_dispatches (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  active INTEGER UNIQUE,
  requested_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  checked_at INTEGER NOT NULL DEFAULT 0,
  run_id TEXT,
  message TEXT
);
CREATE TABLE IF NOT EXISTS indexing_page_reviews (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('transcribe','exclude')),
  content TEXT NOT NULL,
  note TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_page_reviews_source ON indexing_page_reviews(issue_id,source_hash,page_number,reviewed_at);
