-- Drop the public read policy that allows anyone to read conversions
DROP POLICY IF EXISTS "Allow reading all conversions" ON public.lazada_conversions;

-- Create a new policy that only allows authenticated admins to read conversions
CREATE POLICY "Only admins can read conversions" 
ON public.lazada_conversions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));