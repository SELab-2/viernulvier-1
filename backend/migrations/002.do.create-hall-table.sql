-- 002.do.create-hall-table.sql
-- Creates the hall table (venues where events take place).

CREATE TABLE IF NOT EXISTS hall (
  id              SERIAL        PRIMARY KEY,
  name            JSONB         NOT NULL,
  capacity        INT           CHECK (capacity >= 0),
  address         VARCHAR(256),
  vendor_id       INT,
  box_office_id   INT,
  seat_selection  BOOLEAN,
  open_seating    BOOLEAN,
  remark          JSONB,
  space           JSONB,

  -- metadata
  created_by      INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_DATE,
  updated_by      INT           REFERENCES admin(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_DATE
);
