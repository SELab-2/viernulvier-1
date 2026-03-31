-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 012.undo.add-super-field-to-admin-table.sql
-- Reverses 012.do.add-super-field-to-admin-table.sql: drops the "super" column from admin.

ALTER TABLE admin
  DROP COLUMN IF EXISTS super;