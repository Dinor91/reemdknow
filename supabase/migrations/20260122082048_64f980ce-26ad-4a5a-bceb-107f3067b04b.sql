-- Add unique constraint on aliexpress_product_id for upsert to work
ALTER TABLE public.israel_editor_products 
ADD CONSTRAINT israel_editor_products_aliexpress_product_id_key 
UNIQUE (aliexpress_product_id);