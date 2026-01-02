-- Add columns to track login count and credentials change
ALTER TABLE public.client_accounts 
ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS credentials_changed_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.client_accounts.login_count IS 'Number of logins, used for credentials reminder (show for first 5 logins)';
COMMENT ON COLUMN public.client_accounts.credentials_changed_at IS 'When client changed their own credentials (email/password)';