-- Create lazada_products table to store products from Lazada API
CREATE TABLE public.lazada_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lazada_item_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_thb DECIMAL(10,2),
  price_original_thb DECIMAL(10,2),
  discount_percentage INTEGER,
  rating DECIMAL(2,1),
  reviews_count INTEGER DEFAULT 0,
  affiliate_link TEXT,
  category TEXT,
  is_featured BOOLEAN DEFAULT false,
  icon TEXT DEFAULT '📦',
  savings_ils TEXT,
  price_ils TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lazada_products ENABLE ROW LEVEL SECURITY;

-- Public read access for products (everyone can view products)
CREATE POLICY "Anyone can view products"
ON public.lazada_products
FOR SELECT
USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can manage products"
ON public.lazada_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_lazada_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lazada_products_updated_at
BEFORE UPDATE ON public.lazada_products
FOR EACH ROW
EXECUTE FUNCTION public.update_lazada_products_updated_at();