-- =====================================================
-- PHASE 1: Extend client_workout_logs for shared diary
-- =====================================================

-- Add status column with enum values
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed' 
CHECK (status IN ('draft', 'planned', 'in_progress', 'completed', 'reviewed'));

-- Add scheduled_for for trainer-assigned planned workouts
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NULL;

-- Add source to distinguish origin (client vs trainer)
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client_manual' 
CHECK (source IN ('client_manual', 'trainer_assigned'));

-- Add template reference for workouts created from templates
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS template_id uuid NULL REFERENCES public.training_templates(id) ON DELETE SET NULL;

-- Add RPE at workout level (not just exercise level)
ALTER TABLE public.client_workout_logs 
ADD COLUMN IF NOT EXISTS rpe integer NULL CHECK (rpe >= 1 AND rpe <= 10);

-- Add index for efficient querying by status and scheduled_for
CREATE INDEX IF NOT EXISTS idx_client_workout_logs_status ON public.client_workout_logs(status);
CREATE INDEX IF NOT EXISTS idx_client_workout_logs_scheduled_for ON public.client_workout_logs(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_workout_logs_source ON public.client_workout_logs(source);