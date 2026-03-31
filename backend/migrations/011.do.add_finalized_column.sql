-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Adds an finalized column to the production table, indicating whether a production is finalized or still being edited.

ALTER TABLE production
ADD COLUMN finalized BOOLEAN DEFAULT FALSE;