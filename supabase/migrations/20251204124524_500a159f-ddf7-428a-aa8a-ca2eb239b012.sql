-- Add user_id column to exercises table for ownership tracking
ALTER TABLE public.exercises ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON public.exercises;

-- Create owner-scoped RLS policies
-- All authenticated users can view all exercises (shared library)
CREATE POLICY "Authenticated users can view all exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (true);

-- Users can only create their own exercises
CREATE POLICY "Users can create their own exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own exercises
CREATE POLICY "Users can update their own exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can only delete their own exercises
CREATE POLICY "Users can delete their own exercises"
ON public.exercises
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);