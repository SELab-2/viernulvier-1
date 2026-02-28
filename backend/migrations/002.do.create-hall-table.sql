-- 002.do.create-hall-table.sql
-- Creates the hall table (venues where events take place).

CREATE TABLE IF NOT EXISTS hall (
  id              SERIAL        PRIMARY KEY,
  name            VARCHAR(64),
  capacity        INT,
  address         VARCHAR(256),
  vendor_id       INT,
  box_office_id   INT,
  seat_selection  BOOLEAN,
  open_seating    BOOLEAN,
  remark          JSON,
  space           JSON,

  -- metadata
  created_by      INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at      DATE          NOT NULL DEFAULT CURRENT_DATE,
  updated_at      DATE          NOT NULL DEFAULT CURRENT_DATE
);
