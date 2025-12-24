-- Create analytics saved views table for storing trainer's custom filter configurations
CREATE TABLE public.analytics_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  view_type TEXT NOT NULL DEFAULT 'exercises', -- exercises, clients, training, etc.
  filters JSONB NOT NULL DEFAULT '{}',
  -- Filters can include: client_ids, period_type, period_value, training_type, muscle_groups, comparison_mode
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved views"
ON public.analytics_saved_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved views"
ON public.analytics_saved_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved views"
ON public.analytics_saved_views
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved views"
ON public.analytics_saved_views
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_analytics_saved_views_user_id ON public.analytics_saved_views(user_id);
CREATE INDEX idx_analytics_saved_views_type ON public.analytics_saved_views(view_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_analytics_saved_views_updated_at
BEFORE UPDATE ON public.analytics_saved_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();