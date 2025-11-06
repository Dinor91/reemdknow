-- Create table for storing Lazada conversion data
CREATE TABLE public.lazada_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversion_type TEXT NOT NULL,
  order_id TEXT,
  product_id TEXT,
  product_name TEXT,
  commission_amount DECIMAL(10, 2),
  order_amount DECIMAL(10, 2),
  conversion_time TIMESTAMP WITH TIME ZONE,
  tracking_id TEXT,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lazada_conversions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public insert (for webhook)
CREATE POLICY "Allow webhook to insert conversions" 
ON public.lazada_conversions 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow reading all conversions (for admin)
CREATE POLICY "Allow reading all conversions" 
ON public.lazada_conversions 
FOR SELECT 
USING (true);

-- Create index for better query performance
CREATE INDEX idx_lazada_conversions_order_id ON public.lazada_conversions(order_id);
CREATE INDEX idx_lazada_conversions_created_at ON public.lazada_conversions(created_at DESC);