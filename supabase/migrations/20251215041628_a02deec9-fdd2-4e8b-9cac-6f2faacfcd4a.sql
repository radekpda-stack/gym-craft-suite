
-- =====================================================
-- NEW D+1 FEEDBACK SYSTEM - COMPREHENSIVE MIGRATION
-- =====================================================

-- 1. Add feedback_enabled flag to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS feedback_enabled BOOLEAN DEFAULT true;

-- 2. Update training_feedback table with new 7-scale fields (keeping old fields for backward compatibility)
ALTER TABLE public.training_feedback 
  ADD COLUMN IF NOT EXISTS soreness INTEGER,
  ADD COLUMN IF NOT EXISTS body_feel INTEGER,
  ADD COLUMN IF NOT EXISTS pain INTEGER,
  ADD COLUMN IF NOT EXISTS session_fit INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty INTEGER,
  ADD COLUMN IF NOT EXISTS fun INTEGER,
  ADD COLUMN IF NOT EXISTS pain_area TEXT,
  ADD COLUMN IF NOT EXISTS pain_area_other TEXT,
  ADD COLUMN IF NOT EXISTS is_red_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS red_flag_reasons TEXT[];

-- Note: energy column already exists as text, we'll keep it and add energy_rating as integer for the new scale
ALTER TABLE public.training_feedback 
  ADD COLUMN IF NOT EXISTS energy_rating INTEGER;

-- 3. Add new columns to feedback_requests (already exists but need some additions)
ALTER TABLE public.feedback_requests 
  ADD COLUMN IF NOT EXISTS send_channel TEXT,
  ADD COLUMN IF NOT EXISTS is_link_generated BOOLEAN DEFAULT false;

-- 4. Update notifications table to support severity and entity linking
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';

-- 5. Add feedback settings to app_settings (we'll use the existing table)
-- The settings will be stored as JSON in the value field

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_feedback_is_red_flag ON public.training_feedback(is_red_flag) WHERE is_red_flag = true;
CREATE INDEX IF NOT EXISTS idx_training_feedback_client_training ON public.training_feedback(client_id, training_session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_token_active ON public.feedback_requests(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- 7. Add feedback_received type support to notifications (already exists in existing types)
COMMENT ON COLUMN public.notifications.type IS 'Notification types: low_credit, negative_credit, birthday, milestone_100, milestone_500, milestone_1000, incomplete_training, feedback_received, feedback_red_flag';
