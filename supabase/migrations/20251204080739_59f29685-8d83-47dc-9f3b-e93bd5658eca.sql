-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  notes TEXT DEFAULT '',
  subjective_rating INTEGER CHECK (subjective_rating >= 1 AND subjective_rating <= 10),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled')),
  canceled_at TIMESTAMP WITH TIME ZONE,
  is_late_cancellation BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single trainer app)
CREATE POLICY "Allow all operations on training_sessions" 
ON public.training_sessions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_training_sessions_client_id ON public.training_sessions(client_id);
CREATE INDEX idx_training_sessions_date ON public.training_sessions(date DESC);
CREATE INDEX idx_training_sessions_status ON public.training_sessions(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();