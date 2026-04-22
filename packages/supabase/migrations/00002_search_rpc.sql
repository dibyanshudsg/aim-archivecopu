-- AIM Archive: Full-Text Search RPC Function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_issues(
  search_query TEXT,
  filter_magazine_id UUID DEFAULT NULL,
  filter_year_from INT DEFAULT NULL,
  filter_year_to INT DEFAULT NULL,
  result_limit INT DEFAULT 50,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  issue_id UUID,
  issue_title TEXT,
  magazine_name TEXT,
  magazine_language TEXT,
  year INT,
  month INT,
  page_number INT,
  snippet TEXT,
  rank REAL,
  cover_image_url TEXT,
  pdf_url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS issue_id,
    i.title AS issue_title,
    m.name AS magazine_name,
    m.language AS magazine_language,
    i.year,
    i.month,
    idx.page_number,
    ts_headline(
      'english',
      idx.content,
      plainto_tsquery('english', search_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=2, FragmentDelimiter= ... '
    ) AS snippet,
    ts_rank(idx.search_vector, plainto_tsquery('english', search_query)) AS rank,
    i.cover_image_url,
    i.pdf_url
  FROM issue_search_index idx
  JOIN issues i ON i.id = idx.issue_id
  JOIN magazines m ON m.id = i.magazine_id
  WHERE idx.search_vector @@ plainto_tsquery('english', search_query)
    AND i.is_published = TRUE
    AND (filter_magazine_id IS NULL OR i.magazine_id = filter_magazine_id)
    AND (filter_year_from IS NULL OR i.year >= filter_year_from)
    AND (filter_year_to IS NULL OR i.year <= filter_year_to)
  ORDER BY rank DESC, i.year DESC, i.month DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
