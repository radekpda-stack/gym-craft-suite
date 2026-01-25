-- ============================================================
-- FINANCIAL INTEGRITY: Auto-sync balance trigger + audit fields
-- ============================================================

-- 1. Add audit trail columns to credit_transactions
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_id uuid;

-- Add comment for documentation
COMMENT ON COLUMN credit_transactions.source_type IS 'Origin of transaction: training_session, sales_order, admin_panel, undo, system';
COMMENT ON COLUMN credit_transactions.source_id IS 'Reference to source record (training_session.id, sales_order.id, etc.)';

-- 2. Create trigger function to auto-sync balance after transaction insert
-- This ensures stored_balance always matches ledger
CREATE OR REPLACE FUNCTION trg_sync_balance_on_transaction()
RETURNS trigger AS $$
DECLARE
  v_group_id uuid;
BEGIN
  -- Only process completed transactions
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check if client is in a budget group
  SELECT group_id INTO v_group_id
  FROM client_budget_members
  WHERE client_id = NEW.client_id;
  
  IF v_group_id IS NOT NULL THEN
    -- Update group balance atomically
    UPDATE client_budget_groups
    SET shared_balance = shared_balance + NEW.amount,
        updated_at = now()
    WHERE id = v_group_id;
  ELSE
    -- Update individual client balance atomically
    UPDATE clients
    SET credit_balance = credit_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create the trigger (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS sync_balance_after_transaction ON credit_transactions;

CREATE TRIGGER sync_balance_after_transaction
AFTER INSERT ON credit_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trg_sync_balance_on_transaction();

-- 4. Create product sales report view for unified metrics
-- Using unit_price as the price column and products.purchase_price for cost
CREATE OR REPLACE VIEW vw_product_sales_report AS
SELECT 
  so.id as order_id,
  so.created_at,
  c.name as client_name,
  c.id as client_id,
  so.total_amount as revenue,
  COALESCE(
    (SELECT SUM(COALESCE(p.purchase_price, 0) * soi2.quantity) 
     FROM sales_order_items soi2 
     LEFT JOIN products p ON p.id = soi2.product_id
     WHERE soi2.order_id = so.id), 0
  ) as cost,
  so.total_amount - COALESCE(
    (SELECT SUM(COALESCE(p.purchase_price, 0) * soi2.quantity) 
     FROM sales_order_items soi2 
     LEFT JOIN products p ON p.id = soi2.product_id
     WHERE soi2.order_id = so.id), 0
  ) as margin,
  so.payment_method,
  CASE 
    WHEN so.payment_method = 'credit' THEN 0
    ELSE so.total_amount
  END as cash_inflow,
  CASE 
    WHEN so.payment_method = 'credit' THEN so.total_amount
    ELSE 0
  END as credit_used,
  so.user_id
FROM sales_orders so
LEFT JOIN clients c ON c.id = so.client_id;

-- 5. Add RLS to the view
ALTER VIEW vw_product_sales_report SET (security_invoker = on);

-- 6. Update existing transactions to set source_type where possible
UPDATE credit_transactions
SET source_type = 'training_session'
WHERE training_session_id IS NOT NULL AND source_type IS NULL;

UPDATE credit_transactions
SET source_type = 'sales_order'
WHERE product_id IS NOT NULL AND source_type IS NULL;

UPDATE credit_transactions
SET source_type = 'admin_panel'
WHERE type = 'manual' AND source_type IS NULL;

UPDATE credit_transactions
SET source_type = 'admin_panel'
WHERE type = 'payment' AND source_type IS NULL;