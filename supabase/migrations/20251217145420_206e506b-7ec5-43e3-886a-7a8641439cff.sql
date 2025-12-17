-- Drop the old check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new check constraint with feedback types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'low_credit'::text, 
  'negative_credit'::text, 
  'birthday'::text, 
  'milestone_100'::text, 
  'milestone_500'::text, 
  'milestone_1000'::text,
  'feedback_received'::text,
  'feedback_red_flag'::text,
  'feedback_trend_alert'::text
]));