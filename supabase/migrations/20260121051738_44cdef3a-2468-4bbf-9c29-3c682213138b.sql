-- Create AliExpress feed categories table
CREATE TABLE public.aliexpress_feed_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT NOT NULL UNIQUE,
  category_name_english TEXT,
  category_name_hebrew TEXT NOT NULL,
  parent_category_id TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AliExpress feed products table
CREATE TABLE public.aliexpress_feed_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aliexpress_product_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_name_hebrew TEXT,
  image_url TEXT,
  price_usd NUMERIC,
  original_price_usd NUMERIC,
  discount_percentage INTEGER,
  currency TEXT DEFAULT 'USD',
  category_id TEXT,
  category_name_hebrew TEXT,
  commission_rate NUMERIC,
  sales_30d INTEGER DEFAULT 0,
  rating NUMERIC,
  reviews_count INTEGER DEFAULT 0,
  tracking_link TEXT,
  is_featured BOOLEAN DEFAULT false,
  out_of_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.aliexpress_feed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliexpress_feed_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for aliexpress_feed_categories
CREATE POLICY "AliExpress categories are publicly readable"
  ON public.aliexpress_feed_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage AliExpress categories"
  ON public.aliexpress_feed_categories
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  ));

-- RLS policies for aliexpress_feed_products
CREATE POLICY "AliExpress products are publicly readable"
  ON public.aliexpress_feed_products
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage AliExpress products"
  ON public.aliexpress_feed_products
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  ));

-- Create indexes for performance
CREATE INDEX idx_aliexpress_products_category ON public.aliexpress_feed_products(category_id);
CREATE INDEX idx_aliexpress_products_featured ON public.aliexpress_feed_products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_aliexpress_products_sales ON public.aliexpress_feed_products(sales_30d DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_aliexpress_products_updated_at
  BEFORE UPDATE ON public.aliexpress_feed_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aliexpress_categories_updated_at
  BEFORE UPDATE ON public.aliexpress_feed_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();