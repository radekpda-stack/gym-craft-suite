-- Add participant_client_id column to workout_entries for tracking exercises per participant
ALTER TABLE public.workout_entries 
ADD COLUMN participant_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add index for better query performance when filtering by participant
CREATE INDEX idx_workout_entries_participant ON public.workout_entries(participant_client_id);

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.workout_entries.participant_client_id IS 'Links exercise to specific participant in group training. NULL means primary client of the session.';