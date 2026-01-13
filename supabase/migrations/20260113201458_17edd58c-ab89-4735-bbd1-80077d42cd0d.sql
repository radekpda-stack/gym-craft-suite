-- Add public challenge columns to peer_challenges
ALTER TABLE public.peer_challenges 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
ADD COLUMN IF NOT EXISTS require_photo_proof boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS metrics_config jsonb,
ADD COLUMN IF NOT EXISTS leaderboard_config jsonb;

-- Create index for public_slug lookups
CREATE INDEX IF NOT EXISTS idx_peer_challenges_public_slug 
ON public.peer_challenges(public_slug) WHERE public_slug IS NOT NULL;

-- Create index for public challenges
CREATE INDEX IF NOT EXISTS idx_peer_challenges_is_public 
ON public.peer_challenges(is_public) WHERE is_public = true;