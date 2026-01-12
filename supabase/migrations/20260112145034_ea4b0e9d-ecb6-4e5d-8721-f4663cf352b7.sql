-- Fix button_clicks RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.button_clicks;
DROP POLICY IF EXISTS "Anyone can view clicks" ON public.button_clicks;

-- Create proper SELECT policy - only admins can view analytics
CREATE POLICY "Admins can view analytics" 
ON public.button_clicks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create INSERT policy - allow public inserts with validation
CREATE POLICY "Anyone can insert clicks" 
ON public.button_clicks 
FOR INSERT 
WITH CHECK (button_type IS NOT NULL AND source IS NOT NULL);