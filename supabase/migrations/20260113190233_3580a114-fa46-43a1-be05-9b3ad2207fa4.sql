-- Create a function that completes expired peer challenges directly in the database
CREATE OR REPLACE FUNCTION public.auto_complete_expired_peer_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_participant RECORD;
BEGIN
  -- Find all expired active challenges
  FOR v_challenge IN 
    SELECT id, title, xp_bet_enabled
    FROM peer_challenges
    WHERE status = 'active'
    AND end_at < now()
  LOOP
    -- Update status to completed
    UPDATE peer_challenges
    SET status = 'completed'
    WHERE id = v_challenge.id;
    
    -- If XP betting is enabled, settle the bets
    IF v_challenge.xp_bet_enabled THEN
      PERFORM settle_peer_challenge_xp_bets(v_challenge.id);
    END IF;
    
    -- Create notifications for participants
    FOR v_participant IN
      SELECT client_id, xp_result, final_rank
      FROM peer_challenge_participants
      WHERE challenge_id = v_challenge.id
    LOOP
      INSERT INTO client_portal_notifications (
        client_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_participant.client_id,
        'peer_challenge_ended',
        'Výzva ukončena',
        CASE 
          WHEN v_challenge.xp_bet_enabled AND v_participant.xp_result > 0 THEN
            'Výzva "' || v_challenge.title || '" skončila. Získal jsi +' || v_participant.xp_result || ' XP! 🎉'
          WHEN v_challenge.xp_bet_enabled AND v_participant.xp_result < 0 THEN
            'Výzva "' || v_challenge.title || '" skončila. Ztratil jsi ' || ABS(v_participant.xp_result) || ' XP.'
          ELSE
            'Výzva "' || v_challenge.title || '" skončila.' ||
            CASE WHEN v_participant.final_rank IS NOT NULL 
              THEN ' Tvé umístění: ' || v_participant.final_rank || '. místo.'
              ELSE ''
            END
        END,
        jsonb_build_object(
          'challenge_id', v_challenge.id,
          'xp_result', v_participant.xp_result,
          'final_rank', v_participant.final_rank
        )
      );
    END LOOP;
    
    RAISE LOG 'Auto-completed peer challenge: %', v_challenge.id;
  END LOOP;
END;
$$;

-- Create a trigger function that checks for expired challenges on relevant table access
CREATE OR REPLACE FUNCTION public.check_expired_peer_challenges_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run occasionally (roughly every 100th call) to avoid performance impact
  IF random() < 0.01 THEN
    PERFORM auto_complete_expired_peer_challenges();
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger on peer_challenge_submissions (runs when someone submits a score)
DROP TRIGGER IF EXISTS trg_check_expired_challenges_on_submission ON peer_challenge_submissions;
CREATE TRIGGER trg_check_expired_challenges_on_submission
  AFTER INSERT ON peer_challenge_submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_expired_peer_challenges_trigger();

-- Add trigger on peer_challenges (runs when challenges are viewed/created)
DROP TRIGGER IF EXISTS trg_check_expired_challenges_on_access ON peer_challenges;
CREATE TRIGGER trg_check_expired_challenges_on_access
  AFTER INSERT OR UPDATE ON peer_challenges
  FOR EACH ROW
  EXECUTE FUNCTION check_expired_peer_challenges_trigger();

-- Run the cleanup once now to process any currently expired challenges
SELECT auto_complete_expired_peer_challenges();