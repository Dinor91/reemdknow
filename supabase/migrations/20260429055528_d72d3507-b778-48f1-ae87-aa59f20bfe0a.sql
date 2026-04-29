CREATE TABLE public.amazon_editor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin text,
  product_name_english text,
  product_name_hebrew text NOT NULL,
  brand text,
  category_name_hebrew text NOT NULL,
  price_usd numeric,
  original_price_usd numeric,
  discount_percentage integer,
  rating numeric,
  sales_count integer DEFAULT 0,
  image_url text,
  tracking_link text NOT NULL,
  note text,
  source text DEFAULT 'manual',
  is_active boolean DEFAULT true,
  out_of_stock boolean DEFAULT false,
  last_shown timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.amazon_editor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view Amazon editor products"
ON public.amazon_editor_products FOR SELECT
USING (true);

CREATE POLICY "Admins can insert Amazon editor products"
ON public.amazon_editor_products FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update Amazon editor products"
ON public.amazon_editor_products FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete Amazon editor products"
ON public.amazon_editor_products FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_amazon_editor_products_updated_at
BEFORE UPDATE ON public.amazon_editor_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();