-- Speeds list ordering by production: first event via (production, id) and similar lookups.
CREATE INDEX IF NOT EXISTS idx_event_production_id ON event(production, id);
