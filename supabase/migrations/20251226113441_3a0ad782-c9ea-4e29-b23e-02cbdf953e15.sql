-- Add login_identifier column to client_accounts table
ALTER TABLE public.client_accounts 
ADD COLUMN IF NOT EXISTS login_identifier TEXT;

-- Create unique index for login_identifier
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_accounts_login_identifier 
ON public.client_accounts(login_identifier) 
WHERE login_identifier IS NOT NULL;