ALTER TABLE public.israel_editor_products ADD COLUMN IF NOT EXISTS channel text, ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.amazon_editor_products ADD COLUMN IF NOT EXISTS channel text, ADD COLUMN IF NOT EXISTS country text;
CREATE INDEX IF NOT EXISTS idx_israel_editor_products_channel ON public.israel_editor_products(channel);
CREATE INDEX IF NOT EXISTS idx_amazon_editor_products_channel ON public.amazon_editor_products(channel);