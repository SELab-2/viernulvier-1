-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Drop the UNIQUE constraint on blogpost.blog so that multiple blogposts can belong to the same blog.
-- The constraint was originally named after the old column name (blog_id) and persists after the rename.
ALTER TABLE blogpost DROP CONSTRAINT IF EXISTS blogpost_blog_id_key;
