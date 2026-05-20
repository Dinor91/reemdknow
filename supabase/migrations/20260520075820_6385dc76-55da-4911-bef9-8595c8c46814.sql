ALTER TABLE public.israel_editor_products 
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE public.amazon_editor_products 
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE public.category_products 
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT,
  ADD COLUMN IF NOT EXISTS audit_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_israel_editor_archived_at ON public.israel_editor_products(archived_at);
CREATE INDEX IF NOT EXISTS idx_amazon_editor_archived_at ON public.amazon_editor_products(archived_at);
CREATE INDEX IF NOT EXISTS idx_category_products_archived_at ON public.category_products(archived_at);