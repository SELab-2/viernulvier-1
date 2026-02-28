-- 003.do.create-event-tables.sql
-- Creates the event table and its child event_price table.
-- event depends on production (002) and hall (002).
-- event_price depends on event.

-- ============================================================
-- EVENT
-- ============================================================
CREATE TABLE IF NOT EXISTS event (
  id                    SERIAL        PRIMARY KEY,
  starts_at             TIMESTAMP,
  ends_at               TIMESTAMP,
  intermission_at       TIMESTAMP,
  doors_at              VARCHAR(64),
  box_office_id         INT,
  vendor_id             INT,
  max_tickets_per_order INT,
  uitdatabank_id        INT,
  secure                BOOLEAN,
  sms_verification      BOOLEAN,
  status                JSON,
  info                  JSON,
  eticket_info          JSON,
  external_order_url    JSON,
  order_url             VARCHAR(256),

  -- foreign keys
  production            INT           REFERENCES production(id) ON DELETE SET NULL,
  hall                  INT           NOT NULL REFERENCES hall(id) ON DELETE RESTRICT,

  -- metadata
  created_by            INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at            DATE          NOT NULL DEFAULT CURRENT_DATE,
  updated_at            DATE          NOT NULL DEFAULT CURRENT_DATE
);

-- Composite index on hall + starts_at (as defined in the EER)
CREATE INDEX IF NOT EXISTS idx_event_hall_starts_at ON event(hall, starts_at);

-- ============================================================
-- EVENT_PRICE
-- ============================================================
-- event is both PK and FK: exactly one price record per event (1:1 extension).
CREATE TABLE IF NOT EXISTS event_price (
  event           INT           PRIMARY KEY REFERENCES event(id) ON DELETE CASCADE,
  amount          VARCHAR(32),
  box_office_id   INT,
  available       INT,
  contingent_id   INT,
  expires_at      TIMESTAMP,
  price           JSON,
  rank            JSON,

  -- metadata
  created_by      INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at      DATE          NOT NULL DEFAULT CURRENT_DATE,
  updated_at      DATE          NOT NULL DEFAULT CURRENT_DATE
);
