-- Remove the public INSERT policy on button_clicks
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.button_clicks;

-- Create a view for feed_products that hides sensitive business data
CREATE OR REPLACE VIEW public.feed_products_public AS
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

-- Update the RLS policy on feed_products to only allow admins
DROP POLICY IF EXISTS "Feed products are publicly readable" ON public.feed_products;