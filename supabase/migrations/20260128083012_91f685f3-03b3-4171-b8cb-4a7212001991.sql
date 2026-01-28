
-- ============================================================
-- OPRAVA: Trigger pro hlídání fixace musí sledovat credit_transactions
-- ============================================================

-- 1. Nová verze funkce check_and_disable_legacy_pricing
-- která se spustí při INSERT do credit_transactions
CREATE OR REPLACE FUNCTION public.check_legacy_pricing_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_client RECORD;
  v_total_consumed NUMERIC;
  v_remaining_grandfathered NUMERIC;
  v_min_training_price NUMERIC := 800;
BEGIN
  -- Pouze pro záporné transakce (čerpání)
  IF NEW.amount >= 0 THEN
    RETURN NEW;
  END IF;

  -- Zjisti, jestli má klient aktivní fixaci
  SELECT 
    use_legacy_pricing,
    grandfathered_credit,
    grandfathered_at
  INTO v_client
  FROM clients
  WHERE id = NEW.client_id;
  
  -- Pokud nemá fixaci, nic nedělej
  IF NOT v_client.use_legacy_pricing OR v_client.grandfathered_credit IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Spočítej celkové čerpání od aktivace fixace (z credit_transactions)
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_total_consumed
  FROM credit_transactions
  WHERE client_id = NEW.client_id
    AND amount < 0
    AND created_at >= v_client.grandfathered_at;
  
  -- Zbývající kredit na fixaci
  v_remaining_grandfathered := v_client.grandfathered_credit - v_total_consumed;
  
  -- Vypni fixaci pokud:
  -- 1. Vyčerpáno (spotřeba >= fixovaná částka)
  -- 2. Zbývá méně než minimální cena tréninku
  IF v_total_consumed >= v_client.grandfathered_credit 
     OR v_remaining_grandfathered < v_min_training_price THEN
    UPDATE clients 
    SET use_legacy_pricing = false
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger na credit_transactions místo credit_consumptions
DROP TRIGGER IF EXISTS tr_check_legacy_pricing_on_transaction ON credit_transactions;
CREATE TRIGGER tr_check_legacy_pricing_on_transaction
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION check_legacy_pricing_on_transaction();

-- 3. Starý trigger na credit_consumptions můžeme ponechat jako backup
-- ale hlavní logika teď běží na credit_transactions
