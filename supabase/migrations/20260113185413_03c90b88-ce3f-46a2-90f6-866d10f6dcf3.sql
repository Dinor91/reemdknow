-- Remove the public SELECT policy that allows full access
DROP POLICY IF EXISTS "Anyone can view feed products public fields" ON public.feed_products;

-- The view feed_products_public with security_invoker will now fail for anon users
-- since there's no SELECT policy on feed_products for them
-- We need a different approach - use a function that returns only safe fields

-- Drop the view
DROP VIEW IF EXISTS public.feed_products_public;

-- Create a security definer function that only returns safe fields
CREATE OR REPLACE FUNCTION public.get_public_feed_products()
RETURNS TABLE (
  id uuid,
  lazada_product_id text,
  product_name text,
  image_url text,
  price_thb numeric,
  currency text,
  category_l1 integer,
  category_name_hebrew text,
  brand_name text,
  tracking_link text,
  is_featured boolean,
  out_of_stock boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute on the function to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_feed_products() TO anon, authenticated;