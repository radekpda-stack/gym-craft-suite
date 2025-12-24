-- Training Templates - šablony tréninků
CREATE TABLE public.training_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'strength', 'hypertrophy', 'conditioning', 'rehab', etc.
  estimated_duration INTEGER, -- in minutes
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Exercises - cviky v šabloně
CREATE TABLE public.training_template_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.training_templates(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  block_type TEXT DEFAULT 'primary', -- 'prep', 'primary', 'secondary', 'accessory', 'core', 'conditioning', 'cooldown'
  sets INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  time_seconds INTEGER,
  rest_seconds INTEGER,
  tempo TEXT,
  rpe INTEGER,
  rir INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_template_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_templates
CREATE POLICY "Users can view own templates" ON public.training_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON public.training_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create own templates" ON public.training_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.training_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.training_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for training_template_exercises
CREATE POLICY "Users can view template exercises for owned templates" ON public.training_template_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_templates t 
      WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.is_public = true)
    )
  );

CREATE POLICY "Users can manage template exercises for owned templates" ON public.training_template_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.training_templates t 
      WHERE t.id = template_id AND t.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_training_templates_user_id ON public.training_templates(user_id);
CREATE INDEX idx_training_templates_category ON public.training_templates(category);
CREATE INDEX idx_training_template_exercises_template_id ON public.training_template_exercises(template_id);
CREATE INDEX idx_training_template_exercises_sort_order ON public.training_template_exercises(template_id, sort_order);

-- Trigger for updated_at
CREATE TRIGGER update_training_templates_updated_at
  BEFORE UPDATE ON public.training_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();