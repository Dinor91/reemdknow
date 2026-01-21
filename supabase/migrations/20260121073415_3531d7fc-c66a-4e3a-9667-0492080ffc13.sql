-- Drop the lazada_products table and its related trigger/function
DROP TRIGGER IF EXISTS update_lazada_products_updated_at ON public.lazada_products;
DROP FUNCTION IF EXISTS public.update_lazada_products_updated_at();
DROP TABLE IF EXISTS public.lazada_products;