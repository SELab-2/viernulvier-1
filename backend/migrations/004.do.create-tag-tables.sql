-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Creates tag_type and tag tables

-- ============================================================
-- TAG TYPE
-- ============================================================
CREATE TABLE IF NOT EXISTS tag_type (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(32)     NOT NULL UNIQUE
) INHERITS (metadata);

-- ============================================================
-- TAG
-- ============================================================
CREATE TABLE IF NOT EXISTS tag (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(32)     NOT NULL,
  public      BOOLEAN         NOT NULL DEFAULT FALSE, -- false = CMS only, true = Public
  type_id     INT             NOT NULL REFERENCES tag_type(id) ON DELETE CASCADE,

  -- Constraints & Indexes
  CONSTRAINT unique_tag_per_type UNIQUE (name, type_id)
) INHERITS (metadata);

-- ============================================================
-- TAG X PRODUCTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS production_tag (
  production_id INT NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  tag_id        INT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,

  PRIMARY KEY (production_id, tag_id)
) INHERITS (metadata);

-- Index for faster lookups when filtering productions by tag type
CREATE INDEX IF NOT EXISTS idx_tag_type_id ON tag(type_id);
-- Index for filtering productions by tag
CREATE INDEX IF NOT EXISTS idx_prod_tag_tag_id ON production_tag(tag_id);
