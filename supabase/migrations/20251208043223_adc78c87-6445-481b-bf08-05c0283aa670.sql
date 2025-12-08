
-- Create exercise_entries table for tracking training progress
CREATE TABLE public.exercise_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight_kg NUMERIC,
  is_bodyweight BOOLEAN DEFAULT false,
  time_seconds INTEGER,
  tempo TEXT,
  notes TEXT DEFAULT '',
  is_pr BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own exercise_entries"
ON public.exercise_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise_entries"
ON public.exercise_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise_entries"
ON public.exercise_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise_entries"
ON public.exercise_entries FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_exercise_entries_updated_at
BEFORE UPDATE ON public.exercise_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for efficient querying
CREATE INDEX idx_exercise_entries_client_id ON public.exercise_entries(client_id);
CREATE INDEX idx_exercise_entries_exercise_id ON public.exercise_entries(exercise_id);
CREATE INDEX idx_exercise_entries_date ON public.exercise_entries(date);
CREATE INDEX idx_exercise_entries_user_client_date ON public.exercise_entries(user_id, client_id, date);

-- Insert default exercises (global, user_id = NULL)
INSERT INTO public.exercises (name, category, subcategory, muscle_groups, equipment, user_id) VALUES
  ('Dřep (Back Squat)', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['barbell', 'rack'], NULL),
  ('Přední dřep (Front Squat)', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'core', 'glutes'], ARRAY['barbell', 'rack'], NULL),
  ('Goblet dřep', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['kettlebell', 'dumbbell'], NULL),
  ('Bench Press', 'Horní tělo', 'Prsa', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], NULL),
  ('Bench Press s jednoručkami', 'Horní tělo', 'Prsa', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['dumbbells', 'bench'], NULL),
  ('Mrtvý tah (Deadlift)', 'Dolní tělo', 'Hamstringy', ARRAY['hamstrings', 'glutes', 'back', 'core'], ARRAY['barbell'], NULL),
  ('Rumunský mrtvý tah', 'Dolní tělo', 'Hamstringy', ARRAY['hamstrings', 'glutes', 'back'], ARRAY['barbell', 'dumbbells'], NULL),
  ('Sumo mrtvý tah', 'Dolní tělo', 'Hamstringy', ARRAY['hamstrings', 'glutes', 'adductors'], ARRAY['barbell'], NULL),
  ('Výpad', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['bodyweight', 'dumbbells'], NULL),
  ('Bulharský dřep', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'glutes', 'balance'], ARRAY['dumbbells', 'bench'], NULL),
  ('Tlak nad hlavu (Shoulder Press)', 'Horní tělo', 'Ramena', ARRAY['shoulders', 'triceps', 'core'], ARRAY['barbell', 'dumbbells'], NULL),
  ('Push Press', 'Horní tělo', 'Ramena', ARRAY['shoulders', 'triceps', 'legs'], ARRAY['barbell', 'dumbbells'], NULL),
  ('Plank', 'Core', 'Stabilizace', ARRAY['core', 'shoulders'], ARRAY['bodyweight'], NULL),
  ('Side Plank', 'Core', 'Stabilizace', ARRAY['obliques', 'core'], ARRAY['bodyweight'], NULL),
  ('Přítahy v předklonu (Bent Over Row)', 'Horní tělo', 'Záda', ARRAY['lats', 'rhomboids', 'biceps'], ARRAY['barbell', 'dumbbells'], NULL),
  ('Jednoramenný přítah', 'Horní tělo', 'Záda', ARRAY['lats', 'rhomboids', 'biceps'], ARRAY['dumbbell', 'bench'], NULL),
  ('Shyby (Pull-up)', 'Horní tělo', 'Záda', ARRAY['lats', 'biceps', 'core'], ARRAY['pull-up bar'], NULL),
  ('Klik na bradlech (Dips)', 'Horní tělo', 'Prsa', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['dip bars'], NULL),
  ('Kliky', 'Horní tělo', 'Prsa', ARRAY['chest', 'triceps', 'core'], ARRAY['bodyweight'], NULL),
  ('Overhead Carry', 'Core', 'Stabilizace', ARRAY['shoulders', 'core', 'grip'], ARRAY['kettlebell', 'dumbbell'], NULL),
  ('Farmer Walk', 'Core', 'Grip', ARRAY['grip', 'core', 'traps'], ARRAY['kettlebells', 'dumbbells'], NULL),
  ('Hip Thrust', 'Dolní tělo', 'Glutes', ARRAY['glutes', 'hamstrings'], ARRAY['barbell', 'bench'], NULL),
  ('Leg Press', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps', 'glutes'], ARRAY['leg press machine'], NULL),
  ('Leg Curl', 'Dolní tělo', 'Hamstringy', ARRAY['hamstrings'], ARRAY['leg curl machine'], NULL),
  ('Leg Extension', 'Dolní tělo', 'Quadriceps', ARRAY['quadriceps'], ARRAY['leg extension machine'], NULL),
  ('Lat Pulldown', 'Horní tělo', 'Záda', ARRAY['lats', 'biceps'], ARRAY['cable machine'], NULL),
  ('Cable Row', 'Horní tělo', 'Záda', ARRAY['lats', 'rhomboids', 'biceps'], ARRAY['cable machine'], NULL),
  ('Bicep Curl', 'Horní tělo', 'Paže', ARRAY['biceps'], ARRAY['dumbbells', 'barbell', 'cables'], NULL),
  ('Tricep Extension', 'Horní tělo', 'Paže', ARRAY['triceps'], ARRAY['dumbbells', 'cables'], NULL),
  ('Face Pull', 'Horní tělo', 'Ramena', ARRAY['rear delts', 'rhomboids'], ARRAY['cable machine', 'bands'], NULL)
ON CONFLICT DO NOTHING;
