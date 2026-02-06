
# Oprava kreditového systému: Ledger jako jediný zdroj pravdy

## Identifikované problémy

### 1. UI používá špatný zdroj dat pro individuální klienty (KRITICKÉ)
V `ClientDetail.tsx` řádek 53:
```typescript
const creditBalance = isSharedBudget ? sharedBalance : (client?.credit_balance || 0);
```

**Problém:** Pro Tomáše Stibora (`isSharedBudget = false`):
- `sharedBalance = 4000` (správná hodnota z ledger view)
- `client?.credit_balance = 3200` (zastaralá hodnota z tabulky)
- UI zobrazuje **3200 Kč** místo správných **4000 Kč**

### 2. Trigger synchronizace selhává
`trg_sync_balance_on_transaction` se nespustil nebo selhal při dnešní transakci za 800 Kč. Důvod je nejasný - možná race condition s RPC lockem.

### 3. Šest klientů má diskrepance mezi uloženým zůstatkem a ledgerem
Celková nesrovnalost: ~21 000 Kč

### 4. Nejnovější transakce chybí v "Poslední pohyby"
Cache `staleTime: 30s` může způsobit, že nová transakce se nezobrazí okamžitě.

---

## Navrhované řešení

### Fáze 1: Okamžitá oprava UI (kritické)

**Změna v `src/pages/ClientDetail.tsx`:**
```typescript
// PŘED (řádek 53):
const creditBalance = isSharedBudget ? sharedBalance : (client?.credit_balance || 0);

// PO:
// Vždy použít sharedBalance z useSharedBudgetBalance hooku,
// který již vrací správnou hodnotu z ledger view
const creditBalance = sharedBudgetInfo?.sharedBalance ?? client?.credit_balance ?? 0;
```

**Vysvětlení:** Hook `useSharedBudgetBalance` již správně načítá `ledger_balance` z view `vw_client_ledger_balances` i pro individuální klienty. Stačí tedy vždy použít jeho hodnotu.

### Fáze 2: Oprava cache invalidation

**Změny v `src/hooks/useCreditOperations.ts`:**
```typescript
// Změna 1: Snížit staleTime pro kritická data
export function useCreditTransactions(clientId?: string) {
  return useQuery({
    queryKey: ["credit_transactions", clientId],
    staleTime: 5 * 1000, // Snížit z 30s na 5s
    // ...
  });
}

// Změna 2: Stejně pro useSharedBudgetBalance
export function useSharedBudgetBalance(clientId?: string) {
  return useQuery({
    // ...
    staleTime: 5 * 1000, // Snížit z 30s na 5s
  });
}
```

### Fáze 3: Jednorázová oprava diskrepancí (databáze)

SQL migrace pro opravu existujících diskrepancí:
```sql
-- Opravit individuální klienty
UPDATE clients c
SET credit_balance = ledger.ledger_balance
FROM vw_client_ledger_balances ledger
WHERE c.id = ledger.client_id
AND c.credit_balance != ledger.ledger_balance
AND NOT EXISTS (
  SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
);

-- Resetovat zůstatky členů skupin na 0 (neměli by mít osobní zůstatek)
UPDATE clients c
SET credit_balance = 0
WHERE EXISTS (
  SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id
)
AND c.credit_balance != 0;

-- Opravit skupinové zůstatky
UPDATE client_budget_groups cbg
SET shared_balance = ledger.ledger_balance
FROM vw_group_ledger_balances ledger
WHERE cbg.id = ledger.group_id
AND cbg.shared_balance != ledger.ledger_balance;
```

### Fáze 4: Posílit trigger (databáze)

Přepsat trigger s logováním pro diagnostiku:
```sql
CREATE OR REPLACE FUNCTION trg_sync_balance_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_old_balance numeric;
  v_new_balance numeric;
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
    UPDATE client_budget_groups
    SET shared_balance = shared_balance + NEW.amount,
        updated_at = now()
    WHERE id = v_group_id
    RETURNING shared_balance INTO v_new_balance;
    
    -- Log for debugging
    RAISE NOTICE 'Trigger: Updated group % balance by %, new balance: %', 
                  v_group_id, NEW.amount, v_new_balance;
  ELSE
    UPDATE clients
    SET credit_balance = credit_balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.client_id
    RETURNING credit_balance INTO v_new_balance;
    
    RAISE NOTICE 'Trigger: Updated client % balance by %, new balance: %', 
                  NEW.client_id, NEW.amount, v_new_balance;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### Fáze 5: Denní automatický audit (edge function)

Aktualizovat existující `daily-financial-audit` edge function pro automatickou opravu diskrepancí každou noc.

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/pages/ClientDetail.tsx` | Opravit výpočet `creditBalance` |
| `src/hooks/useCreditOperations.ts` | Snížit `staleTime` na 5s |
| Databáze (migrace) | Opravit existující diskrepance |
| Databáze (migrace) | Posílit trigger s logováním |

---

## Očekávaný výsledek

Po implementaci:
- ✅ Tomáš Stibor zobrazí správných 4000 Kč
- ✅ Dnešní trénink se zobrazí v "Poslední pohyby"
- ✅ Všech 6 klientů s diskrepancí bude opraveno
- ✅ Budoucí transakce budou správně reflektovány v UI
- ✅ Automatický audit každou noc detekuje a opraví problémy

---

## Technické poznámky

- Ledger (view `vw_client_ledger_balances`) je **jediný spolehlivý zdroj pravdy**
- Uložené `credit_balance` sloupce slouží pouze jako cache pro rychlé čtení
- Cache invalidation je kritická - `refetchType: 'all'` v `useCompleteTrainingAtomic` již funguje správně
- Problém Tomáše Stibora je způsoben tím, že UI čte ze špatného zdroje, ne že data by neexistovala
