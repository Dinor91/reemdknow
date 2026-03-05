CREATE TABLE public.deals_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  product_name text,
  product_name_hebrew text,
  platform text NOT NULL,
  category text,
  affiliate_url text,
  commission_rate numeric,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.deals_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on deals_sent"
  ON public.deals_sent FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read deals_sent"
  ON public.deals_sent FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));