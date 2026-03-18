-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 001.undo.init.sql
-- Reverses 001.do.init.sql: drops production first (depends on admin), then admin.

DROP TABLE IF EXISTS production;

ALTER TABLE metadata
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by;

DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS metadata;
