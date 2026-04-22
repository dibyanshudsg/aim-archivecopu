-- AIM Archive: Initial Database Schema
-- Run this in Supabase SQL editor or via CLI

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MAGAZINES
-- ============================================
CREATE TABLE magazines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'english',
  description TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ISSUES
-- ============================================
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  magazine_id UUID NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  description TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  pdf_url TEXT NOT NULL,
  epub_url TEXT,
  mobi_url TEXT,
  cover_image_url TEXT,
  page_count INT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(magazine_id, year, month)
);

CREATE INDEX idx_issues_magazine ON issues(magazine_id);
CREATE INDEX idx_issues_year_month ON issues(year, month);
CREATE INDEX idx_issues_topics ON issues USING GIN(topics);
CREATE INDEX idx_issues_published ON issues(is_published) WHERE is_published = TRUE;

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- ============================================
CREATE TABLE issue_search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  content TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_vector ON issue_search_index USING GIN(search_vector);
CREATE INDEX idx_search_issue ON issue_search_index(issue_id);

-- ============================================
-- ADMINS
-- ============================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USERS (optional — for cross-device sync)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USER BOOKMARKS
-- ============================================
CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, issue_id)
);

-- ============================================
-- USER READING HISTORY
-- ============================================
CREATE TABLE user_reading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  last_page INT NOT NULL DEFAULT 1,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, issue_id)
);

-- ============================================
-- ANALYTICS VISIBILITY (admin-controlled)
-- ============================================
CREATE TABLE analytics_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT UNIQUE NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default analytics visibility settings
INSERT INTO analytics_visibility (metric_name, is_public) VALUES
  ('read_count', TRUE),
  ('download_count', FALSE),
  ('most_popular', TRUE),
  ('total_issues', TRUE),
  ('trending', FALSE);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER magazines_updated_at
  BEFORE UPDATE ON magazines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Magazines: public read, admin write
ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read magazines" ON magazines FOR SELECT USING (TRUE);

-- Issues: public read published, admin all
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published issues" ON issues FOR SELECT USING (is_published = TRUE);

-- Search index: public read
ALTER TABLE issue_search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can search" ON issue_search_index FOR SELECT USING (TRUE);

-- Analytics visibility: public read
ALTER TABLE analytics_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read visibility" ON analytics_visibility FOR SELECT USING (TRUE);

-- User tables: users can read/write their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = google_id);
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage own history" ON user_reading_history FOR ALL USING (user_id = auth.uid());
