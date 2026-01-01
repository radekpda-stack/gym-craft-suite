-- Add event_id for client-side dedup and idempotent inserts
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS event_id UUID;

-- Create unique index for idempotent event inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_usage_event_id 
ON public.feature_usage(event_id) 
WHERE event_id IS NOT NULL;

-- Add active_duration_ms for visibility-aware time tracking
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS active_duration_ms INTEGER;

-- Add visibility_interruptions count
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS visibility_interruptions INTEGER DEFAULT 0;

-- Add error_code for standardized error categorization
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS error_code TEXT;

-- Add entity tracking for better debugging
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS entity_type TEXT;

ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Add retry_count for network failure tracking
ALTER TABLE public.feature_usage 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create index for faster session queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_session_id 
ON public.feature_usage(session_id);

-- Create index for user event queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_created 
ON public.feature_usage(user_id, created_at DESC);

-- Function to handle idempotent event inserts
CREATE OR REPLACE FUNCTION public.upsert_analytics_event(
  p_event_id UUID,
  p_user_id UUID,
  p_feature_name TEXT,
  p_feature_category TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_active_duration_ms INTEGER DEFAULT NULL,
  p_visibility_interruptions INTEGER DEFAULT 0,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to insert, ignore if event_id already exists
  INSERT INTO public.feature_usage (
    id,
    event_id,
    user_id,
    feature_name,
    feature_category,
    metadata,
    session_id,
    duration_ms,
    active_duration_ms,
    visibility_interruptions,
    success,
    error_message,
    error_code,
    entity_type,
    entity_id,
    retry_count,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_event_id,
    p_user_id,
    p_feature_name,
    p_feature_category,
    p_metadata,
    p_session_id,
    p_duration_ms,
    p_active_duration_ms,
    p_visibility_interruptions,
    p_success,
    p_error_message,
    p_error_code,
    p_entity_type,
    p_entity_id,
    p_retry_count,
    NOW()
  )
  ON CONFLICT (event_id) WHERE event_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;
  
  RETURN COALESCE(v_id, (SELECT id FROM feature_usage WHERE event_id = p_event_id));
END;
$$;