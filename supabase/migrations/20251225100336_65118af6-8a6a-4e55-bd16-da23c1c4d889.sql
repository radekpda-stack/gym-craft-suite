-- Migrate client_accounts table for new auth system
-- Add new columns if they don't exist
ALTER TABLE client_accounts 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_password_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_trainer_id uuid;

-- Add constraint for status values
ALTER TABLE client_accounts DROP CONSTRAINT IF EXISTS client_accounts_status_check;
ALTER TABLE client_accounts ADD CONSTRAINT client_accounts_status_check 
  CHECK (status IN ('active', 'disabled'));

-- Migrate existing is_active values to status
UPDATE client_accounts 
SET status = CASE WHEN is_active = true THEN 'active' ELSE 'disabled' END
WHERE status IS NULL;

-- Create audit_events table for logging all actions
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  auth_user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_trainer ON audit_events(trainer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_client ON audit_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_accounts_auth_user ON client_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON client_accounts(status);

-- Enable RLS on new tables
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_events
DROP POLICY IF EXISTS "Trainers see own audit events" ON audit_events;
CREATE POLICY "Trainers see own audit events" ON audit_events
  FOR SELECT USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "Allow insert from edge functions" ON audit_events;
CREATE POLICY "Allow insert from edge functions" ON audit_events
  FOR INSERT WITH CHECK (true);

-- RLS policies for login_attempts (only accessible via service role in edge functions)
DROP POLICY IF EXISTS "No direct access to login_attempts" ON login_attempts;
CREATE POLICY "No direct access to login_attempts" ON login_attempts
  FOR ALL USING (false);

-- Update client_accounts RLS to include status check for client access
DROP POLICY IF EXISTS "Clients see own active account" ON client_accounts;
CREATE POLICY "Clients see own active account" ON client_accounts
  FOR SELECT USING (auth_user_id = auth.uid() AND status = 'active');

-- Function to clean old login attempts (older than 24h)
CREATE OR REPLACE FUNCTION clean_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM login_attempts WHERE created_at < now() - interval '24 hours';
END;
$$;