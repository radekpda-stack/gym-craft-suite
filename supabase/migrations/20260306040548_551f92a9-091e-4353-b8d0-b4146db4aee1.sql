-- ============================================================
-- 1. IMMUTABLE LEDGER: Add reversal support columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_transactions' AND column_name='reversed_by_id') THEN
    ALTER TABLE public.credit_transactions ADD COLUMN reversed_by_id UUID REFERENCES public.credit_transactions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_transactions' AND column_name='is_reversal') THEN
    ALTER TABLE public.credit_transactions ADD COLUMN is_reversal BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_reversed_by ON public.credit_transactions(reversed_by_id) WHERE reversed_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_is_reversal ON public.credit_transactions(is_reversal) WHERE is_reversal = TRUE;

-- ============================================================
-- 2. BLOCK DELETE on credit_transactions
-- ============================================================
CREATE OR REPLACE FUNCTION fn_block_credit_transaction_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  RAISE EXCEPTION 'credit_transactions is an immutable ledger. Use reversal transactions instead of DELETE. Transaction ID: %', OLD.id;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_block_credit_transaction_delete ON public.credit_transactions;
CREATE TRIGGER trg_block_credit_transaction_delete
  BEFORE DELETE ON public.credit_transactions FOR EACH ROW
  EXECUTE FUNCTION fn_block_credit_transaction_delete();

-- Block mutation of financial fields
CREATE OR REPLACE FUNCTION fn_block_credit_transaction_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  IF OLD.amount != NEW.amount OR OLD.type != NEW.type OR OLD.client_id != NEW.client_id THEN
    RAISE EXCEPTION 'Cannot modify financial fields on credit_transactions. Use reversal transactions instead.';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_credit_transaction_mutation ON public.credit_transactions;
CREATE TRIGGER trg_block_credit_transaction_mutation
  BEFORE UPDATE ON public.credit_transactions FOR EACH ROW
  EXECUTE FUNCTION fn_block_credit_transaction_mutation();

-- ============================================================
-- 3. RPC: Create reversal transaction (replaces DELETE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_reverse_transaction(
  p_transaction_id UUID, p_reason TEXT DEFAULT 'Storno transakce'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_original RECORD; v_reversal_id UUID; v_user_id UUID;
  v_current_balance NUMERIC; v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  SELECT * INTO v_original FROM credit_transactions WHERE id = p_transaction_id;
  IF v_original IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  IF v_original.reversed_by_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already reversed');
  END IF;
  IF v_original.is_reversal THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reverse a reversal transaction');
  END IF;

  IF v_original.group_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM credit_transactions WHERE group_id = v_original.group_id AND reversed_by_id IS NULL;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM credit_transactions WHERE client_id = v_original.client_id AND group_id IS NULL AND reversed_by_id IS NULL;
  END IF;

  v_new_balance := v_current_balance + (-v_original.amount);

  INSERT INTO credit_transactions (
    client_id, amount, type, description, payment_method,
    user_id, group_id, status, source_type, source_id,
    balance_after, is_reversal, training_session_id, product_id
  ) VALUES (
    v_original.client_id, -v_original.amount, 'reversal',
    p_reason || ' (storno #' || LEFT(p_transaction_id::text, 8) || ')',
    v_original.payment_method, v_user_id, v_original.group_id,
    'completed', 'reversal', p_transaction_id,
    v_new_balance, TRUE, v_original.training_session_id, v_original.product_id
  ) RETURNING id INTO v_reversal_id;

  UPDATE credit_transactions SET reversed_by_id = v_reversal_id WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true, 'reversal_id', v_reversal_id, 'original_id', p_transaction_id,
    'reversed_amount', v_original.amount, 'new_balance', v_new_balance,
    'message', format('Transakce stornována: %s Kč', ABS(v_original.amount))
  );
END; $$;

-- ============================================================
-- 4. Update sync triggers to exclude reversed transactions
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_client_credit_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_client_id UUID; v_new_balance NUMERIC;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  IF COALESCE(NEW.group_id, OLD.group_id) IS NOT NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM credit_transactions WHERE client_id = v_client_id AND group_id IS NULL AND reversed_by_id IS NULL;
  UPDATE clients SET credit_balance = v_new_balance WHERE id = v_client_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION fn_sync_group_credit_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_group_id UUID; v_new_balance NUMERIC;
BEGIN
  v_group_id := COALESCE(NEW.group_id, OLD.group_id);
  IF v_group_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM credit_transactions WHERE group_id = v_group_id AND reversed_by_id IS NULL;
  UPDATE client_budget_groups SET shared_balance = v_new_balance WHERE id = v_group_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- ============================================================
-- 5. Update ledger views - keep same column structure but exclude reversed
-- ============================================================
CREATE OR REPLACE VIEW vw_client_ledger_balances AS
SELECT id AS client_id,
    name AS client_name,
    credit_balance AS stored_balance,
    COALESCE(( SELECT ct.balance_after
           FROM credit_transactions ct
          WHERE ct.client_id = c.id AND ct.group_id IS NULL AND ct.status = 'completed' 
            AND ct.balance_after IS NOT NULL AND ct.reversed_by_id IS NULL AND ct.is_reversal = FALSE
          ORDER BY ct.created_at DESC, ct.id DESC
         LIMIT 1), 
         -- Fallback: compute from SUM if no balance_after
         COALESCE((SELECT SUM(ct2.amount) FROM credit_transactions ct2 
           WHERE ct2.client_id = c.id AND ct2.group_id IS NULL AND ct2.reversed_by_id IS NULL), 0)
    ) AS ledger_balance,
    credit_balance - COALESCE(( SELECT ct.balance_after
           FROM credit_transactions ct
          WHERE ct.client_id = c.id AND ct.group_id IS NULL AND ct.status = 'completed' 
            AND ct.balance_after IS NOT NULL AND ct.reversed_by_id IS NULL AND ct.is_reversal = FALSE
          ORDER BY ct.created_at DESC, ct.id DESC
         LIMIT 1),
         COALESCE((SELECT SUM(ct2.amount) FROM credit_transactions ct2 
           WHERE ct2.client_id = c.id AND ct2.group_id IS NULL AND ct2.reversed_by_id IS NULL), 0)
    ) AS discrepancy,
    (EXISTS ( SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id)) AS is_group_member
   FROM clients c
  WHERE is_archived = false;

CREATE OR REPLACE VIEW vw_group_ledger_balances AS
SELECT id AS group_id,
    name AS group_name,
    shared_balance AS stored_balance,
    COALESCE(( SELECT ct.balance_after
           FROM credit_transactions ct
          WHERE ct.group_id = bg.id AND ct.status = 'completed' 
            AND ct.balance_after IS NOT NULL AND ct.reversed_by_id IS NULL AND ct.is_reversal = FALSE
          ORDER BY ct.created_at DESC, ct.id DESC
         LIMIT 1),
         COALESCE((SELECT SUM(ct2.amount) FROM credit_transactions ct2 
           WHERE ct2.group_id = bg.id AND ct2.reversed_by_id IS NULL), 0)
    ) AS ledger_balance,
    shared_balance - COALESCE(( SELECT ct.balance_after
           FROM credit_transactions ct
          WHERE ct.group_id = bg.id AND ct.status = 'completed' 
            AND ct.balance_after IS NOT NULL AND ct.reversed_by_id IS NULL AND ct.is_reversal = FALSE
          ORDER BY ct.created_at DESC, ct.id DESC
         LIMIT 1),
         COALESCE((SELECT SUM(ct2.amount) FROM credit_transactions ct2 
           WHERE ct2.group_id = bg.id AND ct2.reversed_by_id IS NULL), 0)
    ) AS discrepancy,
    ( SELECT count(*) FROM client_budget_members bm WHERE bm.group_id = bg.id) AS member_count
   FROM client_budget_groups bg;