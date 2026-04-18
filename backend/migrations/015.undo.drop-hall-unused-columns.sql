-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Restores columns removed in 015.do.drop-hall-unused-columns.sql (see 002.do.create-hall-table.sql).

ALTER TABLE hall
  ADD COLUMN vendor_id INT,
  ADD COLUMN box_office_id INT,
  ADD COLUMN seat_selection BOOLEAN,
  ADD COLUMN open_seating BOOLEAN,
  ADD COLUMN remark JSONB;
