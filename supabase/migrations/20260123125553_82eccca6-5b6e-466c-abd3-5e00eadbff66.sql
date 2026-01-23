-- Remove duplicate SELECT policy on contact_requests
-- "Admins can view all requests" is duplicate of "Admins can view contact requests"
DROP POLICY IF EXISTS "Admins can view all requests" ON public.contact_requests;