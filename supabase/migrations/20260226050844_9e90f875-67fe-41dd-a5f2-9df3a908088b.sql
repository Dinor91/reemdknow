ALTER TABLE public.feed_products ADD COLUMN IF NOT EXISTS seller_name text;
ALTER TABLE public.feed_products ADD COLUMN IF NOT EXISTS stock integer;