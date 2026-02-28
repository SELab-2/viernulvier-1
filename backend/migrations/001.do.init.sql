-- 001.do.init.sql
-- Creates the admin table (needed first as all other tables reference admin via created_by)
-- and the production table.

-- ============================================================
-- ADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS admin (
  id              SERIAL        PRIMARY KEY,
  username        VARCHAR(32)   NOT NULL,
  password        VARCHAR(64)   NOT NULL,
  profile_picture VARCHAR(128),

  -- metadata
  created_by      INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at      DATE          NOT NULL DEFAULT CURRENT_DATE,
  updated_at      DATE          NOT NULL DEFAULT CURRENT_DATE
);

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
  supertitle        JSON,
  title             JSON          NOT NULL,
  artist            JSON,
  meta_title        JSON,
  meta_description  JSON,
  tagline           JSON,
  teaser            JSON,
  description       JSON,
  description_extra JSON,
  description_2     JSON,
  video_1           JSON,
  video_2           JSON,
  quote             JSON,
  quote_source      JSON,
  programma         JSON,
  info              JSON,
  description_short JSON,
  eticket_info      JSON,
  custom_data       JSON,

  -- metadata
  created_by        INT           REFERENCES admin(id) ON DELETE SET NULL,
  created_at        DATE          NOT NULL DEFAULT CURRENT_DATE,
  updated_at        DATE          NOT NULL DEFAULT CURRENT_DATE
);
