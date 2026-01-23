-- Fix security: Restrict SELECT access on contact_requests to admins only
-- Currently anyone can read customer emails and phone numbers

-- Drop any existing permissive SELECT policies
DROP POLICY IF EXISTS "Admins can view contact requests" ON public.contact_requests;

-- Create restrictive SELECT policy - only admins can view
CREATE POLICY "Admins can view contact requests"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix security: Restrict SELECT access on button_clicks to admins only
-- Currently anyone can read business analytics data

-- Drop any existing policies that might allow public SELECT
DROP POLICY IF EXISTS "Admins can view button clicks" ON public.button_clicks;

-- Create restrictive SELECT policy - only admins can view analytics
CREATE POLICY "Admins can view button clicks"
ON public.button_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));