CREATE VIRTUAL TABLE IF NOT EXISTS issue_metadata_fts USING fts5(content, tokenize='trigram');
-- statement-breakpoint
CREATE VIEW IF NOT EXISTS issue_metadata_search_source AS
SELECT i.rowid AS rowid, i.id, i.magazine_id,
  lower(coalesce(i.title,'') || char(10) || coalesce(i.theme,'') || char(10) ||
    coalesce(i.description,'') || char(10) || m.name || char(10) ||
    coalesce((SELECT group_concat(value, char(10)) FROM json_each(i.topics_json)),'')) AS content
FROM issues i JOIN magazines m ON m.id=i.magazine_id;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_metadata_insert AFTER INSERT ON issues BEGIN
  INSERT INTO issue_metadata_fts(rowid, content) SELECT rowid, content FROM issue_metadata_search_source WHERE id=new.id;
END;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_metadata_delete AFTER DELETE ON issues BEGIN
  DELETE FROM issue_metadata_fts WHERE rowid=old.rowid;
END;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_metadata_update AFTER UPDATE OF title,theme,description,topics_json,magazine_id ON issues BEGIN
  DELETE FROM issue_metadata_fts WHERE rowid=old.rowid;
  INSERT INTO issue_metadata_fts(rowid, content) SELECT rowid, content FROM issue_metadata_search_source WHERE id=new.id;
END;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS magazine_metadata_update AFTER UPDATE OF name ON magazines BEGIN
  DELETE FROM issue_metadata_fts WHERE rowid IN (SELECT rowid FROM issues WHERE magazine_id=new.id);
  INSERT INTO issue_metadata_fts(rowid, content) SELECT rowid, content FROM issue_metadata_search_source WHERE magazine_id=new.id;
END;
-- statement-breakpoint
INSERT OR REPLACE INTO issue_metadata_fts(rowid, content) SELECT rowid, content FROM issue_metadata_search_source;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_indexing_runs_job_created ON indexing_runs(job_id,created_at DESC);
