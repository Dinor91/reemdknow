
CREATE TABLE public.aliexpress_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id text NOT NULL UNIQUE,
  promo_name text NOT NULL,
  promo_desc text,
  is_active boolean DEFAULT true,
  last_synced timestamptz,
  products_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.aliexpress_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
  ON public.aliexpress_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Campaigns are publicly readable"
  ON public.aliexpress_campaigns FOR SELECT TO anon
  USING (true);

ALTER TABLE public.aliexpress_feed_products ADD COLUMN campaign_name text;
