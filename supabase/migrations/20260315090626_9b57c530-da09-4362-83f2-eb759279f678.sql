DROP FUNCTION IF EXISTS public.get_public_feed_products();

CREATE FUNCTION public.get_public_feed_products()
 RETURNS TABLE(
   id uuid,
   lazada_product_id text,
   product_name text,
   product_name_hebrew text,
   image_url text,
   price_thb numeric,
   currency text,
   category_l1 integer,
   category_name_hebrew text,
   brand_name text,
   tracking_link text,
   is_featured boolean,
   out_of_stock boolean,
   created_at timestamp with time zone,
   updated_at timestamp with time zone
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    id,
    lazada_product_id,
    product_name,
    product_name_hebrew,
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