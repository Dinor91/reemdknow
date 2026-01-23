-- Add new columns for budget and requirements
ALTER TABLE public.contact_requests 
ADD COLUMN IF NOT EXISTS budget TEXT,
ADD COLUMN IF NOT EXISTS requirements TEXT;