-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 002.do.create-hall-table.sql
-- Creates the hall table (venues where events take place).

CREATE TABLE IF NOT EXISTS hall (
  id              SERIAL        PRIMARY KEY,
  name            JSONB         NOT NULL,
  address         VARCHAR(256),
  vendor_id       INT,
  box_office_id   INT,
  seat_selection  BOOLEAN,
  open_seating    BOOLEAN,
  remark          JSONB,
  space           JSONB
) INHERITS (metadata);
