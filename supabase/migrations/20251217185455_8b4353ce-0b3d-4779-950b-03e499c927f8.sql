-- Update the notifications type check constraint to include client_anniversary
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'low_credit', 
    'negative_credit', 
    'birthday', 
    'milestone_100', 
    'milestone_500', 
    'milestone_1000',
    'incomplete_training',
    'feedback_received',
    'feedback_red_flag',
    'feedback_trend_alert',
    'reminder',
    'client_anniversary'
  )
);