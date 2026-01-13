-- First drop the existing function
DROP FUNCTION IF EXISTS public.settle_peer_challenge_xp_bets(uuid);

-- Recreate with proper implementation that updates client_xp.total_xp
CREATE OR REPLACE FUNCTION public.settle_peer_challenge_xp_bets(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_participant RECORD;
  v_total_participants INTEGER;
  v_rank INTEGER;
  v_percentile NUMERIC;
  v_xp_result INTEGER;
  v_is_duel BOOLEAN;
BEGIN
  -- Get challenge info
  SELECT * INTO v_challenge FROM peer_challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL OR v_challenge.status != 'completed' THEN
    RETURN;
  END IF;
  
  IF NOT v_challenge.xp_betting_enabled THEN
    RETURN;
  END IF;
  
  -- Count participants with submissions
  SELECT COUNT(*) INTO v_total_participants
  FROM peer_challenge_participants pcp
  WHERE pcp.challenge_id = p_challenge_id
    AND pcp.xp_bet > 0
    AND EXISTS (
      SELECT 1 FROM peer_challenge_submissions pcs 
      WHERE pcs.challenge_id = p_challenge_id 
        AND pcs.client_id = pcp.client_id
    );
  
  IF v_total_participants < 2 THEN
    -- Refund all bets if less than 2 participants with submissions
    UPDATE peer_challenge_participants
    SET xp_result = 0, settled_at = now()
    WHERE challenge_id = p_challenge_id AND xp_bet > 0 AND settled_at IS NULL;
    RETURN;
  END IF;
  
  -- Check if it's a duel (exactly 2 participants)
  v_is_duel := v_total_participants = 2;
  
  -- Calculate results for each participant
  FOR v_participant IN
    SELECT 
      pcp.client_id,
      pcp.xp_bet,
      COALESCE(
        (SELECT MAX(pcs.score_primary) FROM peer_challenge_submissions pcs 
         WHERE pcs.challenge_id = p_challenge_id AND pcs.client_id = pcp.client_id),
        0
      ) as best_score,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN v_challenge.scoring_type IN ('value_higher_better', 'higher_better') 
            THEN (SELECT MAX(pcs.score_primary) FROM peer_challenge_submissions pcs 
                  WHERE pcs.challenge_id = p_challenge_id AND pcs.client_id = pcp.client_id)
            ELSE -(SELECT MIN(pcs.score_primary) FROM peer_challenge_submissions pcs 
                   WHERE pcs.challenge_id = p_challenge_id AND pcs.client_id = pcp.client_id)
          END DESC NULLS LAST
      ) as rank
    FROM peer_challenge_participants pcp
    WHERE pcp.challenge_id = p_challenge_id
      AND pcp.xp_bet > 0
      AND EXISTS (
        SELECT 1 FROM peer_challenge_submissions pcs 
        WHERE pcs.challenge_id = p_challenge_id 
          AND pcs.client_id = pcp.client_id
      )
  LOOP
    v_rank := v_participant.rank;
    v_percentile := (v_rank::NUMERIC / v_total_participants) * 100;
    
    IF v_is_duel THEN
      -- Duel rules: winner gets 2x, loser gets -1x
      IF v_rank = 1 THEN
        v_xp_result := v_participant.xp_bet * 2;
      ELSE
        v_xp_result := -v_participant.xp_bet;
      END IF;
    ELSE
      -- Group challenge rules based on percentile
      IF v_percentile <= 25 THEN
        -- Top 25%: +2x
        v_xp_result := v_participant.xp_bet * 2;
      ELSIF v_percentile <= 50 THEN
        -- 25-50%: +0.5x
        v_xp_result := (v_participant.xp_bet * 0.5)::INTEGER;
      ELSIF v_percentile <= 75 THEN
        -- 50-75%: -0.5x
        v_xp_result := -(v_participant.xp_bet * 0.5)::INTEGER;
      ELSE
        -- Bottom 25%: -1x
        v_xp_result := -v_participant.xp_bet;
      END IF;
    END IF;
    
    -- Update participant record
    UPDATE peer_challenge_participants
    SET xp_result = v_xp_result, 
        final_rank = v_rank,
        settled_at = now()
    WHERE challenge_id = p_challenge_id AND client_id = v_participant.client_id;
    
    -- Update client_xp total
    UPDATE client_xp
    SET total_xp = GREATEST(0, total_xp + v_xp_result),
        updated_at = now()
    WHERE client_id = v_participant.client_id;
    
    -- If no client_xp record exists, create one
    IF NOT FOUND THEN
      INSERT INTO client_xp (client_id, total_xp, level, created_at, updated_at)
      VALUES (v_participant.client_id, GREATEST(0, v_xp_result), 1, now(), now())
      ON CONFLICT (client_id) DO UPDATE SET
        total_xp = GREATEST(0, client_xp.total_xp + v_xp_result),
        updated_at = now();
    END IF;
  END LOOP;
  
  -- Handle participants who bet but didn't submit (lose their bet)
  FOR v_participant IN
    SELECT pcp.client_id, pcp.xp_bet
    FROM peer_challenge_participants pcp
    WHERE pcp.challenge_id = p_challenge_id
      AND pcp.xp_bet > 0
      AND pcp.settled_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM peer_challenge_submissions pcs 
        WHERE pcs.challenge_id = p_challenge_id 
          AND pcs.client_id = pcp.client_id
      )
  LOOP
    v_xp_result := -v_participant.xp_bet;
    
    UPDATE peer_challenge_participants
    SET xp_result = v_xp_result, settled_at = now()
    WHERE challenge_id = p_challenge_id AND client_id = v_participant.client_id;
    
    UPDATE client_xp
    SET total_xp = GREATEST(0, total_xp + v_xp_result),
        updated_at = now()
    WHERE client_id = v_participant.client_id;
  END LOOP;
END;
$$;

-- Add invite_code generation trigger
CREATE OR REPLACE FUNCTION public.generate_peer_challenge_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_invite_code ON peer_challenges;
CREATE TRIGGER trigger_generate_invite_code
  BEFORE INSERT ON peer_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_peer_challenge_invite_code();

-- Update existing challenges without invite codes
UPDATE peer_challenges 
SET invite_code = upper(substr(md5(random()::text), 1, 8))
WHERE invite_code IS NULL OR invite_code = '';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_peer_challenges_end_at_status ON peer_challenges(end_at, status);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'peer_challenge_participants' AND column_name = 'final_rank') THEN
    ALTER TABLE peer_challenge_participants ADD COLUMN final_rank INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'peer_challenge_participants' AND column_name = 'settled_at') THEN
    ALTER TABLE peer_challenge_participants ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
END $$;