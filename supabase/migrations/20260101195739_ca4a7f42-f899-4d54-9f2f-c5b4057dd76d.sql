-- Add a flag to mark which client record represents the trainer's own profile
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS is_self_profile BOOLEAN NOT NULL DEFAULT false;

-- Ensure at most one self-profile per trainer/user
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_one_self_profile_per_user
ON public.clients (user_id)
WHERE is_self_profile;

-- Mark the existing "Trenér Radek" record as the self profile for its owner
UPDATE public.clients
SET is_self_profile = true
WHERE id = '29d2692d-ece4-43f5-a770-fe46bc592917';