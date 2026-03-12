
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS next_step_date DATE;
