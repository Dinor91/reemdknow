-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.feed_products_public;

CREATE VIEW public.feed_products_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  lazada_product_id,
  product_name,
  image_url,
  price_thb,
  currency,
  category_l1,
  category_name_hebrew,
  brand_name,
  tracking_link,
  is_featured,
  out_of_stock,
  created_at,
  updated_at
FROM public.feed_products;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.feed_products_public TO anon, authenticated;

-- Create a permissive SELECT policy for the public view access
CREATE POLICY "Anyone can view feed products public fields"
ON public.feed_products
FOR SELECT
USING (true);