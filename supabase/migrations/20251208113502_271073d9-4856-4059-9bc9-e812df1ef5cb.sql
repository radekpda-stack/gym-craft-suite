-- Create feature_usage table for tracking feature usage
CREATE TABLE public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_feature_usage_user_id ON public.feature_usage(user_id);
CREATE INDEX idx_feature_usage_feature_name ON public.feature_usage(feature_name);
CREATE INDEX idx_feature_usage_created_at ON public.feature_usage(created_at DESC);
CREATE INDEX idx_feature_usage_category ON public.feature_usage(feature_category);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own feature_usage"
ON public.feature_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature_usage"
ON public.feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feature_usage"
ON public.feature_usage
FOR DELETE
USING (auth.uid() = user_id);