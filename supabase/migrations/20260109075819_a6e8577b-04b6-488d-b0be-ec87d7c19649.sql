-- =============================================================================
-- FINÁLNÍ SYSTÉM PŘECHODU CENÍKU 1.2.2026
-- =============================================================================

-- 1. PRICE LISTS (verze ceníku)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_lists_select" ON public.price_lists 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "price_lists_insert" ON public.price_lists 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "price_lists_update" ON public.price_lists 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Seed initial price lists
INSERT INTO public.price_lists (id, name, effective_from, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ceník do 31.1.2026', '2020-01-01T00:00:00+01:00', true),
  ('00000000-0000-0000-0000-000000000002', 'Ceník od 1.2.2026', '2026-02-01T00:00:00+01:00', true)
ON CONFLICT (id) DO NOTHING;

-- 2. PRICE ITEMS (položky ceníku)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  unit_price_czk INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(price_list_id, service_id)
);

ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_items_select" ON public.price_items 
  FOR SELECT TO authenticated USING (true);

-- Seed OLD prices (800/1000/1200)
INSERT INTO public.price_items (price_list_id, service_id, unit_price_czk) VALUES
  ('00000000-0000-0000-0000-000000000001', 'PT_1', 800),
  ('00000000-0000-0000-0000-000000000001', 'PT_2', 1000),
  ('00000000-0000-0000-0000-000000000001', 'PT_3P', 1200)
ON CONFLICT (price_list_id, service_id) DO NOTHING;

-- Seed NEW prices (900/1100/1300)
INSERT INTO public.price_items (price_list_id, service_id, unit_price_czk) VALUES
  ('00000000-0000-0000-0000-000000000002', 'PT_1', 900),
  ('00000000-0000-0000-0000-000000000002', 'PT_2', 1100),
  ('00000000-0000-0000-0000-000000000002', 'PT_3P', 1300)
ON CONFLICT (price_list_id, service_id) DO NOTHING;

-- 3. CREDIT LOTS (šarže kreditu)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  balance_czk_original INTEGER NOT NULL,
  balance_czk_remaining INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'migration', 'manual_adjustment')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_credit_lots_client ON public.credit_lots(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_lots_remaining ON public.credit_lots(client_id, balance_czk_remaining) 
  WHERE balance_czk_remaining > 0;

ALTER TABLE public.credit_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_lots_select" ON public.credit_lots 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "credit_lots_insert" ON public.credit_lots 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "credit_lots_update" ON public.credit_lots 
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 4. CREDIT CONSUMPTIONS (ledger stržení)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.credit_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  training_session_id UUID REFERENCES public.training_sessions(id),
  lot_id UUID NOT NULL REFERENCES public.credit_lots(id),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id),
  service_id TEXT NOT NULL,
  amount_czk INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_credit_consumptions_client ON public.credit_consumptions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_consumptions_training ON public.credit_consumptions(training_session_id);

ALTER TABLE public.credit_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_consumptions_select" ON public.credit_consumptions 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "credit_consumptions_insert" ON public.credit_consumptions 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 5. CLIENT FIELDS pro ruční fixaci
-- =============================================================================
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS price_lock_mode TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS locked_price_list_id UUID REFERENCES public.price_lists(id),
  ADD COLUMN IF NOT EXISTS lock_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_set_by UUID REFERENCES auth.users(id);

-- Add check constraint separately (if column already exists without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_price_lock_mode_check'
  ) THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_price_lock_mode_check 
      CHECK (price_lock_mode IS NULL OR price_lock_mode IN ('none', 'lock_old_until_depleted'));
  END IF;
END $$;

-- 6. RPC FUNCTIONS
-- =============================================================================

-- 6.1 Get price for service from specific price list
CREATE OR REPLACE FUNCTION public.rpc_get_price_for_service(
  p_price_list_id UUID,
  p_service_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_price INTEGER;
BEGIN
  SELECT unit_price_czk INTO v_price
  FROM public.price_items
  WHERE price_list_id = p_price_list_id AND service_id = p_service_id;
  
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Price not found for service % in price list %', p_service_id, p_price_list_id;
  END IF;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.2 Get current price list based on date
CREATE OR REPLACE FUNCTION public.rpc_get_current_price_list()
RETURNS UUID AS $$
DECLARE
  v_price_list_id UUID;
  v_now TIMESTAMPTZ := now() AT TIME ZONE 'Europe/Prague';
BEGIN
  SELECT id INTO v_price_list_id
  FROM public.price_lists
  WHERE is_active = true AND effective_from <= v_now
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN v_price_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.3 FIFO credit deduction (MOST IMPORTANT)
CREATE OR REPLACE FUNCTION public.rpc_deduct_credit_fifo(
  p_client_id UUID,
  p_training_session_id UUID,
  p_service_id TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_lot RECORD;
  v_price INTEGER;
  v_remaining_to_deduct INTEGER;
  v_deduct_from_lot INTEGER;
  v_consumptions JSONB := '[]'::JSONB;
  v_total_deducted INTEGER := 0;
  v_first_lot BOOLEAN := true;
BEGIN
  -- Get lots with positive balance (FIFO = oldest first)
  FOR v_lot IN 
    SELECT id, price_list_id, balance_czk_remaining
    FROM public.credit_lots
    WHERE client_id = p_client_id 
      AND balance_czk_remaining > 0
      AND user_id = p_user_id
    ORDER BY purchased_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    -- Get price from this lot's price list
    v_price := public.rpc_get_price_for_service(v_lot.price_list_id, p_service_id);
    
    -- If first lot, set amount to deduct
    IF v_first_lot THEN
      v_remaining_to_deduct := v_price;
      v_first_lot := false;
    END IF;
    
    -- How much can we deduct from this lot
    v_deduct_from_lot := LEAST(v_lot.balance_czk_remaining, v_remaining_to_deduct);
    
    IF v_deduct_from_lot > 0 THEN
      -- Update lot balance
      UPDATE public.credit_lots
      SET balance_czk_remaining = balance_czk_remaining - v_deduct_from_lot
      WHERE id = v_lot.id;
      
      -- Create consumption record
      INSERT INTO public.credit_consumptions (
        client_id, training_session_id, lot_id, price_list_id,
        service_id, amount_czk, user_id, note
      ) VALUES (
        p_client_id, p_training_session_id, v_lot.id, v_lot.price_list_id,
        p_service_id, v_deduct_from_lot, p_user_id,
        'Trénink ' || p_service_id
      );
      
      v_consumptions := v_consumptions || jsonb_build_object(
        'lot_id', v_lot.id,
        'price_list_id', v_lot.price_list_id,
        'amount', v_deduct_from_lot
      );
      
      v_total_deducted := v_total_deducted + v_deduct_from_lot;
      v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_from_lot;
    END IF;
    
    -- If we've deducted everything, exit
    IF v_remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Update credit_balance on client (for backward compatibility)
  UPDATE public.clients
  SET credit_balance = COALESCE(credit_balance, 0) - v_total_deducted,
      updated_at = now()
  WHERE id = p_client_id;
  
  -- If we couldn't deduct the full amount
  IF v_remaining_to_deduct > 0 AND v_total_deducted > 0 THEN
    -- Partial deduction happened - this is valid for split across lots
    NULL;
  ELSIF v_total_deducted = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nedostatek kreditu',
      'required', COALESCE(v_price, 0),
      'deducted', 0,
      'missing', COALESCE(v_remaining_to_deduct, v_price)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_deducted', v_total_deducted,
    'consumptions', v_consumptions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.4 Add credit lot (for top-ups)
CREATE OR REPLACE FUNCTION public.rpc_add_credit_lot(
  p_client_id UUID,
  p_amount_czk INTEGER,
  p_source TEXT DEFAULT 'purchase',
  p_note TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_price_list_id UUID;
  v_lot_id UUID;
BEGIN
  -- Determine price list based on current date
  v_price_list_id := public.rpc_get_current_price_list();
  
  IF v_price_list_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenalezen aktivní ceník');
  END IF;
  
  -- Create new lot
  INSERT INTO public.credit_lots (
    client_id, price_list_id, balance_czk_original, balance_czk_remaining,
    source, note, user_id, created_by
  ) VALUES (
    p_client_id, v_price_list_id, p_amount_czk, p_amount_czk,
    p_source, p_note, p_user_id, p_user_id
  )
  RETURNING id INTO v_lot_id;
  
  -- Update credit_balance for backward compatibility
  UPDATE public.clients
  SET credit_balance = COALESCE(credit_balance, 0) + p_amount_czk,
      updated_at = now()
  WHERE id = p_client_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'lot_id', v_lot_id,
    'price_list_id', v_price_list_id,
    'amount', p_amount_czk
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.5 Migrate existing credit to lot
CREATE OR REPLACE FUNCTION public.rpc_migrate_credit_to_lot(
  p_client_id UUID,
  p_use_old_price_list BOOLEAN,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_credit_balance NUMERIC;
  v_price_list_id UUID;
  v_lot_id UUID;
  v_existing_lots INTEGER;
BEGIN
  -- Check if client already has lots
  SELECT COUNT(*) INTO v_existing_lots 
  FROM public.credit_lots 
  WHERE client_id = p_client_id AND user_id = p_user_id;
  
  IF v_existing_lots > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Klient už má credit loty', 'existing_lots', v_existing_lots);
  END IF;
  
  -- Get current balance
  SELECT credit_balance INTO v_credit_balance 
  FROM public.clients 
  WHERE id = p_client_id;
  
  IF COALESCE(v_credit_balance, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Žádný kredit k migraci', 'migrated', 0);
  END IF;
  
  -- Determine price list
  IF p_use_old_price_list THEN
    v_price_list_id := '00000000-0000-0000-0000-000000000001'; -- OLD
    
    -- Set lock on client
    UPDATE public.clients SET
      price_lock_mode = 'lock_old_until_depleted',
      locked_price_list_id = v_price_list_id,
      lock_set_at = now(),
      lock_set_by = p_user_id
    WHERE id = p_client_id;
  ELSE
    v_price_list_id := '00000000-0000-0000-0000-000000000002'; -- NEW
  END IF;
  
  -- Create lot
  INSERT INTO public.credit_lots (
    client_id, price_list_id, 
    balance_czk_original, balance_czk_remaining,
    source, note, user_id, created_by
  ) VALUES (
    p_client_id, v_price_list_id,
    ROUND(v_credit_balance)::INTEGER, ROUND(v_credit_balance)::INTEGER,
    'migration', 'Migrace k přechodu ceníku 1.2.2026', p_user_id, p_user_id
  )
  RETURNING id INTO v_lot_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'lot_id', v_lot_id,
    'migrated', ROUND(v_credit_balance)::INTEGER,
    'price_list', CASE WHEN p_use_old_price_list THEN 'OLD' ELSE 'NEW' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.6 Get client credit summary by price list
CREATE OR REPLACE FUNCTION public.rpc_get_client_credit_summary(
  p_client_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_old_balance INTEGER := 0;
  v_new_balance INTEGER := 0;
  v_total_balance INTEGER := 0;
BEGIN
  -- Sum OLD price list lots
  SELECT COALESCE(SUM(balance_czk_remaining), 0) INTO v_old_balance
  FROM public.credit_lots
  WHERE client_id = p_client_id 
    AND user_id = p_user_id
    AND price_list_id = '00000000-0000-0000-0000-000000000001'
    AND balance_czk_remaining > 0;
  
  -- Sum NEW price list lots
  SELECT COALESCE(SUM(balance_czk_remaining), 0) INTO v_new_balance
  FROM public.credit_lots
  WHERE client_id = p_client_id 
    AND user_id = p_user_id
    AND price_list_id = '00000000-0000-0000-0000-000000000002'
    AND balance_czk_remaining > 0;
  
  v_total_balance := v_old_balance + v_new_balance;
  
  RETURN jsonb_build_object(
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'total_balance', v_total_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;