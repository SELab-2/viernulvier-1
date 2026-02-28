-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Creates tag_type and tag tables

-- ============================================================
-- TAG TYPE
-- ============================================================
CREATE TABLE IF NOT EXISTS tag_type (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(32)     NOT NULL UNIQUE,

  -- metadata
  created_by  INT             REFERENCES admin(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_by  INT             REFERENCES admin(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TAG
-- ============================================================
CREATE TABLE IF NOT EXISTS tag (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(32)     NOT NULL,
  public      BOOLEAN         NOT NULL DEFAULT FALSE, -- false = CMS only, true = Public
  type_id     INT             NOT NULL REFERENCES tag_type(id) ON DELETE CASCADE,
  

  -- metadata
  created_by  INT             REFERENCES admin(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_by  INT             REFERENCES admin(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Constraints & Indexes
  CONSTRAINT unique_tag_per_type UNIQUE (name, type_id)
);

-- Index for faster lookups when filtering productions by tag type
CREATE INDEX IF NOT EXISTS idx_tag_type_id ON tag(type_id);