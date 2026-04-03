-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Align FK column names with referenced tables (same pattern as event.production / event.hall).

-- tag → tag_type(id)
ALTER TABLE tag RENAME COLUMN type_id TO tag_type;
ALTER INDEX IF EXISTS idx_tag_type_id RENAME TO idx_tag_tag_type;

-- production_tag → production(id), tag(id)
ALTER TABLE production_tag RENAME COLUMN production_id TO production;
ALTER TABLE production_tag RENAME COLUMN tag_id TO tag;
ALTER INDEX IF EXISTS idx_prod_tag_tag_id RENAME TO idx_prod_tag_tag;

-- image → production(id)
ALTER TABLE image RENAME COLUMN production_id TO production;
ALTER INDEX IF EXISTS idx_image_production_id RENAME TO idx_image_production;

-- crop → image(id)
ALTER TABLE crop RENAME COLUMN image_id TO image;
ALTER INDEX IF EXISTS idx_crop_image_id RENAME TO idx_crop_image;

-- blogpost → blog(id)
ALTER TABLE blogpost RENAME COLUMN blog_id TO blog;
ALTER INDEX IF EXISTS idx_blogpost_blog_id RENAME TO idx_blogpost_blog;

-- production_custom_field → production(id)
ALTER TABLE production_custom_field RENAME COLUMN production_id TO production;
ALTER INDEX IF EXISTS idx_pcf_production_id RENAME TO idx_pcf_production;
