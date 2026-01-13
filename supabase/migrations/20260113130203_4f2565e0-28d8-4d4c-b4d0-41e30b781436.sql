-- =====================================================
-- MIGRATION STEP 1: Add new columns to tables
-- =====================================================

-- 1) Add is_plyometric to exercises table
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS is_plyometric boolean DEFAULT false;

-- 2) Add new columns to exercise_entries for unified metrics
ALTER TABLE public.exercise_entries 
ADD COLUMN IF NOT EXISTS metric_key text,
ADD COLUMN IF NOT EXISTS attempt_values jsonb,
ADD COLUMN IF NOT EXISTS attempt_count integer,
ADD COLUMN IF NOT EXISTS side_scope text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS pr_scope_key text;