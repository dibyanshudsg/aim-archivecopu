-- AIM Archive: Add `theme` column to issues
-- Captures the single overarching theme of each issue (e.g. "Surrender",
-- "The Psychic Being") as printed on the cover. Distinct from the multi-tag
-- `topics` array.

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS theme TEXT;
