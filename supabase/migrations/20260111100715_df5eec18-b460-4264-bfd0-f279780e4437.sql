-- Create table for daily check-ins and login streaks
CREATE TABLE public.client_daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_awarded INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, checkin_date)
);

-- Create table for tracking login streaks
CREATE TABLE public.client_login_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_login_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_daily_checkins
CREATE POLICY "Clients can view their own checkins"
  ON public.client_daily_checkins FOR SELECT
  USING (
    client_id IN (
      SELECT ca.client_id FROM public.client_accounts ca
      WHERE ca.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert their own checkins"
  ON public.client_daily_checkins FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id FROM public.client_accounts ca
      WHERE ca.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view checkins of their clients"
  ON public.client_daily_checkins FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  );

-- RLS policies for client_login_streaks
CREATE POLICY "Clients can view their own streak"
  ON public.client_login_streaks FOR SELECT
  USING (
    client_id IN (
      SELECT ca.client_id FROM public.client_accounts ca
      WHERE ca.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can upsert their own streak"
  ON public.client_login_streaks FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT ca.client_id FROM public.client_accounts ca
      WHERE ca.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own streak"
  ON public.client_login_streaks FOR UPDATE
  USING (
    client_id IN (
      SELECT ca.client_id FROM public.client_accounts ca
      WHERE ca.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view streaks of their clients"
  ON public.client_login_streaks FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  );

-- Create function to handle daily checkin and update streak
CREATE OR REPLACE FUNCTION public.handle_daily_checkin(p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_existing_checkin UUID;
  v_streak_record RECORD;
  v_new_streak INTEGER;
  v_xp_awarded INTEGER := 2;
  v_bonus_xp INTEGER := 0;
  v_result JSON;
BEGIN
  -- Check if already checked in today
  SELECT id INTO v_existing_checkin
  FROM client_daily_checkins
  WHERE client_id = p_client_id AND checkin_date = v_today;
  
  IF v_existing_checkin IS NOT NULL THEN
    -- Already checked in today
    SELECT json_build_object(
      'success', false,
      'message', 'Již jsi dnes přihlášen',
      'already_checked_in', true
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Get current streak record
  SELECT * INTO v_streak_record
  FROM client_login_streaks
  WHERE client_id = p_client_id;
  
  -- Calculate new streak
  IF v_streak_record IS NULL THEN
    -- First ever checkin
    v_new_streak := 1;
  ELSIF v_streak_record.last_checkin_date = v_yesterday THEN
    -- Consecutive day - increment streak
    v_new_streak := v_streak_record.current_streak + 1;
  ELSIF v_streak_record.last_checkin_date = v_today THEN
    -- Already checked in (shouldn't happen due to earlier check)
    v_new_streak := v_streak_record.current_streak;
  ELSE
    -- Streak broken - reset to 1
    v_new_streak := 1;
  END IF;
  
  -- Calculate bonus XP for milestone streaks
  IF v_new_streak = 7 THEN
    v_bonus_xp := 10; -- 7 day bonus
  ELSIF v_new_streak = 30 THEN
    v_bonus_xp := 25; -- 30 day bonus
  ELSIF v_new_streak = 100 THEN
    v_bonus_xp := 50; -- 100 day bonus
  ELSIF v_new_streak % 7 = 0 AND v_new_streak > 7 THEN
    v_bonus_xp := 5; -- Weekly milestone bonus
  END IF;
  
  -- Insert checkin
  INSERT INTO client_daily_checkins (client_id, checkin_date, xp_awarded)
  VALUES (p_client_id, v_today, v_xp_awarded + v_bonus_xp);
  
  -- Upsert streak record
  INSERT INTO client_login_streaks (
    client_id, current_streak, longest_streak, last_checkin_date, total_checkins
  )
  VALUES (
    p_client_id, 
    v_new_streak, 
    v_new_streak, 
    v_today, 
    1
  )
  ON CONFLICT (client_id) DO UPDATE SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(client_login_streaks.longest_streak, v_new_streak),
    last_checkin_date = v_today,
    total_checkins = client_login_streaks.total_checkins + 1,
    updated_at = now();
  
  -- Award XP (insert into xp_events)
  INSERT INTO xp_events (client_id, xp_amount, event_type, description)
  VALUES (
    p_client_id, 
    v_xp_awarded + v_bonus_xp, 
    'daily_checkin',
    CASE 
      WHEN v_bonus_xp > 0 THEN 'Denní přihlášení + ' || v_new_streak || ' denní streak bonus!'
      ELSE 'Denní přihlášení'
    END
  );
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'current_streak', v_new_streak,
    'xp_awarded', v_xp_awarded + v_bonus_xp,
    'bonus_xp', v_bonus_xp,
    'is_milestone', v_bonus_xp > 0
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_client_daily_checkins_client_date ON public.client_daily_checkins(client_id, checkin_date);
CREATE INDEX idx_client_login_streaks_client ON public.client_login_streaks(client_id);