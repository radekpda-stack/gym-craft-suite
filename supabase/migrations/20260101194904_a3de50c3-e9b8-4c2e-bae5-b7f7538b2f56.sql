-- Create table for custom training types
CREATE TABLE public.custom_training_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-gray-500',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_training_types ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own custom training types" 
ON public.custom_training_types 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom training types" 
ON public.custom_training_types 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom training types" 
ON public.custom_training_types 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique index for name per user
CREATE UNIQUE INDEX idx_custom_training_types_user_name ON public.custom_training_types (user_id, name);