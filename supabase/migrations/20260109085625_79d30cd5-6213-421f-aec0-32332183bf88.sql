-- Trigger pro automatické vypnutí legacy pricing při vyčerpání grandfathered_credit

-- Funkce pro kontrolu a automatické vypnutí legacy pricing
CREATE OR REPLACE FUNCTION public.check_and_disable_legacy_pricing()
RETURNS TRIGGER AS $$
DECLARE
  v_grandfathered_credit NUMERIC;
  v_grandfathered_at TIMESTAMPTZ;
  v_use_legacy_pricing BOOLEAN;
  v_total_consumed NUMERIC;
  v_client_id UUID;
BEGIN
  v_client_id := NEW.client_id;
  
  -- Získat grandfathered nastavení klienta
  SELECT grandfathered_credit, grandfathered_at, use_legacy_pricing
  INTO v_grandfathered_credit, v_grandfathered_at, v_use_legacy_pricing
  FROM clients WHERE id = v_client_id;
  
  -- Pokud není fixace aktivní nebo není nastavena částka, nic nedělat
  IF NOT v_use_legacy_pricing OR v_grandfathered_credit IS NULL OR v_grandfathered_at IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Spočítat celkové čerpání od grandfathered_at
  SELECT COALESCE(SUM(amount_czk), 0) INTO v_total_consumed
  FROM credit_consumptions
  WHERE client_id = v_client_id
    AND created_at >= v_grandfathered_at;
  
  -- Pokud vyčerpáno, vypnout legacy pricing
  IF v_total_consumed >= v_grandfathered_credit THEN
    UPDATE clients 
    SET use_legacy_pricing = false
    WHERE id = v_client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger po vložení nové spotřeby kreditu
DROP TRIGGER IF EXISTS tr_check_legacy_pricing_exhausted ON credit_consumptions;
CREATE TRIGGER tr_check_legacy_pricing_exhausted
AFTER INSERT ON credit_consumptions
FOR EACH ROW
EXECUTE FUNCTION check_and_disable_legacy_pricing();