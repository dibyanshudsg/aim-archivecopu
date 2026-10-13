-- AIM Archive: Turso/libSQL initial schema
-- Runtime database: Turso/libSQL.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magazines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'english',
  description TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magazines_name ON magazines(name);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  magazine_id TEXT NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  description TEXT,
  topics_json TEXT NOT NULL DEFAULT '[]',
  pdf_url TEXT NOT NULL,
  epub_url TEXT,
  mobi_url TEXT,
  cover_image_url TEXT,
  page_count INTEGER,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  theme TEXT,
  UNIQUE(magazine_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_issues_magazine ON issues(magazine_id);
CREATE INDEX IF NOT EXISTS idx_issues_year_month ON issues(year, month);
CREATE INDEX IF NOT EXISTS idx_issues_published ON issues(is_published);
CREATE INDEX IF NOT EXISTS idx_issues_updated_at ON issues(updated_at);
CREATE INDEX IF NOT EXISTS idx_issues_read_count ON issues(read_count);
CREATE INDEX IF NOT EXISTS idx_issues_title ON issues(title);

CREATE TABLE IF NOT EXISTS issue_search_index (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_issue ON issue_search_index(issue_id);
CREATE INDEX IF NOT EXISTS idx_search_page ON issue_search_index(issue_id, page_number);

-- Supported substring indexes are installed by migration 00007 (FTS5).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, issue_id)
);

CREATE TABLE IF NOT EXISTS user_reading_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  last_page INTEGER NOT NULL DEFAULT 1,
  last_read_at TEXT NOT NULL,
  UNIQUE(user_id, issue_id)
);

CREATE TABLE IF NOT EXISTS analytics_visibility (
  id TEXT PRIMARY KEY,
  metric_name TEXT UNIQUE NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES admins(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_by TEXT REFERENCES admins(id),
  updated_at TEXT NOT NULL
);
