-- Fix incorrect uniqueness on client_accounts.user_id (trainer/user owning the client)
-- This column represents the trainer/owner, so multiple rows must be allowed.

ALTER TABLE public.client_accounts DROP CONSTRAINT IF EXISTS client_accounts_user_id_key;

-- Some instances also have a unique index created separately.
DROP INDEX IF EXISTS public.client_accounts_user_id_key;

-- Keep a non-unique index for performance.
CREATE INDEX IF NOT EXISTS idx_client_accounts_user_id ON public.client_accounts (user_id);
