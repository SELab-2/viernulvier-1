-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFEREN CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 001.undo.init.sql
-- Reverses 001.do.init.sql: drops production first (depends on admin), then admin.

DROP TABLE IF EXISTS production;
DROP TABLE IF EXISTS admin;
