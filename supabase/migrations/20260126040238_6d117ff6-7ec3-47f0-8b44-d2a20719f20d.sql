-- ============================================================
-- Migrace: Oprava fixace ceny pro přechod na nový ceník 1.2.2026
-- ============================================================

-- KROK 1: Vytvořit chybějící trigger pro automatické vypnutí fixace
-- ============================================================
-- Trigger se spustí po každé spotřebě kreditu a zkontroluje,
-- zda klient vyčerpal svůj fixovaný kredit

DROP TRIGGER IF EXISTS tr_check_legacy_pricing_exhausted ON credit_consumptions;

CREATE TRIGGER tr_check_legacy_pricing_exhausted
AFTER INSERT ON credit_consumptions
FOR EACH ROW
EXECUTE FUNCTION check_and_disable_legacy_pricing();

-- KROK 2: Nastavit správné ceny v app_settings
-- ============================================================
-- Nové ceny (platí pro klienty BEZ fixace): 900/1100/1300 Kč
-- Staré ceny (platí pro klienty S fixací): 800/1000/1200 Kč

-- Aktualizovat training_prices na nové ceny
UPDATE app_settings 
SET value = '{"1": 900, "2": 1100, "3": 1300, "first_training": 1000}'::jsonb,
    updated_at = now()
WHERE key = 'training_prices';

-- Vložit legacy_training_prices se starými cenami (pro každého uživatele, který má training_prices)
INSERT INTO app_settings (key, value, user_id, updated_at)
SELECT 
  'legacy_training_prices' as key,
  '{"1": 800, "2": 1000, "3": 1200}'::jsonb as value,
  user_id,
  now() as updated_at
FROM app_settings
WHERE key = 'training_prices'
ON CONFLICT (key, user_id) DO UPDATE SET 
  value = '{"1": 800, "2": 1000, "3": 1200}'::jsonb,
  updated_at = now();

-- Zapnout price_transition_enabled
INSERT INTO app_settings (key, value, user_id, updated_at)
SELECT 
  'price_transition_enabled' as key,
  'true'::jsonb as value,
  user_id,
  now() as updated_at
FROM app_settings
WHERE key = 'training_prices'
ON CONFLICT (key, user_id) DO UPDATE SET 
  value = 'true'::jsonb,
  updated_at = now();

-- KROK 3: Opravit nekonzistentní data klientů
-- ============================================================
-- Klienti s use_legacy_pricing=true ale bez grandfathered_credit
-- potřebují mít grandfathered_credit nastaveno na jejich aktuální zůstatek

UPDATE clients 
SET 
  grandfathered_credit = credit_balance,
  grandfathered_at = now()
WHERE use_legacy_pricing = true 
  AND grandfathered_credit IS NULL
  AND credit_balance > 0;

-- Opravit konkrétně Zuzku Kratochvílovou, pokud ještě není opravena
UPDATE clients 
SET 
  grandfathered_credit = credit_balance,
  grandfathered_at = now()
WHERE id = '446748ff-adbd-482d-8a20-415ed808b51e' 
  AND grandfathered_credit IS NULL;