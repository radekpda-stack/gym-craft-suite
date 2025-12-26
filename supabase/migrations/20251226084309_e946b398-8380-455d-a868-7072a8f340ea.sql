-- Create client_preferences table for storing units, notifications, and onboarding state
CREATE TABLE IF NOT EXISTS public.client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Units preferences
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
  distance_unit TEXT DEFAULT 'km' CHECK (distance_unit IN ('km', 'mi')),
  time_format TEXT DEFAULT 'mm:ss' CHECK (time_format IN ('mm:ss', 'hh:mm:ss')),
  
  -- Notification preferences (future-ready)
  notify_water_reminder BOOLEAN DEFAULT false,
  notify_campaign_reminder BOOLEAN DEFAULT false,
  notify_new_challenge BOOLEAN DEFAULT false,
  notify_low_credit BOOLEAN DEFAULT false,
  
  -- Onboarding state
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_steps_done JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT client_preferences_client_id_unique UNIQUE(client_id)
);

-- Create client_achievements table for tracking achievements and badges
CREATE TABLE IF NOT EXISTS public.client_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'challenge_completed', 
    'pr_set', 
    'streak_7', 
    'streak_30',
    'first_measurement', 
    'first_workout',
    'nutrition_week_complete'
  )),
  achievement_data JSONB DEFAULT '{}'::jsonb,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON public.client_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_client_achievements_client_id ON public.client_achievements(client_id);
CREATE INDEX IF NOT EXISTS idx_client_achievements_type ON public.client_achievements(achievement_type);

-- Enable RLS on both tables
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_preferences

-- Clients can read their own preferences
CREATE POLICY "Clients can view own preferences" 
ON public.client_preferences 
FOR SELECT 
USING (
  client_id = public.get_client_id_for_user(auth.uid())
);

-- Clients can insert their own preferences
CREATE POLICY "Clients can create own preferences" 
ON public.client_preferences 
FOR INSERT 
WITH CHECK (
  client_id = public.get_client_id_for_user(auth.uid())
);

-- Clients can update their own preferences
CREATE POLICY "Clients can update own preferences" 
ON public.client_preferences 
FOR UPDATE 
USING (
  client_id = public.get_client_id_for_user(auth.uid())
);

-- Trainers can view preferences of their clients
CREATE POLICY "Trainers can view client preferences" 
ON public.client_preferences 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- RLS policies for client_achievements

-- Clients can view their own achievements
CREATE POLICY "Clients can view own achievements" 
ON public.client_achievements 
FOR SELECT 
USING (
  client_id = public.get_client_id_for_user(auth.uid())
);

-- Trainers can view achievements of their clients
CREATE POLICY "Trainers can view client achievements" 
ON public.client_achievements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- Trainers can insert achievements for their clients
CREATE POLICY "Trainers can create client achievements" 
ON public.client_achievements 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- System can also create achievements (for auto-generated badges)
CREATE POLICY "System can create achievements" 
ON public.client_achievements 
FOR INSERT 
WITH CHECK (
  client_id = public.get_client_id_for_user(auth.uid())
);

-- Create trigger for updated_at on client_preferences
CREATE TRIGGER update_client_preferences_updated_at
  BEFORE UPDATE ON public.client_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();