-- Fix contact_requests: Remove duplicate INSERT policies
DROP POLICY IF EXISTS "Anyone can submit contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;

-- Create single clean INSERT policy for contact_requests
CREATE POLICY "Public can submit contact requests" 
ON public.contact_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix button_clicks: Add INSERT policy for tracking clicks
CREATE POLICY "Anyone can insert clicks for tracking" 
ON public.button_clicks 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);