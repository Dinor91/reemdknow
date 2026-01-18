ALTER TABLE public.category_products
ADD COLUMN IF NOT EXISTS out_of_stock boolean DEFAULT false;