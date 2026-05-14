
ALTER TABLE public.israel_editor_products
  ADD COLUMN IF NOT EXISTS audit_notes text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.amazon_editor_products
  ADD COLUMN IF NOT EXISTS audit_notes text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_israel_editor_scout_queue
  ON public.israel_editor_products (source, is_active, archived_at);
CREATE INDEX IF NOT EXISTS idx_amazon_editor_scout_queue
  ON public.amazon_editor_products (source, is_active, archived_at);

-- growth_metrics
CREATE TABLE IF NOT EXISTS public.growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  instagram_followers integer,
  whatsapp_members integer,
  telegram_members integer,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage growth_metrics" ON public.growth_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- revenue_uploads
CREATE TABLE IF NOT EXISTS public.revenue_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  platform text NOT NULL CHECK (platform IN ('amazon','aliexpress','lazada')),
  period_start date,
  period_end date,
  gross_revenue_ils numeric DEFAULT 0,
  commission_ils numeric DEFAULT 0,
  orders_count integer DEFAULT 0,
  raw jsonb,
  filename text,
  created_by uuid
);
ALTER TABLE public.revenue_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage revenue_uploads" ON public.revenue_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- investigation_posts
CREATE TABLE IF NOT EXISTS public.investigation_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  url text,
  platform text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investigation_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage investigation_posts" ON public.investigation_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- roadmap_metrics (singleton-ish key/value)
CREATE TABLE IF NOT EXISTS public.roadmap_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value numeric,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage roadmap_metrics" ON public.roadmap_metrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Roadmap metrics readable by admins" ON public.roadmap_metrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
