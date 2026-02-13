
-- 1. Trigger function: sync clients.credit_balance from ledger
CREATE OR REPLACE FUNCTION public.fn_sync_client_credit_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_new_balance numeric;
BEGIN
  -- Determine which client_id to recalculate
  IF TG_OP = 'DELETE' THEN
    v_client_id := OLD.client_id;
  ELSE
    v_client_id := NEW.client_id;
  END IF;

  -- Skip group transactions (they use shared_balance on client_budget_groups)
  IF v_client_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip if client is in a budget group (their balance is managed at group level)
  IF EXISTS (SELECT 1 FROM client_budget_members WHERE client_id = v_client_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalculate from ledger
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM credit_transactions
  WHERE client_id = v_client_id
    AND status = 'completed'
    AND group_id IS NULL;

  -- Update the stored balance
  UPDATE clients
  SET credit_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_client_id;

  -- Also handle OLD.client_id on UPDATE if client_id changed
  IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id AND OLD.client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM client_budget_members WHERE client_id = OLD.client_id) THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
      FROM credit_transactions
      WHERE client_id = OLD.client_id
        AND status = 'completed'
        AND group_id IS NULL;

      UPDATE clients
      SET credit_balance = v_new_balance,
          updated_at = now()
      WHERE id = OLD.client_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trg_sync_client_credit_balance ON credit_transactions;
CREATE TRIGGER trg_sync_client_credit_balance
  AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_client_credit_balance();

-- 3. Similarly for group balance sync
CREATE OR REPLACE FUNCTION public.fn_sync_group_credit_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_new_balance numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
  ELSE
    v_group_id := NEW.group_id;
  END IF;

  IF v_group_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM credit_transactions
  WHERE group_id = v_group_id
    AND status = 'completed';

  UPDATE client_budget_groups
  SET shared_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_group_id;

  IF TG_OP = 'UPDATE' AND OLD.group_id IS DISTINCT FROM NEW.group_id AND OLD.group_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
    FROM credit_transactions
    WHERE group_id = OLD.group_id
      AND status = 'completed';

    UPDATE client_budget_groups
    SET shared_balance = v_new_balance,
        updated_at = now()
    WHERE id = OLD.group_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_credit_balance ON credit_transactions;
CREATE TRIGGER trg_sync_group_credit_balance
  AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_group_credit_balance();

-- 4. One-time recalculation of all existing balances (individual clients not in groups)
UPDATE clients c
SET credit_balance = (
  SELECT COALESCE(SUM(ct.amount), 0)
  FROM credit_transactions ct
  WHERE ct.client_id = c.id
    AND ct.status = 'completed'
    AND ct.group_id IS NULL
)
WHERE NOT EXISTS (
  SELECT 1 FROM client_budget_members cbm WHERE cbm.client_id = c.id
);

-- 5. One-time recalculation of all group balances
UPDATE client_budget_groups g
SET shared_balance = (
  SELECT COALESCE(SUM(ct.amount), 0)
  FROM credit_transactions ct
  WHERE ct.group_id = g.id
    AND ct.status = 'completed'
);
