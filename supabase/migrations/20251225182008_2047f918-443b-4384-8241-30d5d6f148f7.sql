-- Add column to store the generated password (for trainer reference)
ALTER TABLE public.client_accounts 
ADD COLUMN portal_password TEXT;