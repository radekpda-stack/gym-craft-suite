-- Drop old constraint and add new one with 'weekly' option
ALTER TABLE public.business_expenses DROP CONSTRAINT IF EXISTS business_expenses_recurring_interval_check;

ALTER TABLE public.business_expenses ADD CONSTRAINT business_expenses_recurring_interval_check 
CHECK (recurring_interval = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text]));