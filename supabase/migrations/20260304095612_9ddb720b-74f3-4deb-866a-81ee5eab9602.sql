
-- Orders from Lazada (Thailand)
CREATE TABLE public.orders_lazada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_name text,
  category_name text,
  order_amount_thb numeric DEFAULT 0,
  commission_thb numeric DEFAULT 0,
  order_status text,
  order_date timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Orders from AliExpress (Israel)
CREATE TABLE public.orders_aliexpress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_name text,
  category_name text,
  paid_amount_usd numeric DEFAULT 0,
  commission_usd numeric DEFAULT 0,
  order_status text,
  order_date timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS for orders_lazada
ALTER TABLE public.orders_lazada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lazada orders"
  ON public.orders_lazada FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot access lazada orders"
  ON public.orders_lazada FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- RLS for orders_aliexpress
ALTER TABLE public.orders_aliexpress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage aliexpress orders"
  ON public.orders_aliexpress FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon cannot access aliexpress orders"
  ON public.orders_aliexpress FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
