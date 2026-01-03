-- Table for assigning workout templates to clients as "homework"
CREATE TABLE public.client_assigned_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.training_templates(id) ON DELETE SET NULL,
  trainer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  scheduled_for DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  client_notes TEXT,
  trainer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_assigned_workouts ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own assigned workouts
CREATE POLICY "Trainers can manage their assigned workouts"
ON public.client_assigned_workouts
FOR ALL
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Clients can view and update their assigned workouts
CREATE POLICY "Clients can view their assigned workouts"
ON public.client_assigned_workouts
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can update their workout status"
ON public.client_assigned_workouts
FOR UPDATE
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_client_assigned_workouts_client ON public.client_assigned_workouts(client_id);
CREATE INDEX idx_client_assigned_workouts_trainer ON public.client_assigned_workouts(trainer_id);
CREATE INDEX idx_client_assigned_workouts_status ON public.client_assigned_workouts(status);
CREATE INDEX idx_client_assigned_workouts_scheduled ON public.client_assigned_workouts(scheduled_for);

-- Trigger for updated_at
CREATE TRIGGER update_client_assigned_workouts_updated_at
  BEFORE UPDATE ON public.client_assigned_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages table for trainer-client communication
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('trainer', 'client')),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Trainers can manage messages in their conversations
CREATE POLICY "Trainers can manage their chat messages"
ON public.chat_messages
FOR ALL
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Clients can view and send messages in their conversations
CREATE POLICY "Clients can view their chat messages"
ON public.chat_messages
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Clients can send chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
  AND sender_type = 'client'
);

CREATE POLICY "Clients can mark messages as read"
ON public.chat_messages
FOR UPDATE
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_client ON public.chat_messages(client_id);
CREATE INDEX idx_chat_messages_trainer ON public.chat_messages(trainer_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(client_id, is_read) WHERE is_read = false;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Training plans table
CREATE TABLE public.client_training_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  goals JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_training_plans ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their plans
CREATE POLICY "Trainers can manage their training plans"
ON public.client_training_plans
FOR ALL
USING (trainer_id = auth.uid())
WITH CHECK (trainer_id = auth.uid());

-- Clients can view their plans
CREATE POLICY "Clients can view their training plans"
ON public.client_training_plans
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_accounts WHERE auth_user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_client_training_plans_client ON public.client_training_plans(client_id);
CREATE INDEX idx_client_training_plans_trainer ON public.client_training_plans(trainer_id);
CREATE INDEX idx_client_training_plans_status ON public.client_training_plans(status);

-- Trigger for updated_at
CREATE TRIGGER update_client_training_plans_updated_at
  BEFORE UPDATE ON public.client_training_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();