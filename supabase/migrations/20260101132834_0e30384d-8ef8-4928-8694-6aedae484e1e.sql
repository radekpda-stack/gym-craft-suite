-- Create table for client self-logged workouts (training diary)
CREATE TABLE public.client_workout_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for exercises within a workout log
CREATE TABLE public.client_workout_exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workout_log_id UUID NOT NULL REFERENCES public.client_workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_kg NUMERIC(6,2),
    duration_seconds INTEGER,
    distance_meters INTEGER,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_workout_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_workout_logs
-- Trainers can view all logs for their clients
CREATE POLICY "Trainers can view their client workout logs"
ON public.client_workout_logs
FOR SELECT
USING (trainer_id = auth.uid());

-- Trainers can insert logs for their clients
CREATE POLICY "Trainers can insert client workout logs"
ON public.client_workout_logs
FOR INSERT
WITH CHECK (trainer_id = auth.uid());

-- Trainers can update their client logs
CREATE POLICY "Trainers can update their client workout logs"
ON public.client_workout_logs
FOR UPDATE
USING (trainer_id = auth.uid());

-- Trainers can delete their client logs
CREATE POLICY "Trainers can delete their client workout logs"
ON public.client_workout_logs
FOR DELETE
USING (trainer_id = auth.uid());

-- RLS policies for client_workout_exercises
CREATE POLICY "Trainers can view workout exercises"
ON public.client_workout_exercises
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id AND wl.trainer_id = auth.uid()
));

CREATE POLICY "Trainers can insert workout exercises"
ON public.client_workout_exercises
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id AND wl.trainer_id = auth.uid()
));

CREATE POLICY "Trainers can update workout exercises"
ON public.client_workout_exercises
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id AND wl.trainer_id = auth.uid()
));

CREATE POLICY "Trainers can delete workout exercises"
ON public.client_workout_exercises
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.client_workout_logs wl
    WHERE wl.id = workout_log_id AND wl.trainer_id = auth.uid()
));

-- Trigger for updating updated_at
CREATE TRIGGER update_client_workout_logs_updated_at
BEFORE UPDATE ON public.client_workout_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_workout_exercises;

-- Create indexes for better performance
CREATE INDEX idx_client_workout_logs_client_id ON public.client_workout_logs(client_id);
CREATE INDEX idx_client_workout_logs_trainer_id ON public.client_workout_logs(trainer_id);
CREATE INDEX idx_client_workout_logs_date ON public.client_workout_logs(date DESC);
CREATE INDEX idx_client_workout_exercises_workout_log_id ON public.client_workout_exercises(workout_log_id);