-- Create table for recurring training schedules
CREATE TABLE public.client_recurring_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  time time NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring schedules"
ON public.client_recurring_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring schedules"
ON public.client_recurring_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring schedules"
ON public.client_recurring_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring schedules"
ON public.client_recurring_schedules FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_client_recurring_schedules_updated_at
BEFORE UPDATE ON public.client_recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_client_recurring_schedules_client_id ON public.client_recurring_schedules(client_id);
CREATE INDEX idx_client_recurring_schedules_day_of_week ON public.client_recurring_schedules(day_of_week);