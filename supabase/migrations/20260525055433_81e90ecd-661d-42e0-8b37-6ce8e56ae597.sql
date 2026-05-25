
-- 1. user_sessions: replace overly-broad policy with deny-all (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role full access" ON public.user_sessions;
CREATE POLICY "Deny all client access to user_sessions"
  ON public.user_sessions FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 2. search_history: restrict client INSERT (edge functions use service_role which bypasses RLS)
DROP POLICY IF EXISTS "Service role can insert search history" ON public.search_history;
CREATE POLICY "Deny client inserts to search history"
  ON public.search_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 3. storage.objects product-images: restrict write ops to admins; restrict listing to admins
DROP POLICY IF EXISTS "Service role can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- SELECT policy restricted to admins for listing; public access to files is still served
-- via the public bucket's direct object URLs (CDN), which do not require this policy.
CREATE POLICY "Admins can list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
