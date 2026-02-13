
# Automatická synchronizace kreditního zůstatku

## Problém
Aplikace ukládá kredit na dvou místech:
1. Sloupec `clients.credit_balance` (přímá hodnota)
2. Součet transakcí v tabulce `credit_transactions` (ledger)

Tyto dvě hodnoty se mohou rozejít, protože neexistuje žádný automatický mechanismus, který by je držel synchronizované. Seznam klientů a detail klienta pak mohou ukazovat různé částky.

## Řešení

### 1. Databázový trigger -- automatická synchronizace
Po každém INSERT nebo DELETE v `credit_transactions` se trigger automaticky přepočítá `clients.credit_balance` ze součtu transakcí. Tím bude sloupec vždy aktuální bez jakéhokoliv zásahu.

### 2. Oprava view `vw_client_ledger_balances`
Aktuální view počítá ledger_balance jako SUM(amount), ale zároveň obsahuje sloupec "discrepancy" porovnávající se s `credit_balance`. Po triggeru bude discrepancy vždy 0, ale view se zjednoduší, aby přímo vracela správný zůstatek.

### 3. Jednorázový přepočet existujících dat
SQL migrace provede přepočet všech klientů, aby aktuální hodnoty v `clients.credit_balance` odpovídaly součtu jejich transakcí.

---

## Technické detaily

### Nový trigger (SQL migrace)

```text
trigger: trg_sync_client_credit_balance
tabulka: credit_transactions
události: AFTER INSERT, DELETE, UPDATE
akce: přepočítá SUM(amount) pro daného client_id
      a zapíše výsledek do clients.credit_balance
```

Funkce triggeru:
- Při INSERT/UPDATE: vezme NEW.client_id
- Při DELETE: vezme OLD.client_id
- Spočítá SUM(amount) WHERE client_id = X AND status = 'completed' AND group_id IS NULL
- Zapíše výsledek do clients.credit_balance

### Jednorázový přepočet
Součástí migrace bude UPDATE, který srovná všechny existující zůstatky:

```text
UPDATE clients SET credit_balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM credit_transactions
  WHERE client_id = clients.id
    AND status = 'completed'
    AND group_id IS NULL
)
```

### Upravené soubory
- `src/hooks/useClients.ts` -- zjednodušení: nebude potřeba paralelně dotazovat view, protože `credit_balance` bude vždy správný. Ale pro bezpečnost ponecháme stávající logiku jako fallback.

Žádné další změny v komponentách nejsou potřeba -- všechny už čtou z `client.credit_balance`, který bude triggerem udržovaný aktuální.
