-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Creates blog and blogpost tables

-- ============================================================
-- BLOG (The Category or Parent Blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS blog (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(64)     NOT NULL, -- Increased to 64 for flexibility
  description TEXT,
) INHERITS (metadata);

-- ============================================================
-- BLOGPOST
-- ============================================================
CREATE TABLE IF NOT EXISTS blogpost (
  id            SERIAL          PRIMARY KEY,
  blog_id       INT             NOT NULL REFERENCES blog(id) ON DELETE CASCADE,
  title         VARCHAR(255)    NOT NULL,
  content       JSONB           NOT NULL DEFAULT '{}',
  published_at  TIMESTAMPTZ,    -- Allows for scheduled posts or drafts (NULL = draft)

  -- Constraints
  CONSTRAINT unique_blog_slug UNIQUE (blog_id, slug)
) INHERITS (metadata);

-- Index for fetching posts within a blog and for URL lookups
CREATE INDEX IF NOT EXISTS idx_blogpost_blog_id ON blogpost(blog_id);
CREATE INDEX IF NOT EXISTS idx_blogpost_slug ON blogpost(slug);