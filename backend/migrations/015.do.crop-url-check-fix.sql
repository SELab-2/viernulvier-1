-- Change crop.url from full URL to a relative path.
-- Drop the old URL-format CHECK constraint and add a path-format one.

ALTER TABLE crop DROP CONSTRAINT IF EXISTS is_url;

ALTER TABLE crop ADD CONSTRAINT is_path CHECK (url ~ '^/media/crops/.+$');