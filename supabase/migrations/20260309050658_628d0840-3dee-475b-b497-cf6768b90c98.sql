CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query text NOT NULL,
  platform text NOT NULL,
  found_results boolean NOT NULL DEFAULT false,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Admins can read search history
CREATE POLICY "Admins can view search history"
  ON public.search_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role (edge functions) can insert
CREATE POLICY "Service role can insert search history"
  ON public.search_history FOR INSERT
  WITH CHECK (true);

-- No anon access
CREATE POLICY "Anon cannot access search history"
  ON public.search_history FOR ALL
  USING (false)
  WITH CHECK (false);