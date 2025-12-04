-- Add credit_balance and birth_date to clients
ALTER TABLE public.clients 
ADD COLUMN credit_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN birth_date DATE;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('low_credit', 'negative_credit', 'birthday', 'milestone_100', 'milestone_500', 'milestone_1000')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single trainer app)
CREATE POLICY "Allow all operations on notifications" 
ON public.notifications 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);