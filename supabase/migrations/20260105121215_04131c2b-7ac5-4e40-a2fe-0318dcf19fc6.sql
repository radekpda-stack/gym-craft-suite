-- Create trainer_workout_diary table for private trainer training records
CREATE TABLE public.trainer_workout_diary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL DEFAULT 'other',
  title TEXT,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  pace_per_km INTEGER,
  speed_kmh NUMERIC,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  calories INTEGER,
  cadence INTEGER,
  elevation_gain INTEGER,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  screenshot_url TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trainer_workout_diary ENABLE ROW LEVEL SECURITY;

-- Create policies for user access - only owner can see their records
CREATE POLICY "Users can view their own diary entries" 
ON public.trainer_workout_diary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diary entries" 
ON public.trainer_workout_diary 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries" 
ON public.trainer_workout_diary 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries" 
ON public.trainer_workout_diary 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trainer_workout_diary_updated_at
BEFORE UPDATE ON public.trainer_workout_diary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_trainer_workout_diary_user_date ON public.trainer_workout_diary(user_id, date DESC);

-- Create storage bucket for trainer diary screenshots (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('trainer-diary-screenshots', 'trainer-diary-screenshots', false);

-- Storage policies for trainer diary screenshots
CREATE POLICY "Users can upload their own diary screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'trainer-diary-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own diary screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'trainer-diary-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own diary screenshots" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'trainer-diary-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own diary screenshots" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'trainer-diary-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);