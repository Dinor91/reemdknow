-- Add a default PERMISSIVE deny policy to user_roles table
-- This ensures that even if RESTRICTIVE policies are bypassed, access is still denied by default
CREATE POLICY "Default deny all access"
ON public.user_roles
AS PERMISSIVE
FOR ALL
USING (false)
WITH CHECK (false);