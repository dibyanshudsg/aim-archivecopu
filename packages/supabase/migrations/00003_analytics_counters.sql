-- AIM Archive: atomic analytics counter helpers

CREATE OR REPLACE FUNCTION increment_issue_read_count(issue_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE issues
  SET read_count = read_count + 1
  WHERE id = issue_id
    AND is_published = TRUE;
$$;

CREATE OR REPLACE FUNCTION increment_issue_download_count(issue_id UUID)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE issues
  SET download_count = download_count + 1
  WHERE id = issue_id
    AND is_published = TRUE;
$$;
