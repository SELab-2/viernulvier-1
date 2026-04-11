-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Creates the junction table for the many-to-many relation between production and blogpost.

CREATE TABLE IF NOT EXISTS production_blogpost (
  production  INT  NOT NULL REFERENCES production(id) ON DELETE CASCADE,
  blogpost    INT  NOT NULL REFERENCES blogpost(id)   ON DELETE CASCADE,

  PRIMARY KEY (production, blogpost)
) INHERITS (metadata);

-- Index for faster lookups when fetching all productions linked to a given blogpost
CREATE INDEX IF NOT EXISTS idx_production_blogpost_blogpost ON production_blogpost(blogpost);
