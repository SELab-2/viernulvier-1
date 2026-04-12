-- Reverts 009.do.rename-fk-columns-to-table-names.sql

ALTER TABLE production_custom_field RENAME COLUMN production TO production_id;
ALTER INDEX IF EXISTS idx_pcf_production RENAME TO idx_pcf_production_id;

ALTER TABLE blogpost RENAME COLUMN blog TO blog_id;
ALTER INDEX IF EXISTS idx_blogpost_blog RENAME TO idx_blogpost_blog_id;

ALTER TABLE crop RENAME COLUMN image TO image_id;
ALTER INDEX IF EXISTS idx_crop_image RENAME TO idx_crop_image_id;

ALTER TABLE image RENAME COLUMN production TO production_id;
ALTER INDEX IF EXISTS idx_image_production RENAME TO idx_image_production_id;

ALTER TABLE production_tag RENAME COLUMN tag TO tag_id;
ALTER TABLE production_tag RENAME COLUMN production TO production_id;
ALTER INDEX IF EXISTS idx_prod_tag_tag RENAME TO idx_prod_tag_tag_id;

ALTER TABLE tag RENAME COLUMN tag_type TO type_id;
ALTER INDEX IF EXISTS idx_tag_tag_type RENAME TO idx_tag_type_id;
