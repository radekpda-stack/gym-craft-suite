-- Add new columns to clients table for pre-diagnostic data
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS height numeric;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sleep_quality text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pain_areas text[];
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS injury_history text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS surgery_history text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS movement_frequency text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS daily_activity_type text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS training_dislikes text[];

-- Add comments for documentation
COMMENT ON COLUMN public.clients.height IS 'Client height in centimeters';
COMMENT ON COLUMN public.clients.weight IS 'Client weight in kilograms';
COMMENT ON COLUMN public.clients.sleep_quality IS 'Sleep quality rating or description';
COMMENT ON COLUMN public.clients.pain_areas IS 'Areas where client experiences pain';
COMMENT ON COLUMN public.clients.injury_history IS 'Past injuries description';
COMMENT ON COLUMN public.clients.surgery_history IS 'Past surgeries description';
COMMENT ON COLUMN public.clients.movement_frequency IS 'How often client exercises/moves';
COMMENT ON COLUMN public.clients.daily_activity_type IS 'Type of daily activity (sedentary, active, etc.)';
COMMENT ON COLUMN public.clients.training_dislikes IS 'Exercises or training types client dislikes';