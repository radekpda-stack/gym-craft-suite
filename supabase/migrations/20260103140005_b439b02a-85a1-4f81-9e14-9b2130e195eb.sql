-- Create table for favorite exercises
CREATE TABLE public.favorite_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.favorite_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own favorites"
ON public.favorite_exercises
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
ON public.favorite_exercises
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
ON public.favorite_exercises
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorite_exercises_user ON public.favorite_exercises(user_id);
CREATE INDEX idx_favorite_exercises_exercise ON public.favorite_exercises(exercise_id);