-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_auto_create_client_portal ON public.clients;
DROP FUNCTION IF EXISTS public.auto_create_client_portal();

-- Create updated function that generates username if no email
CREATE OR REPLACE FUNCTION public.auto_create_client_portal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login_identifier TEXT;
  v_generated_password TEXT;
  v_chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_username_base TEXT;
  v_username_suffix TEXT;
  v_counter INT := 0;
BEGIN
  -- Skip if trainer/user_id is not set or client is system/archived
  IF NEW.user_id IS NULL OR NEW.is_system = true OR NEW.is_archived = true THEN
    RETURN NEW;
  END IF;
  
  -- Check if portal already exists for this client
  IF EXISTS (SELECT 1 FROM client_accounts WHERE client_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Determine login identifier
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    v_login_identifier := NEW.email;
  ELSE
    -- Generate username from client name
    -- Remove diacritics and special characters, convert to lowercase
    v_username_base := lower(regexp_replace(
      translate(NEW.name, 
        'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ',
        'acdeeinorstuuyzACDEEINORSTUUYZ'),
      '[^a-z0-9]', '', 'g'
    ));
    
    -- Ensure minimum length
    IF length(v_username_base) < 3 THEN
      v_username_base := 'klient';
    END IF;
    
    -- Truncate if too long
    v_username_base := left(v_username_base, 15);
    
    -- Generate random suffix (4 chars)
    v_username_suffix := '';
    FOR i IN 1..4 LOOP
      v_username_suffix := v_username_suffix || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    
    v_login_identifier := v_username_base || '_' || v_username_suffix;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM client_accounts WHERE LOWER(login_identifier) = LOWER(v_login_identifier)) LOOP
      v_counter := v_counter + 1;
      v_username_suffix := '';
      FOR i IN 1..4 LOOP
        v_username_suffix := v_username_suffix || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
      END LOOP;
      v_login_identifier := v_username_base || '_' || v_username_suffix;
      
      -- Safety limit
      IF v_counter > 100 THEN
        v_login_identifier := 'user_' || gen_random_uuid()::text;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Generate random password (8 chars: 4 digits + 4 letters, shuffled)
  v_generated_password := '';
  FOR i IN 1..4 LOOP
    v_generated_password := v_generated_password || chr(48 + floor(random() * 10)::int); -- digits
  END LOOP;
  FOR i IN 1..4 LOOP
    v_generated_password := v_generated_password || chr(97 + floor(random() * 26)::int); -- letters
  END LOOP;
  -- Shuffle password
  v_generated_password := (
    SELECT string_agg(ch, '')
    FROM (
      SELECT ch FROM unnest(string_to_array(v_generated_password, NULL)) AS ch
      ORDER BY random()
    ) sub
  );
  
  -- Create portal account
  INSERT INTO client_accounts (
    client_id,
    user_id,
    trainer_id,
    login_identifier,
    portal_password,
    status,
    is_active,
    credit_history_start_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.user_id,
    v_login_identifier,
    v_generated_password,
    'pending',
    true,
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Recreate trigger (now fires for ALL new clients, not just those with email)
CREATE TRIGGER trigger_auto_create_client_portal
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_portal();

-- Also update bulk_create_client_portals to handle clients without email
CREATE OR REPLACE FUNCTION public.bulk_create_client_portals(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_created_count INT := 0;
  v_skipped_count INT := 0;
  v_login_identifier TEXT;
  v_generated_password TEXT;
  v_chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_username_base TEXT;
  v_username_suffix TEXT;
  v_counter INT;
BEGIN
  FOR v_client IN 
    SELECT c.id, c.name, c.email
    FROM clients c
    WHERE c.user_id = p_trainer_id
      AND c.is_archived = false
      AND c.is_system = false
      AND NOT EXISTS (
        SELECT 1 FROM client_accounts ca WHERE ca.client_id = c.id
      )
  LOOP
    -- Determine login identifier
    IF v_client.email IS NOT NULL AND v_client.email != '' THEN
      v_login_identifier := v_client.email;
    ELSE
      -- Generate username from client name
      v_username_base := lower(regexp_replace(
        translate(v_client.name, 
          'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ',
          'acdeeinorstuuyzACDEEINORSTUUYZ'),
        '[^a-z0-9]', '', 'g'
      ));
      
      IF length(v_username_base) < 3 THEN
        v_username_base := 'klient';
      END IF;
      
      v_username_base := left(v_username_base, 15);
      
      v_counter := 0;
      LOOP
        v_username_suffix := '';
        FOR i IN 1..4 LOOP
          v_username_suffix := v_username_suffix || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
        END LOOP;
        v_login_identifier := v_username_base || '_' || v_username_suffix;
        
        EXIT WHEN NOT EXISTS (SELECT 1 FROM client_accounts WHERE LOWER(login_identifier) = LOWER(v_login_identifier));
        
        v_counter := v_counter + 1;
        IF v_counter > 100 THEN
          v_login_identifier := 'user_' || gen_random_uuid()::text;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    -- Generate password
    v_generated_password := '';
    FOR i IN 1..4 LOOP
      v_generated_password := v_generated_password || chr(48 + floor(random() * 10)::int);
    END LOOP;
    FOR i IN 1..4 LOOP
      v_generated_password := v_generated_password || chr(97 + floor(random() * 26)::int);
    END LOOP;
    v_generated_password := (
      SELECT string_agg(ch, '')
      FROM (
        SELECT ch FROM unnest(string_to_array(v_generated_password, NULL)) AS ch
        ORDER BY random()
      ) sub
    );
    
    -- Create portal account
    INSERT INTO client_accounts (
      client_id,
      user_id,
      trainer_id,
      login_identifier,
      portal_password,
      status,
      is_active,
      credit_history_start_at,
      created_at,
      updated_at
    ) VALUES (
      v_client.id,
      p_trainer_id,
      p_trainer_id,
      v_login_identifier,
      v_generated_password,
      'pending',
      true,
      NOW(),
      NOW(),
      NOW()
    );
    
    v_created_count := v_created_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count
  );
END;
$$;