CREATE TABLE public.promo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  coupon_code text NOT NULL,
  discount_description text NOT NULL,
  valid_until date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.promo_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot access coupons" ON public.promo_coupons
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);