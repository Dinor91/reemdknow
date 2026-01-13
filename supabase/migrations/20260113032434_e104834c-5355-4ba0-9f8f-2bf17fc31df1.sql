-- Drop the problematic default deny policy
DROP POLICY IF EXISTS "Default deny all access" ON public.user_roles;

-- The existing RESTRICTIVE policies are actually correct:
-- 1. "Users can view only their own roles" - allows users to see their own role
-- 2. "Admins can manage all roles" - allows admins full access
-- These RESTRICTIVE policies work together correctly