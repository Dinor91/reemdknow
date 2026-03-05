ALTER TABLE israel_editor_products ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE category_products ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';