-- =====================================================
-- ANALYTICS VIEWS & SNAPSHOTS
-- =====================================================

-- 1. SNAPSHOTS TABLE (pre-computed analytics for speed)
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('exercises', 'clients', 'finance')),
  entity_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own snapshots"
ON public.analytics_snapshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
ON public.analytics_snapshots FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
ON public.analytics_snapshots FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
ON public.analytics_snapshots FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_analytics_snapshots_user_scope 
ON public.analytics_snapshots(user_id, scope, period_start, period_end);

-- =====================================================
-- 2. EXERCISE ANALYTICS VIEWS
-- =====================================================

-- 2.1 Volume per day (for trend charts)
CREATE OR REPLACE VIEW public.analytics_exercise_volume_daily AS
SELECT
  e.user_id,
  e.client_id,
  e.date AS day,
  SUM(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS total_volume,
  COUNT(*) AS entry_count
FROM exercise_entries e
GROUP BY e.user_id, e.client_id, e.date;

-- 2.2 Muscle group distribution (uses exercise category as proxy)
CREATE OR REPLACE VIEW public.analytics_muscle_group_distribution AS
SELECT
  e.user_id,
  e.client_id,
  ex.category AS muscle_group,
  SUM(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS volume,
  COUNT(*) AS entry_count
FROM exercise_entries e
JOIN exercises ex ON ex.id = e.exercise_id
WHERE ex.category IS NOT NULL
GROUP BY e.user_id, e.client_id, ex.category;

-- 2.3 Movement patterns coverage
CREATE OR REPLACE VIEW public.analytics_movement_patterns AS
SELECT
  e.user_id,
  e.client_id,
  ex.movement_pattern,
  COUNT(*) AS entries_count,
  SUM(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS volume
FROM exercise_entries e
JOIN exercises ex ON ex.id = e.exercise_id
WHERE ex.movement_pattern IS NOT NULL
GROUP BY e.user_id, e.client_id, ex.movement_pattern;

-- 2.4 Unused exercises (exercises not used in period)
-- This is a function to allow period filtering
CREATE OR REPLACE FUNCTION public.get_unused_exercises(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  exercise_id uuid,
  exercise_name text,
  category text,
  last_used date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ex.id AS exercise_id,
    COALESCE(ex.name_cs, ex.name) AS exercise_name,
    ex.category,
    MAX(ee.date) AS last_used
  FROM exercises ex
  LEFT JOIN exercise_entries ee 
    ON ee.exercise_id = ex.id 
    AND ee.user_id = p_user_id
    AND ee.date BETWEEN p_start_date AND p_end_date
  WHERE ex.user_id = p_user_id OR ex.source = 'system'
  GROUP BY ex.id, ex.name_cs, ex.name, ex.category
  HAVING MAX(ee.date) IS NULL OR MAX(ee.date) < p_start_date
  ORDER BY ex.name;
$$;

-- =====================================================
-- 3. BASELINE VIEWS (trainer averages for comparison)
-- =====================================================

-- 3.1 Baseline volume per day (average across all clients)
CREATE OR REPLACE VIEW public.analytics_baseline_volume AS
SELECT
  e.user_id,
  e.date AS day,
  AVG(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS avg_volume,
  SUM(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS total_volume,
  COUNT(DISTINCT e.client_id) AS client_count
FROM exercise_entries e
GROUP BY e.user_id, e.date;

-- 3.2 Baseline muscle groups (average distribution)
CREATE OR REPLACE VIEW public.analytics_baseline_muscle_groups AS
SELECT
  e.user_id,
  ex.category AS muscle_group,
  AVG(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS avg_volume,
  SUM(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS total_volume,
  COUNT(DISTINCT e.client_id) AS client_count
FROM exercise_entries e
JOIN exercises ex ON ex.id = e.exercise_id
WHERE ex.category IS NOT NULL
GROUP BY e.user_id, ex.category;

-- 3.3 Baseline movement patterns
CREATE OR REPLACE VIEW public.analytics_baseline_movement_patterns AS
SELECT
  e.user_id,
  ex.movement_pattern,
  AVG(COALESCE(e.weight_kg, 0) * COALESCE(e.reps, 1) * COALESCE(e.sets, 1)) AS avg_volume,
  COUNT(*) AS total_entries,
  COUNT(DISTINCT e.client_id) AS client_count
FROM exercise_entries e
JOIN exercises ex ON ex.id = e.exercise_id
WHERE ex.movement_pattern IS NOT NULL
GROUP BY e.user_id, ex.movement_pattern;

-- =====================================================
-- 4. CLIENT ANALYTICS VIEWS
-- =====================================================

-- 4.1 Client activity per month
CREATE OR REPLACE VIEW public.analytics_client_activity AS
SELECT
  ts.user_id,
  ts.client_id,
  DATE_TRUNC('month', ts.date) AS month,
  COUNT(*) AS session_count,
  SUM(ts.duration) AS total_duration
FROM training_sessions ts
WHERE ts.status = 'completed'
GROUP BY ts.user_id, ts.client_id, DATE_TRUNC('month', ts.date);

-- 4.2 Client LTV (lifetime value)
CREATE OR REPLACE VIEW public.analytics_client_ltv AS
SELECT
  ct.user_id,
  ct.client_id,
  SUM(CASE WHEN ct.type = 'credit' THEN ct.amount ELSE 0 END) AS total_credits,
  SUM(CASE WHEN ct.type = 'debit' THEN ct.amount ELSE 0 END) AS total_debits,
  SUM(ct.amount) AS net_value,
  MIN(ct.created_at) AS first_transaction,
  MAX(ct.created_at) AS last_transaction
FROM credit_transactions ct
GROUP BY ct.user_id, ct.client_id;

-- =====================================================
-- 5. FINANCE ANALYTICS VIEWS
-- =====================================================

-- 5.1 Revenue per day
CREATE OR REPLACE VIEW public.analytics_revenue_daily AS
SELECT
  ct.user_id,
  DATE(ct.created_at) AS day,
  SUM(CASE WHEN ct.type = 'credit' THEN ct.amount ELSE 0 END) AS credits,
  SUM(CASE WHEN ct.type = 'debit' THEN ABS(ct.amount) ELSE 0 END) AS debits,
  SUM(ct.amount) AS net_revenue
FROM credit_transactions ct
GROUP BY ct.user_id, DATE(ct.created_at);

-- 5.2 Revenue by source
CREATE OR REPLACE VIEW public.analytics_revenue_by_source AS
SELECT
  ct.user_id,
  COALESCE(ct.description, 'Jiné') AS source,
  SUM(ct.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM credit_transactions ct
WHERE ct.type = 'credit'
GROUP BY ct.user_id, ct.description;