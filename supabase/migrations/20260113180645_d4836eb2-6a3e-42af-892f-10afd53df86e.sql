-- Create table for category products with full details
CREATE TABLE public.category_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_hebrew TEXT NOT NULL,
  name_english TEXT,
  affiliate_link TEXT NOT NULL,
  lazada_product_id TEXT,
  image_url TEXT,
  price_thb NUMERIC,
  currency TEXT DEFAULT '฿',
  rating NUMERIC,
  sales_count INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (products are public)
CREATE POLICY "Anyone can view category products" 
ON public.category_products 
FOR SELECT 
USING (true);

-- Admins can modify (using user_roles table)
CREATE POLICY "Admins can insert category products" 
ON public.category_products 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update category products" 
ON public.category_products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete category products" 
ON public.category_products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_category_products_affiliate_link ON public.category_products(affiliate_link);
CREATE INDEX idx_category_products_category ON public.category_products(category);