CREATE TABLE IF NOT EXISTS indexing_schedule (
  id TEXT PRIMARY KEY CHECK (id = 'github-actions'),
  last_checked_at INTEGER NOT NULL,
  last_result TEXT NOT NULL,
  run_url TEXT NOT NULL
);
