-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- 003.do.create-event-tables.sql
-- Creates the event table and its child event_price table.
-- event depends on production (002) and hall (002).
-- event_price depends on event.

-- ============================================================
-- EVENT
-- ============================================================
CREATE TABLE IF NOT EXISTS event (
  id                    SERIAL        PRIMARY KEY,
  starts_at             TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,
  intermission_at       TIMESTAMPTZ,
  doors_at              VARCHAR(64),
  box_office_id         INT,
  vendor_id             INT,
  max_tickets_per_order INT,
  uitdatabank_id        INT,
  secure                BOOLEAN,
  sms_verification      BOOLEAN,
  status                JSONB,
  info                  JSONB,
  eticket_info          JSONB,
  external_order_url    JSONB,
  order_url             VARCHAR(256),

  -- foreign keys
  production            INT           REFERENCES production(id) ON DELETE CASCADE,
  hall                  INT           NOT NULL REFERENCES hall(id) ON DELETE RESTRICT
) INHERITS (metadata);

-- Composite index on hall + starts_at (as defined in the EER)
CREATE INDEX IF NOT EXISTS idx_event_hall_starts_at ON event(hall, starts_at);

-- ============================================================
-- EVENT_PRICE
-- ============================================================
-- event is both PK and FK: exactly one price record per event (1:1 extension).
CREATE TABLE IF NOT EXISTS event_price (
  id              SERIAL        PRIMARY KEY,
  amount          VARCHAR(32),
  box_office_id   INT,
  available       INT,
  contingent_id   INT,
  expires_at      TIMESTAMPTZ,
  price           JSONB,
  rank            JSONB,

  -- foreign keys
  event           INT           REFERENCES event(id) ON DELETE CASCADE
) INHERITS (metadata);
