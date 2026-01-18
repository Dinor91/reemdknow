-- Fix contact_requests: Only admins can view, anyone can insert
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Only admins can view requests" ON public.contact_requests;

-- Allow anyone to submit a request (public form)
CREATE POLICY "Anyone can insert contact requests" 
ON public.contact_requests 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view requests
CREATE POLICY "Only admins can view requests" 
ON public.contact_requests 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Only admins can update requests
CREATE POLICY "Only admins can update requests" 
ON public.contact_requests 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Only admins can delete requests
CREATE POLICY "Only admins can delete requests" 
ON public.contact_requests 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Fix feed_products: Add public SELECT policy
DROP POLICY IF EXISTS "Feed products are publicly readable" ON public.feed_products;
CREATE POLICY "Feed products are publicly readable" 
ON public.feed_products 
FOR SELECT 
USING (true);