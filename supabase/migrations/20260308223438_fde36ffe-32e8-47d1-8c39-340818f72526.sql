
CREATE TABLE public.campaign_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  html_body TEXT,
  delay_days INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, step_number)
);

ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaign steps"
ON public.campaign_steps FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert campaign steps"
ON public.campaign_steps FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaign steps"
ON public.campaign_steps FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete campaign steps"
ON public.campaign_steps FOR DELETE TO authenticated
USING (true);
