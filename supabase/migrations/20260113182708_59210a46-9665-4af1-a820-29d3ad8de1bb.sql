-- Create a table to store featured feed categories configuration
CREATE TABLE public.feed_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id INTEGER NOT NULL,
  category_name_hebrew TEXT NOT NULL,
  category_name_english TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for displaying products)
CREATE POLICY "Feed categories are publicly readable"
ON public.feed_categories
FOR SELECT
USING (true);

-- Allow admins to manage feed categories
CREATE POLICY "Admins can manage feed categories"
ON public.feed_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create a table to cache feed products
CREATE TABLE public.feed_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lazada_product_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  image_url TEXT,
  price_thb NUMERIC,
  currency TEXT DEFAULT '฿',
  sales_7d INTEGER DEFAULT 0,
  commission_rate NUMERIC,
  category_l1 INTEGER,
  category_name_hebrew TEXT,
  brand_name TEXT,
  tracking_link TEXT,
  is_featured BOOLEAN DEFAULT false,
  out_of_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_products ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Feed products are publicly readable"
ON public.feed_products
FOR SELECT
USING (true);

-- Allow admins to manage feed products
CREATE POLICY "Admins can manage feed products"
ON public.feed_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert the 4 requested categories (we'll need to find the correct Lazada category IDs)
INSERT INTO public.feed_categories (category_name_hebrew, category_name_english, category_id, display_order) VALUES
('גאדג''טים לבית', 'Home Gadgets', 10100636, 1),
('משחקי ילדים', 'Kids Toys', 10100527, 2),
('טיולים', 'Travel & Outdoor', 10100609, 3),
('ריהוט', 'Furniture', 10100597, 4);