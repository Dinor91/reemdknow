-- Remove all duplicate/conflicting policies on contact_requests
DROP POLICY IF EXISTS "Only admins can view requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Only admins can delete requests" ON public.contact_requests;

-- The following policies remain and are correct:
-- "Public can submit contact requests" - INSERT (added in previous migration)
-- "Admins can view all requests" - SELECT
-- "Admins can update requests" - UPDATE