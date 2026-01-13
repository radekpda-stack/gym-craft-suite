-- Add XP betting columns to peer_challenges
ALTER TABLE public.peer_challenges
ADD COLUMN xp_bet_enabled BOOLEAN DEFAULT false,
ADD COLUMN xp_bet_amount INTEGER DEFAULT 0,
ADD COLUMN xp_bet_min INTEGER DEFAULT 10,
ADD COLUMN xp_bet_max INTEGER DEFAULT 500;

-- Add XP bet to participants (each participant can choose their bet amount)
ALTER TABLE public.peer_challenge_participants
ADD COLUMN xp_bet INTEGER DEFAULT 0,
ADD COLUMN xp_result INTEGER DEFAULT 0,
ADD COLUMN final_rank INTEGER DEFAULT NULL,
ADD COLUMN xp_settled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create table for XP betting stats (wins/losses history)
CREATE TABLE public.peer_challenge_xp_stats (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  total_won INTEGER DEFAULT 0,
  total_lost INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  biggest_win INTEGER DEFAULT 0,
  biggest_loss INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.peer_challenge_xp_stats ENABLE ROW LEVEL SECURITY;

-- Policy: clients can see their own stats
CREATE POLICY "Clients can view own xp stats"
ON public.peer_challenge_xp_stats
FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
  )
);

-- Policy: trainers can see their clients' stats
CREATE POLICY "Trainers can view client xp stats"
ON public.peer_challenge_xp_stats
FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.user_id = auth.uid()
  )
);

-- Create function to settle XP bets when challenge ends
CREATE OR REPLACE FUNCTION public.settle_peer_challenge_xp_bets(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_participant RECORD;
  v_total_pool INTEGER := 0;
  v_participant_count INTEGER := 0;
  v_winner_count INTEGER := 0;
  v_rank INTEGER := 1;
  v_prev_score NUMERIC;
  v_result JSONB := '{"settled": [], "pool": 0}'::JSONB;
  v_xp_change INTEGER;
  v_rank_pct NUMERIC;
BEGIN
  -- Get challenge
  SELECT * INTO v_challenge FROM peer_challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL THEN
    RETURN '{"error": "Challenge not found"}'::JSONB;
  END IF;

  -- Calculate total pool and participant count
  SELECT COUNT(*), COALESCE(SUM(xp_bet), 0)
  INTO v_participant_count, v_total_pool
  FROM peer_challenge_participants
  WHERE challenge_id = p_challenge_id
    AND status = 'accepted'
    AND xp_bet > 0;

  IF v_participant_count < 2 OR v_total_pool = 0 THEN
    RETURN '{"error": "Not enough participants with bets"}'::JSONB;
  END IF;

  -- Get participants with their best scores, ordered by rank
  FOR v_participant IN (
    SELECT 
      p.client_id,
      p.xp_bet,
      COALESCE(
        (SELECT 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN MIN(s.score_primary)
               ELSE MAX(s.score_primary)
          END
         FROM peer_challenge_submissions s 
         WHERE s.challenge_id = p_challenge_id AND s.client_id = p.client_id
        ), 
        CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN 999999 ELSE 0 END
      ) as best_score
    FROM peer_challenge_participants p
    WHERE p.challenge_id = p_challenge_id
      AND p.status = 'accepted'
      AND p.xp_bet > 0
    ORDER BY 
      CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN best_score END ASC,
      CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN best_score END DESC
  ) LOOP
    -- Calculate rank (handle ties by giving same rank)
    IF v_prev_score IS NOT NULL AND v_participant.best_score = v_prev_score THEN
      -- Same rank as previous (tie)
      NULL;
    ELSE
      v_rank := v_rank + 1;
    END IF;
    v_prev_score := v_participant.best_score;
    
    -- Calculate rank percentage (0 = first, 1 = last)
    v_rank_pct := (v_rank - 1)::NUMERIC / (v_participant_count - 1)::NUMERIC;
    
    -- Calculate XP change based on position:
    -- Top 25%: win bet amount (scaled by position)
    -- 25-50%: win half of bet
    -- 50-75%: lose half of bet
    -- Bottom 25%: lose full bet
    IF v_rank_pct <= 0.25 THEN
      -- Winners: gain double their bet (from losers' pool)
      v_xp_change := v_participant.xp_bet * 2;
    ELSIF v_rank_pct <= 0.5 THEN
      -- Upper middle: gain half their bet
      v_xp_change := v_participant.xp_bet / 2;
    ELSIF v_rank_pct <= 0.75 THEN
      -- Lower middle: lose half their bet
      v_xp_change := -(v_participant.xp_bet / 2);
    ELSE
      -- Losers: lose their full bet
      v_xp_change := -v_participant.xp_bet;
    END IF;

    -- For 2-player duel: winner gets double, loser loses all
    IF v_participant_count = 2 THEN
      IF v_rank = 1 THEN
        v_xp_change := v_participant.xp_bet * 2;
      ELSE
        v_xp_change := -v_participant.xp_bet;
      END IF;
    END IF;

    -- Update participant
    UPDATE peer_challenge_participants
    SET xp_result = v_xp_change,
        final_rank = v_rank,
        xp_settled_at = now()
    WHERE challenge_id = p_challenge_id AND client_id = v_participant.client_id;

    -- Update client_xp
    UPDATE client_xp
    SET total_xp = GREATEST(0, total_xp + v_xp_change),
        level_xp = GREATEST(0, level_xp + v_xp_change),
        updated_at = now()
    WHERE client_id = v_participant.client_id;

    -- Update or insert stats
    INSERT INTO peer_challenge_xp_stats (
      client_id, 
      total_won, 
      total_lost, 
      total_bets, 
      wins, 
      losses, 
      draws,
      current_streak,
      best_streak,
      biggest_win,
      biggest_loss
    )
    VALUES (
      v_participant.client_id,
      CASE WHEN v_xp_change > 0 THEN v_xp_change ELSE 0 END,
      CASE WHEN v_xp_change < 0 THEN ABS(v_xp_change) ELSE 0 END,
      1,
      CASE WHEN v_xp_change > 0 THEN 1 ELSE 0 END,
      CASE WHEN v_xp_change < 0 THEN 1 ELSE 0 END,
      CASE WHEN v_xp_change = 0 THEN 1 ELSE 0 END,
      CASE WHEN v_xp_change > 0 THEN 1 ELSE 0 END,
      CASE WHEN v_xp_change > 0 THEN 1 ELSE 0 END,
      CASE WHEN v_xp_change > 0 THEN v_xp_change ELSE 0 END,
      CASE WHEN v_xp_change < 0 THEN ABS(v_xp_change) ELSE 0 END
    )
    ON CONFLICT (client_id) DO UPDATE SET
      total_won = peer_challenge_xp_stats.total_won + CASE WHEN v_xp_change > 0 THEN v_xp_change ELSE 0 END,
      total_lost = peer_challenge_xp_stats.total_lost + CASE WHEN v_xp_change < 0 THEN ABS(v_xp_change) ELSE 0 END,
      total_bets = peer_challenge_xp_stats.total_bets + 1,
      wins = peer_challenge_xp_stats.wins + CASE WHEN v_xp_change > 0 THEN 1 ELSE 0 END,
      losses = peer_challenge_xp_stats.losses + CASE WHEN v_xp_change < 0 THEN 1 ELSE 0 END,
      draws = peer_challenge_xp_stats.draws + CASE WHEN v_xp_change = 0 THEN 1 ELSE 0 END,
      current_streak = CASE 
        WHEN v_xp_change > 0 THEN peer_challenge_xp_stats.current_streak + 1 
        ELSE 0 
      END,
      best_streak = GREATEST(
        peer_challenge_xp_stats.best_streak, 
        CASE WHEN v_xp_change > 0 THEN peer_challenge_xp_stats.current_streak + 1 ELSE peer_challenge_xp_stats.current_streak END
      ),
      biggest_win = GREATEST(peer_challenge_xp_stats.biggest_win, CASE WHEN v_xp_change > 0 THEN v_xp_change ELSE 0 END),
      biggest_loss = GREATEST(peer_challenge_xp_stats.biggest_loss, CASE WHEN v_xp_change < 0 THEN ABS(v_xp_change) ELSE 0 END),
      updated_at = now();

    v_result := v_result || jsonb_build_object(
      'settled', v_result->'settled' || jsonb_build_array(jsonb_build_object(
        'client_id', v_participant.client_id,
        'bet', v_participant.xp_bet,
        'result', v_xp_change,
        'rank', v_rank
      ))
    );
  END LOOP;

  v_result := v_result || jsonb_build_object('pool', v_total_pool);
  
  RETURN v_result;
END;
$$;

-- Update RLS for participants to allow updating xp_bet
CREATE POLICY "Clients can update own bet"
ON public.peer_challenge_participants
FOR UPDATE
USING (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT ca.client_id FROM public.client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
  )
);