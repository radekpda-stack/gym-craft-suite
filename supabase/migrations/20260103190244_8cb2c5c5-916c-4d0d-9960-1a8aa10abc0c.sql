-- Add team challenge columns to challenges table
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_team_challenge BOOLEAN DEFAULT false;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS max_team_size INTEGER DEFAULT 4;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS min_team_size INTEGER DEFAULT 2;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS team_scoring_mode TEXT DEFAULT 'sum';

-- Create challenge_teams table
CREATE TABLE IF NOT EXISTS public.challenge_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  captain_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
  total_score DECIMAL DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge_team_members table
CREATE TABLE IF NOT EXISTS public.challenge_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES challenge_teams(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, client_id)
);

-- Add team_id to challenge_submissions
ALTER TABLE challenge_submissions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES challenge_teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.challenge_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_teams
CREATE POLICY "Teams are viewable by participants" 
ON public.challenge_teams 
FOR SELECT 
USING (true);

CREATE POLICY "Clients can create teams" 
ON public.challenge_teams 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Captains can update their teams" 
ON public.challenge_teams 
FOR UPDATE 
USING (true);

-- RLS policies for challenge_team_members
CREATE POLICY "Team members are viewable" 
ON public.challenge_team_members 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can join teams" 
ON public.challenge_team_members 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Members can leave teams" 
ON public.challenge_team_members 
FOR DELETE 
USING (true);

-- Function to recalculate team score
CREATE OR REPLACE FUNCTION public.recalculate_team_score()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_challenge_id UUID;
  v_scoring_mode TEXT;
  v_new_score DECIMAL;
BEGIN
  -- Get team_id from NEW or OLD
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);
  
  IF v_team_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get challenge info
  SELECT c.id, c.team_scoring_mode INTO v_challenge_id, v_scoring_mode
  FROM challenges c
  JOIN challenge_teams ct ON ct.challenge_id = c.id
  WHERE ct.id = v_team_id;

  IF v_challenge_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate new score based on scoring mode
  IF v_scoring_mode = 'sum' THEN
    SELECT COALESCE(SUM(cs.score_primary), 0)
    INTO v_new_score
    FROM challenge_submissions cs
    WHERE cs.team_id = v_team_id
    AND cs.status = 'approved';
  ELSIF v_scoring_mode = 'average' THEN
    SELECT COALESCE(AVG(cs.score_primary), 0)
    INTO v_new_score
    FROM challenge_submissions cs
    WHERE cs.team_id = v_team_id
    AND cs.status = 'approved';
  ELSE -- 'best' - take best score per member
    SELECT COALESCE(SUM(best_scores.max_score), 0)
    INTO v_new_score
    FROM (
      SELECT MAX(cs.score_primary) as max_score
      FROM challenge_submissions cs
      WHERE cs.team_id = v_team_id
      AND cs.status = 'approved'
      GROUP BY cs.client_id
    ) best_scores;
  END IF;

  -- Update team score
  UPDATE challenge_teams
  SET total_score = v_new_score, 
      member_count = (SELECT COUNT(*) FROM challenge_team_members WHERE team_id = v_team_id),
      updated_at = now()
  WHERE id = v_team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger without WHEN clause (handle inside function)
CREATE TRIGGER recalculate_team_score_trigger
AFTER INSERT OR UPDATE OR DELETE ON challenge_submissions
FOR EACH ROW
EXECUTE FUNCTION recalculate_team_score();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_challenge_teams_challenge_id ON challenge_teams(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_teams_invite_code ON challenge_teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_challenge_team_members_team_id ON challenge_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_team_members_client_id ON challenge_team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_team_id ON challenge_submissions(team_id);