
CREATE TABLE public.deal_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'note',
  note TEXT NOT NULL,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deal activities"
ON public.deal_activities FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert deal activities"
ON public.deal_activities FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own activities"
ON public.deal_activities FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
