-- Creates image and crop tables for production assets

-- ============================================================
-- IMAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS image (
  id              SERIAL          PRIMARY KEY,
  production_id   INT             NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  res             VARCHAR(16),    -- e.g., "3840x2160"

  -- metadata
  created_by      INT             REFERENCES admin(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_by      INT             REFERENCES admin(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CROP
-- ============================================================
CREATE TABLE IF NOT EXISTS crop (
  id              SERIAL          PRIMARY KEY,
  image_id        INT             NOT NULL REFERENCES image(id) ON DELETE CASCADE,
  url             VARCHAR(255)    NOT NULL,
  type            VARCHAR(32),    NOT NULL,

  -- metadata
  created_by      INT             REFERENCES admin(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_by      INT             REFERENCES admin(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index for faster image retrieval by production
CREATE INDEX IF NOT EXISTS idx_image_production_id ON image(production_id);
-- Index for finding crops of a specific image
CREATE INDEX IF NOT EXISTS idx_crop_image_id ON crop(image_id);