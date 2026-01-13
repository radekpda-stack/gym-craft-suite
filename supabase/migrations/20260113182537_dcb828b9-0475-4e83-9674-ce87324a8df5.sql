-- Add trigger to automatically settle XP bets when challenge status changes to 'completed'
CREATE OR REPLACE FUNCTION settle_peer_challenge_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Only settle if XP betting is enabled
    IF NEW.xp_bet_enabled = true THEN
      SELECT settle_peer_challenge_xp_bets(NEW.id) INTO v_result;
      
      -- Log the settlement
      INSERT INTO peer_challenge_activity_log (
        challenge_id,
        actor_type,
        actor_id,
        action,
        metadata
      ) VALUES (
        NEW.id,
        'system',
        NEW.id,
        'xp_settled',
        v_result
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_settle_peer_challenge_xp ON peer_challenges;
CREATE TRIGGER trigger_settle_peer_challenge_xp
  AFTER UPDATE OF status ON peer_challenges
  FOR EACH ROW
  EXECUTE FUNCTION settle_peer_challenge_on_complete();

-- Add function to complete expired challenges (for cron job)
CREATE OR REPLACE FUNCTION complete_expired_peer_challenges()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE peer_challenges
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'active'
    AND end_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;