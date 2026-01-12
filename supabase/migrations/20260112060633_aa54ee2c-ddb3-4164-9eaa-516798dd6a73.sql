-- Create button_clicks table for tracking user interactions
CREATE TABLE public.button_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  button_type TEXT NOT NULL CHECK (button_type IN ('whatsapp', 'telegram')),
  source TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.button_clicks ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anyone can track clicks)
CREATE POLICY "Anyone can insert clicks"
ON public.button_clicks
FOR INSERT
WITH CHECK (true);

-- Allow public reads for now (you can restrict later)
CREATE POLICY "Anyone can view clicks"
ON public.button_clicks
FOR SELECT
USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_button_clicks_button_type ON public.button_clicks(button_type);
CREATE INDEX idx_button_clicks_created_at ON public.button_clicks(created_at);