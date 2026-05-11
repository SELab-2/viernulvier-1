-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Convert blog and blogpost fields to LanguageMap (JSONB)

ALTER TABLE blog
  ALTER COLUMN name TYPE JSONB USING jsonb_build_object('nl', name),
  ALTER COLUMN name SET DEFAULT '{}'::jsonb,
  ALTER COLUMN name SET NOT NULL,
  
  ALTER COLUMN description TYPE JSONB USING jsonb_build_object('nl', description);

ALTER TABLE blogpost 
  ALTER COLUMN title TYPE JSONB USING jsonb_build_object('nl', title),
  ALTER COLUMN title SET DEFAULT '{}'::jsonb,
  ALTER COLUMN title SET NOT NULL;
