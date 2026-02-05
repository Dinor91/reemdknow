-- Add UNIQUE constraint on lazada_product_id to enable upsert operations for Thailand imports
-- First, remove any duplicate lazada_product_id values (keep the most recently updated one)
DELETE FROM public.category_products a
USING public.category_products b
WHERE a.lazada_product_id IS NOT NULL
  AND a.lazada_product_id = b.lazada_product_id
  AND a.id != b.id
  AND a.updated_at < b.updated_at;

-- Now add the unique constraint
ALTER TABLE public.category_products
ADD CONSTRAINT category_products_lazada_product_id_unique UNIQUE (lazada_product_id);