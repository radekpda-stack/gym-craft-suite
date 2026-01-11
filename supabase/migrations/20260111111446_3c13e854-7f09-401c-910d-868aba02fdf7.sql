-- Create trainer_rewards table for trainers to define rewards
CREATE TABLE public.trainer_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lp_cost INTEGER NOT NULL CHECK (lp_cost > 0),
  icon_key TEXT NOT NULL DEFAULT 'gift',
  is_active BOOLEAN NOT NULL DEFAULT true,
  quantity_available INTEGER, -- NULL = unlimited
  quantity_redeemed INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reward_redemptions table for tracking client redemptions
CREATE TABLE public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.trainer_rewards(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  lp_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trainer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainer_rewards
-- Trainers can manage their own rewards
CREATE POLICY "Trainers can view their own rewards"
  ON public.trainer_rewards FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can create rewards"
  ON public.trainer_rewards FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own rewards"
  ON public.trainer_rewards FOR UPDATE
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own rewards"
  ON public.trainer_rewards FOR DELETE
  USING (trainer_id = auth.uid());

-- Clients can view active rewards from their trainer
CREATE POLICY "Clients can view trainer rewards"
  ON public.trainer_rewards FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM client_accounts ca 
      WHERE ca.trainer_id = trainer_rewards.trainer_id 
      AND (ca.user_id = auth.uid() OR ca.auth_user_id = auth.uid())
      AND ca.is_active = true
    )
  );

-- RLS Policies for reward_redemptions
-- Trainers can view redemptions for their rewards
CREATE POLICY "Trainers can view their reward redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (trainer_id = auth.uid());

-- Trainers can update redemption status
CREATE POLICY "Trainers can update their reward redemptions"
  ON public.reward_redemptions FOR UPDATE
  USING (trainer_id = auth.uid());

-- Clients can view their own redemptions
CREATE POLICY "Clients can view their own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts ca 
      WHERE ca.client_id = reward_redemptions.client_id 
      AND (ca.user_id = auth.uid() OR ca.auth_user_id = auth.uid())
      AND ca.is_active = true
    )
  );

-- Clients can create redemptions for themselves
CREATE POLICY "Clients can create their own redemptions"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_accounts ca 
      WHERE ca.client_id = reward_redemptions.client_id 
      AND (ca.user_id = auth.uid() OR ca.auth_user_id = auth.uid())
      AND ca.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_trainer_rewards_trainer_id ON public.trainer_rewards(trainer_id);
CREATE INDEX idx_trainer_rewards_is_active ON public.trainer_rewards(is_active) WHERE is_active = true;
CREATE INDEX idx_reward_redemptions_client_id ON public.reward_redemptions(client_id);
CREATE INDEX idx_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_trainer_id ON public.reward_redemptions(trainer_id);
CREATE INDEX idx_reward_redemptions_status ON public.reward_redemptions(status);

-- Trigger for updated_at on trainer_rewards
CREATE TRIGGER update_trainer_rewards_updated_at
  BEFORE UPDATE ON public.trainer_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();