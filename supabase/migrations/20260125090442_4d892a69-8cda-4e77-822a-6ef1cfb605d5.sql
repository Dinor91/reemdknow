-- Add explicit RESTRICTIVE policy to prevent non-admin INSERT on user_roles
-- This prevents privilege escalation attacks
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit RESTRICTIVE policy to prevent non-admin UPDATE on user_roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit RESTRICTIVE policy to prevent non-admin DELETE on user_roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit deny for anonymous users on user_roles
CREATE POLICY "Anon cannot access user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit deny for anonymous SELECT on contact_requests (defense in depth)
CREATE POLICY "Anon cannot read contact requests"
ON public.contact_requests
FOR SELECT
TO anon
USING (false);

-- Add explicit deny for anonymous UPDATE on contact_requests
CREATE POLICY "Anon cannot update contact requests"
ON public.contact_requests
FOR UPDATE
TO anon
USING (false);

-- Add explicit deny for anonymous DELETE on contact_requests
CREATE POLICY "Anon cannot delete contact requests"
ON public.contact_requests
FOR DELETE
TO anon
USING (false);