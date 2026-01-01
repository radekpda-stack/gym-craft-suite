-- Create client portal notifications table
CREATE TABLE public.client_portal_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'feedback_reminder', 'training_completed', 'message', etc.
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_completed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.client_portal_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can view their own notifications via client_accounts
CREATE POLICY "Clients can view own notifications" 
ON public.client_portal_notifications 
FOR SELECT 
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts 
    WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Clients can update (mark as read) their own notifications
CREATE POLICY "Clients can update own notifications" 
ON public.client_portal_notifications 
FOR UPDATE 
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts 
    WHERE auth_user_id = auth.uid()
  )
);

-- Policy: Trainers can insert notifications for their clients
CREATE POLICY "Trainers can insert notifications" 
ON public.client_portal_notifications 
FOR INSERT 
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Policy: System/edge functions can manage notifications (using service role)
CREATE POLICY "Service role full access"
ON public.client_portal_notifications
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for efficient queries
CREATE INDEX idx_client_notifications_client_id ON public.client_portal_notifications(client_id);
CREATE INDEX idx_client_notifications_unread ON public.client_portal_notifications(client_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_portal_notifications;