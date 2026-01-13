-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view only their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create simple policy: users can only read their own role
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for admins to manage roles using the has_role function
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));