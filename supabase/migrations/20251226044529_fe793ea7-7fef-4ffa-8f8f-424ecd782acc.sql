-- ============================================
-- CREATE exercise_aliases TABLE (separate migration)
-- ============================================
CREATE TABLE public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  language VARCHAR(2) DEFAULT 'cs',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_aliases_unique_normalized UNIQUE(alias_normalized, language)
);

-- Index for fast alias lookup
CREATE INDEX idx_exercise_aliases_normalized ON public.exercise_aliases(alias_normalized);
CREATE INDEX idx_exercise_aliases_exercise_id ON public.exercise_aliases(exercise_id);

-- Enable RLS
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all exercise aliases"
  ON public.exercise_aliases
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert aliases for exercises they own"
  ON public.exercise_aliases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
      AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update aliases for exercises they own"
  ON public.exercise_aliases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
      AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete aliases for exercises they own"
  ON public.exercise_aliases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
      AND (e.user_id = auth.uid() OR e.user_id IS NULL)
    )
  );