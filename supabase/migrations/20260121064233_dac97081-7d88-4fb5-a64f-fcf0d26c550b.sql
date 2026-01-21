-- Create a separate table for Israel editor's picks (like category_products for Thailand)
CREATE TABLE public.israel_editor_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aliexpress_product_id TEXT,
  product_name_hebrew TEXT NOT NULL,
  product_name_english TEXT,
  image_url TEXT,
  price_usd NUMERIC,
  original_price_usd NUMERIC,
  discount_percentage INTEGER,
  rating NUMERIC,
  sales_count INTEGER DEFAULT 0,
  tracking_link TEXT NOT NULL,
  category_name_hebrew TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  out_of_stock BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.israel_editor_products ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view Israel editor products" 
ON public.israel_editor_products 
FOR SELECT 
USING (true);

-- Admin policies
CREATE POLICY "Admins can insert Israel editor products" 
ON public.israel_editor_products 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update Israel editor products" 
ON public.israel_editor_products 
FOR UPDATE 
USING (EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete Israel editor products" 
ON public.israel_editor_products 
FOR DELETE 
USING (EXISTS ( SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_israel_editor_products_updated_at
BEFORE UPDATE ON public.israel_editor_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();