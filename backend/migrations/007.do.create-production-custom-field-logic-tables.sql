-- UNDER NO CIRCUMSTANCES MAY THIS FILE BE EDITED WHEN LIVE
-- ANY EDITS WILL RESOLVE IN DIFFERENT CHECKSUMS AND THE DB REJECTING THE MIGRATION

-- Creates custom field definitions 


-- ============================================================
-- ENUMS
-- ============================================================
-- Creating the enum type first so it can be used in table definitions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_types') THEN
        CREATE TYPE field_types AS ENUM ('number', 'string', 'bool', 'json');
    END IF;
END $$;

-- ============================================================
-- CUSTOM PRODUCTION FIELD DEFINITION
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_production_field_definition (
  id          SERIAL          PRIMARY KEY,
  name        VARCHAR(64)     NOT NULL,
  
  type        field_types     NOT NULL,
) INHERITS (metadata);

-- ============================================================
-- PRODUCTION CUSTOM FIELD (The EAV Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS production_custom_field (
  field_definition_id     INT             REFERENCES custom_production_field_definition(id) ON DELETE CASCADE,
  production_id           INT             REFERENCES production(id) ON DELETE CASCADE,
  
  -- The sparse matrix of values
  value_bool      BOOLEAN,
  value_number    NUMERIC,
  value_string    TEXT,           -- TEXT to be safe
  value_json      JSONB,

  -- Composite Primary Key: A production can only have ONE value per field definition
  PRIMARY KEY (field_id, production_id)
) INHERITS (metadata);

-- Index for querying all custom fields for a specific production
CREATE INDEX IF NOT EXISTS idx_pcf_production_id ON production_custom_field(production_id);
