-- Create training_feedback table for post-training feedback
CREATE TABLE public.training_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Automatic fields
  training_date TIMESTAMP WITH TIME ZONE NOT NULL,
  training_type TEXT,
  
  -- RPE and fatigue
  rpe_rating INTEGER NOT NULL CHECK (rpe_rating >= 1 AND rpe_rating <= 10),
  fatigue_level INTEGER NOT NULL CHECK (fatigue_level >= 1 AND fatigue_level <= 5),
  
  -- Muscle soreness - stored as array of body parts
  muscle_soreness TEXT[] DEFAULT '{}',
  muscle_soreness_comment TEXT,
  
  -- Energy during training
  energy_level TEXT NOT NULL CHECK (energy_level IN ('stable', 'better_end', 'low_entire', 'good_start_only')),
  
  -- Sleep before training
  sleep_hours NUMERIC(3,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  
  -- Mood and motivation
  mood_rating INTEGER NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 5),
  
  -- Technique self-assessment
  technique_rating INTEGER NOT NULL CHECK (technique_rating >= 1 AND technique_rating <= 5),
  
  -- Training relevance to goal
  goal_relevance TEXT NOT NULL CHECK (goal_relevance IN ('yes', 'partially', 'no')),
  
  -- Optional comment
  comment TEXT CHECK (char_length(comment) <= 200),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate feedback for same training/client
CREATE UNIQUE INDEX training_feedback_unique_idx ON public.training_feedback(training_session_id, client_id);

-- Enable Row Level Security
ALTER TABLE public.training_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own training_feedback"
  ON public.training_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training_feedback"
  ON public.training_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training_feedback"
  ON public.training_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training_feedback"
  ON public.training_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_training_feedback_updated_at
  BEFORE UPDATE ON public.training_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for efficient querying
CREATE INDEX training_feedback_client_id_idx ON public.training_feedback(client_id);
CREATE INDEX training_feedback_training_date_idx ON public.training_feedback(training_date);
CREATE INDEX training_feedback_user_id_idx ON public.training_feedback(user_id);