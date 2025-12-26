-- Add credit_history_start_at column to client_accounts
ALTER TABLE public.client_accounts 
ADD COLUMN IF NOT EXISTS credit_history_start_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to set credit_history_start_at to created_at
UPDATE public.client_accounts 
SET credit_history_start_at = created_at 
WHERE credit_history_start_at IS NULL;

-- Create function to auto-create client portal account
CREATE OR REPLACE FUNCTION public.auto_create_client_portal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_temp_password text;
  v_auth_user_id uuid;
BEGIN
  -- Only create portal if client has email and user_id
  IF NEW.email IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- Check if portal already exists
    IF NOT EXISTS (SELECT 1 FROM client_accounts WHERE client_id = NEW.id) THEN
      -- Generate a temporary password (will be hashed by auth system)
      v_temp_password := encode(gen_random_bytes(12), 'base64');
      
      -- Insert client account in pending state
      INSERT INTO client_accounts (
        client_id,
        user_id,
        trainer_id,
        is_active,
        status,
        portal_password,
        credit_history_start_at,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.user_id, -- This will be updated when auth user is created
        NEW.user_id,
        false,
        'pending',
        v_temp_password, -- Temporary, will be properly set via edge function
        now(),
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto portal creation
DROP TRIGGER IF EXISTS trigger_auto_create_client_portal ON clients;
CREATE TRIGGER trigger_auto_create_client_portal
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_client_portal();

-- Create function to bulk create portals for existing clients
CREATE OR REPLACE FUNCTION public.bulk_create_client_portals(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_temp_password text;
BEGIN
  FOR v_client IN 
    SELECT c.* 
    FROM clients c
    WHERE c.user_id = p_trainer_id
      AND c.email IS NOT NULL
      AND c.is_archived = false
      AND c.is_system = false
      AND NOT EXISTS (SELECT 1 FROM client_accounts ca WHERE ca.client_id = c.id)
  LOOP
    v_temp_password := encode(gen_random_bytes(12), 'base64');
    
    INSERT INTO client_accounts (
      client_id,
      user_id,
      trainer_id,
      is_active,
      status,
      portal_password,
      credit_history_start_at,
      created_at,
      updated_at
    ) VALUES (
      v_client.id,
      p_trainer_id,
      p_trainer_id,
      false,
      'pending',
      v_temp_password,
      now(),
      now(),
      now()
    );
    
    v_created_count := v_created_count + 1;
  END LOOP;
  
  -- Count skipped (no email or already has portal)
  SELECT COUNT(*) INTO v_skipped_count
  FROM clients c
  WHERE c.user_id = p_trainer_id
    AND c.is_archived = false
    AND c.is_system = false
    AND (c.email IS NULL OR EXISTS (SELECT 1 FROM client_accounts ca WHERE ca.client_id = c.id));
  
  -- Log audit event
  INSERT INTO audit_events (action, trainer_id, metadata)
  VALUES ('bulk_portal_creation', p_trainer_id, jsonb_build_object(
    'created_count', v_created_count,
    'skipped_count', v_skipped_count
  ));
  
  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count
  );
END;
$$;

-- Add index for faster portal lookups
CREATE INDEX IF NOT EXISTS idx_client_accounts_client_id ON client_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_trainer_id ON client_accounts(trainer_id);