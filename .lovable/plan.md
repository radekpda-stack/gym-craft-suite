
# Oprava dvojitého započítání kreditu při dobíjení

## Příčina problému
Při dobíjení kreditu přes `rpc_add_credit_lot` dochází k **dvojímu navýšení zůstatku**:

1. **RPC funkce** (`rpc_add_credit_lot`, řádky 62-73) přímo aktualizuje `shared_balance`
2. **Trigger** (`sync_balance_after_transaction`) se spustí po INSERT do `credit_transactions` a ZNOVU přidá částku

Skupina "Rom" má:
- Skutečný součet transakcí: **10 200 Kč**
- Uložený zůstatek: **20 200 Kč**
- Nesoulad: **10 000 Kč** (= duplicitní započítání)

## Řešení

### Krok 1: Opravit RPC funkci `rpc_add_credit_lot`
Odstranit manuální UPDATE zůstatku, protože trigger to již dělá automaticky.

**Soubor:** Nová migrace

```sql
CREATE OR REPLACE FUNCTION public.rpc_add_credit_lot(...)
AS $$
...
  -- Create credit_transaction for ledger tracking
  -- Trigger 'sync_balance_after_transaction' will auto-update balance
  INSERT INTO public.credit_transactions (...);
  
  -- ODSTRANIT tyto řádky (62-73):
  -- IF v_group_id IS NOT NULL THEN
  --   UPDATE public.client_budget_groups SET shared_balance = ...
  -- ELSE
  --   UPDATE public.clients SET credit_balance = ...
  -- END IF;
...
$$;
```

### Krok 2: Opravit stávající data
Spustit rekonciliaci pro všechny skupiny s nesouladem:

```sql
-- Opravit skupinu "Rom"
UPDATE client_budget_groups 
SET shared_balance = 10200 
WHERE id = 'ea89a870-cabc-4997-955e-63299b3ec0f9';

-- Opravit skupinu "Dolák" (discrepancy 500)
UPDATE client_budget_groups 
SET shared_balance = 2065 
WHERE id = '3e422ba8-7e8c-4af0-a12f-8ef270692281';

-- Opravit skupinu "Kou" (discrepancy 800)  
UPDATE client_budget_groups
SET shared_balance = 4800
WHERE id = '018fe8e4-3c52-483d-b88f-f370cef4936c';
```

### Krok 3: Přidat prevenci do triggeru
Přidat kontrolu `source_type`, aby se zabránilo dvojímu počítání v budoucnu.

## Technické shrnutí

| Soubor | Změna |
|--------|-------|
| Nová SQL migrace | Oprava `rpc_add_credit_lot` - odstranění duplicitního UPDATE |
| Nová SQL migrace | Korekce zůstatků skupin Rom, Dolák, Kou |

## Výsledek
- Roman Lázinka uvidí správný zůstatek **10 200 Kč** (nebo aktuální hodnotu po dalších transakcích)
- Další dobíjení kreditu nebudou duplicitně počítána
