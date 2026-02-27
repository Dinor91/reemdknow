
-- Create message_templates table
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read templates (needed for edge functions via service role, and admin UI)
CREATE POLICY "Templates are readable by admins"
ON public.message_templates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can modify
CREATE POLICY "Admins can insert templates"
ON public.message_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update templates"
ON public.message_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
ON public.message_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.message_templates (template_name, content) VALUES
('סיכום_שבועי', '🔥 סיכום שבועי - הדילים הכי שווים!

היי חברים! הנה 3 המוצרים הכי מבוקשים השבוע:

{products}

💡 כל הלינקים בדוקים ועדכניים!
📦 המחיר באתר עשוי להשתנות'),

('פתיחת_דיל', '🎯 דיל בזק!

{hook}

{product_details}'),

('סיום_הודעה', '💡 שאלות? שלחו הודעה פרטית!
📦 המחיר באתר עשוי להשתנות
🔗 לינק ישיר לרכישה 👇');
