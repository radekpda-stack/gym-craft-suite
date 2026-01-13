
-- Update the get_challenge_leaderboard function to show "Trenér" for trainer instead of pseudonym
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(
  p_challenge_id uuid,
  p_client_id uuid,
  p_min_group_size integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_count integer;
  v_client_rank integer;
  v_client_score numeric;
  v_client_pseudonym text;
  v_leaderboard jsonb;
  v_client_percentile numeric;
BEGIN
  -- Get challenge info
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('error', 'challenge_not_found');
  END IF;
  
  -- Count participants with approved submissions
  SELECT COUNT(DISTINCT client_id)
  INTO v_count
  FROM challenge_submissions
  WHERE challenge_id = p_challenge_id AND status = 'approved';
  
  -- Check minimum group size
  IF v_count < p_min_group_size THEN
    -- Still return client's own data
    SELECT score_primary INTO v_client_score
    FROM challenge_submissions
    WHERE challenge_id = p_challenge_id AND client_id = p_client_id AND status = 'approved'
    ORDER BY 
      CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
      CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'error', 'insufficient_participants',
      'count', v_count,
      'required', p_min_group_size,
      'client_score', v_client_score
    );
  END IF;
  
  -- Get or create client's pseudonym
  v_client_pseudonym := get_or_create_challenge_pseudonym(p_challenge_id, p_client_id);
  
  -- Build leaderboard with ranking
  -- Now includes check for is_self_profile to show "Trenér" for trainer
  WITH ranked AS (
    SELECT 
      cs.client_id,
      cp.pseudonym,
      cs.score_primary,
      cs.score_secondary,
      c.is_self_profile,
      c.name as client_name,
      cls.leaderboard_nickname,
      ROW_NUMBER() OVER (
        PARTITION BY cs.client_id 
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN cs.score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN cs.score_primary END DESC,
          cs.score_secondary DESC NULLS LAST
      ) as attempt_rank
    FROM challenge_submissions cs
    JOIN challenge_participants cp ON cp.challenge_id = cs.challenge_id AND cp.client_id = cs.client_id
    JOIN clients c ON c.id = cs.client_id
    LEFT JOIN client_leaderboard_settings cls ON cls.client_id = cs.client_id
    WHERE cs.challenge_id = p_challenge_id AND cs.status = 'approved'
  ),
  best_attempts AS (
    SELECT * FROM ranked WHERE attempt_rank = 1
  ),
  final_ranked AS (
    SELECT 
      -- For trainer (is_self_profile), show nickname if set, else "Trenér", else client name
      -- For regular clients, use challenge pseudonym
      CASE 
        WHEN is_self_profile = true THEN COALESCE(NULLIF(leaderboard_nickname, ''), 'Trenér')
        ELSE pseudonym
      END as display_name,
      score_primary,
      score_secondary,
      client_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC,
          score_secondary DESC NULLS LAST
      ) as rank
    FROM best_attempts
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'pseudonym', display_name,
        'score', score_primary,
        'is_you', client_id = p_client_id
      ) ORDER BY rank
    )
  INTO v_leaderboard
  FROM final_ranked;
  
  -- Get client's rank and percentile
  SELECT rank, score_primary
  INTO v_client_rank, v_client_score
  FROM (
    SELECT 
      client_id,
      score_primary,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
          CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
      ) as rank
    FROM (
      SELECT DISTINCT ON (client_id) client_id, score_primary
      FROM challenge_submissions
      WHERE challenge_id = p_challenge_id AND status = 'approved'
      ORDER BY client_id,
        CASE WHEN v_challenge.scoring_type = 'time_lower_better' THEN score_primary END ASC,
        CASE WHEN v_challenge.scoring_type != 'time_lower_better' THEN score_primary END DESC
    ) best
  ) ranked
  WHERE client_id = p_client_id;
  
  IF v_client_rank IS NOT NULL THEN
    v_client_percentile := (1 - (v_client_rank - 1)::numeric / v_count) * 100;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'leaderboard', v_leaderboard,
    'total_participants', v_count,
    'client_rank', v_client_rank,
    'client_score', v_client_score,
    'client_percentile', ROUND(v_client_percentile, 1),
    'client_pseudonym', v_client_pseudonym
  );
END;
$$;
