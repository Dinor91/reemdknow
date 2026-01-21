-- Add missing columns to feed_products for parity with AliExpress
ALTER TABLE public.feed_products 
ADD COLUMN IF NOT EXISTS original_price_thb numeric,
ADD COLUMN IF NOT EXISTS discount_percentage integer,
ADD COLUMN IF NOT EXISTS rating numeric,
ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0;