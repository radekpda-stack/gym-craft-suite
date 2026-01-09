-- Tabulka pro uložení naučených baseline parametrů
CREATE TABLE public.business_health_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- 'revenue', 'retention', 'credits', 'payments'
  baseline_value NUMERIC,
  standard_deviation NUMERIC,
  window_weeks INTEGER DEFAULT 8,
  weight NUMERIC DEFAULT 0.25,
  seasonality_factor JSONB DEFAULT '{}',
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  data_points_count INTEGER DEFAULT 0,
  confidence NUMERIC DEFAULT 0, -- 0-100
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric_type)
);

-- Enable RLS
ALTER TABLE public.business_health_baselines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own baselines"
  ON public.business_health_baselines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own baselines"
  ON public.business_health_baselines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own baselines"
  ON public.business_health_baselines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own baselines"
  ON public.business_health_baselines FOR DELETE
  USING (auth.uid() = user_id);