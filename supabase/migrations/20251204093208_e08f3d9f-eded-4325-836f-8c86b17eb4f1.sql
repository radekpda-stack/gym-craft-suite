-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises
CREATE POLICY "Exercises are viewable by everyone" 
ON public.exercises 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create exercises" 
ON public.exercises 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercises" 
ON public.exercises 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete exercises" 
ON public.exercises 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();