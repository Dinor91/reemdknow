-- Create blocked_emails table for spam prevention
CREATE TABLE public.blocked_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'spam',
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked emails
CREATE POLICY "Admins can view blocked emails"
ON public.blocked_emails
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert blocked emails
CREATE POLICY "Admins can insert blocked emails"
ON public.blocked_emails
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete blocked emails
CREATE POLICY "Admins can delete blocked emails"
ON public.blocked_emails
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Deny anon access
CREATE POLICY "Anon cannot access blocked emails"
ON public.blocked_emails
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create index for fast email lookups
CREATE INDEX idx_blocked_emails_email ON public.blocked_emails(email);

-- Create function to check if email is blocked (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_email_blocked(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_emails
    WHERE LOWER(email) = LOWER(check_email)
  )
$$;

-- Create function to check if email has pending request
CREATE OR REPLACE FUNCTION public.has_pending_request(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contact_requests
    WHERE LOWER(email) = LOWER(check_email)
      AND status IN ('new', 'in_progress')
  )
$$;