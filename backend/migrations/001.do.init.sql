-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION


-- 001.do.init.sql
-- Creates the admin table (needed first as all other tables reference admin via created_by)
-- and the production table.

-- ============================================================
-- METADATA
-- ============================================================
CREATE TABLE IF NOT EXISTS metadata (
  -- The other 2 fields are added in a later alter table statement once the admin table exists.
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS admin (
  id                  SERIAL        PRIMARY KEY,
  username            VARCHAR(32)   NOT NULL UNIQUE,
  password            VARCHAR(72)   NOT NULL,
  profile_picture_url VARCHAR(2048) CONSTRAINT is_url CHECK (profile_picture_url :: VARCHAR(2048) ~* 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,255}\.[a-z]{2,9}\y([-a-zA-Z0-9@:%_\+.~#?&//=]*)$')
) INHERITS (metadata);

-- This alter is needed because the admin table must exist before we can make these references.
ALTER TABLE metadata
  ADD COLUMN created_by INT REFERENCES admin(id) ON DELETE SET NULL,
  ADD COLUMN updated_by INT REFERENCES admin(id) ON DELETE SET NULL;


-- ============================================================
-- PRODUCTION
-- ============================================================
CREATE TABLE IF NOT EXISTS production (
  id                SERIAL        PRIMARY KEY,
  vendor_id         INT,
  box_office_id     INT,
  performer_field   VARCHAR(256),
  performer_type    VARCHAR(64),
  attendance_mode   VARCHAR(64),
  supertitle        JSONB,
  title             JSONB          NOT NULL,
  artist            JSONB,
  meta_title        JSONB,
  meta_description  JSONB,
  tagline           JSONB,
  teaser            JSONB,
  description       JSONB,
  description_extra JSONB,
  description_2     JSONB,
  video_1           JSONB,
  video_2           JSONB,
  quote             JSONB,
  quote_source      JSONB,
  programme        JSONB,
  info              JSONB,
  description_short JSONB,
  eticket_info      JSONB,
  custom_data       JSONB
) INHERITS (metadata);
