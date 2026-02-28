-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFEREN CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 003.undo.create-event-tables.sql
-- Reverses 003.do.create-event-tables.sql.
-- event_price must be dropped first as it depends on event.

DROP TABLE IF EXISTS event_price;
DROP INDEX IF EXISTS idx_event_hall_starts_at;
DROP TABLE IF EXISTS event;
