-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Drops hall columns that are not exposed in the API or shared HallSchema.

ALTER TABLE hall
  DROP COLUMN vendor_id,
  DROP COLUMN box_office_id,
  DROP COLUMN seat_selection,
  DROP COLUMN open_seating,
  DROP COLUMN remark;
