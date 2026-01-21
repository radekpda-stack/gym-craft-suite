-- Drop the old constraint and add updated one with pre_diagnostic_completed type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'low_credit'::text,
    'negative_credit'::text,
    'birthday'::text,
    'milestone_100'::text,
    'milestone_500'::text,
    'milestone_1000'::text,
    'incomplete_training'::text,
    'feedback_received'::text,
    'feedback_red_flag'::text,
    'feedback_trend_alert'::text,
    'reminder'::text,
    'client_anniversary'::text,
    'package_expiring'::text,
    'inactivity_warning'::text,
    'training_streak'::text,
    'diagnostic_completed'::text,
    'pre_diagnostic_completed'::text
  ])
);