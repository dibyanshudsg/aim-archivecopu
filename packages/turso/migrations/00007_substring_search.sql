-- Trigram index keeps the archive's literal substring search semantics.
-- Statement breakpoints preserve trigger bodies in the migration runner.
CREATE VIRTUAL TABLE IF NOT EXISTS issue_text_fts USING fts5(content, tokenize='trigram');
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_text_fts_insert AFTER INSERT ON issue_search_index BEGIN
  INSERT INTO issue_text_fts(rowid, content) VALUES (new.rowid, lower(replace(replace(new.content, char(10), ' '), char(13), ' ')));
END;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_text_fts_delete AFTER DELETE ON issue_search_index BEGIN
  DELETE FROM issue_text_fts WHERE rowid = old.rowid;
END;
-- statement-breakpoint
CREATE TRIGGER IF NOT EXISTS issue_text_fts_update AFTER UPDATE ON issue_search_index BEGIN
  DELETE FROM issue_text_fts WHERE rowid = old.rowid;
  INSERT INTO issue_text_fts(rowid, content) VALUES (new.rowid, lower(replace(replace(new.content, char(10), ' '), char(13), ' ')));
END;
-- statement-breakpoint
INSERT OR REPLACE INTO issue_text_fts(rowid, content)
SELECT rowid, lower(replace(replace(content, char(10), ' '), char(13), ' ')) FROM issue_search_index;
