-- Drop the old constraint and create a new one with all training types
ALTER TABLE public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_training_type_check;

ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_training_type_check 
CHECK (training_type = ANY (ARRAY[
  'strength'::text, 
  'conditioning'::text, 
  'hiit'::text,
  'cardio'::text,
  'running'::text, 
  'mobility'::text,
  'flexibility'::text,
  'regeneration'::text,
  'functional'::text,
  'diagnostic'::text,
  'other'::text
]));