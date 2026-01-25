

# Plán: Kořenová analýza a náprava finančních nesouladů

## 1. IDENTIFIKACE CHYB (ROOT CAUSE ANALYSIS)

### A) Rozdíly stored_balance vs ledger_balance (7 klientů)

| Klient | Stored | Ledger | Rozdíl | Příčina |
|--------|--------|--------|--------|---------|
| Zbyšek Žemlík | 0 | 1000 | -1000 | Transakce bez aktualizace balance |
| Barbora Vopavová | 7700 | 8700 | -1000 | Dobití 10000 → balance navýšen pouze o 9000 |
| Lenka Deiak | 2400 | 3200 | -800 | Chybějící delta update |
| Alena Jílková | 2400 | 3200 | -800 | Chybějící delta update |
| Parezová Martina | 12100 | 12900 | -800 | Chybějící delta update |
| Dominik Toman | 1400 | 2200 | -800 | Chybějící delta update |
| Tomáš Stibor | 6400 | 7200 | -800 | Chybějící delta update |

**Typ chyby**: TRANSAKČNÍ
**Lokace**: Volání `applyCreditDelta()` po insertu do `credit_transactions`
**Příčina**: 
1. Transakce byla vytvořena (INSERT do ledgeru)
2. Následné volání `applyCreditDelta()` selhalo nebo neproběhlo
3. Neexistuje databázový trigger, který by atomicky spojil obě operace

**Důkaz z auditu**:
```text
Barbora Vopavová:
- Ledger transakce: +10000, -800, -500 = 8700 Kč
- Stored balance: 7700 Kč
- Rozdíl: 1000 Kč (= jeden chybějící delta update)
```

---

### B) Záporný skupinový kredit (Kok: -3793 Kč)

**Typ chyby**: LOGICKÁ (legitimní stav)
**Lokace**: `client_budget_groups.shared_balance`
**Příčina**: Skupina čerpá kredit bez dostatečného předdobití

**Transakční ledger skupiny Kok**:
| Typ | Počet | Suma |
|-----|-------|------|
| payment (top-up) | 1 | +20 000 Kč |
| training | 27 | -22 000 Kč |
| canceled_training | 2 | -1 600 Kč |
| product | 5 | -193 Kč |
| **CELKEM** | | **-3 793 Kč** |

**Závěr**: Záporný zůstatek je korektní - klient "dluží" trenérovi. Stored balance (-3793) = Ledger balance (-3793). Není to chyba v datech, je to pohledávka (A/R).

---

### C) Produkty: Rozdíl mezi evidencemi

**Zjištění z auditu**:
| Zdroj | Počet | Částka |
|-------|-------|--------|
| `credit_transactions` (type=product) | 46 | 16 460 Kč |
| `sales_orders` | 55 | 13 648 Kč |

**Typ chyby**: ŠPATNÁ DEFINICE METRIKY + DUPLICITNÍ ZDROJE
**Lokace**: Dvě různé tabulky pro produkty

**Příčina**:
1. `credit_transactions` obsahuje POUZE prodeje platbou z kreditu
2. `sales_orders` obsahuje VŠECHNY prodeje (kredit, hotovost, karta)
3. `sales_orders.total_amount` zahrnuje slevy, `credit_transactions.amount` je absolutní odečet

**Rozpad z sales_orders**:
| Platební metoda | Počet | Částka |
|-----------------|-------|--------|
| credit | 31 | 11 479 Kč |
| cash | 22 | 2 111 Kč |
| card | 2 | 58 Kč |

**Závěr**: `sales_orders` je správný zdroj pro tržby za produkty. `credit_transactions` jsou pouze záznamy o spotřebě kreditu.

---

## 2. JEDINÝ ZDROJ PRAVDY (LEDGER ARCHITECTURE)

### Cílový stav

```text
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                   │
│                                                             │
│     credit_transactions                                     │
│     ├── client_id                                          │
│     ├── group_id (nullable - set by trigger)               │
│     ├── amount (+/-)                                       │
│     ├── type (payment/training/product/manual/transfer)    │
│     └── status (completed)                                 │
│                                                             │
│     VZOREC PRO BALANCE:                                     │
│     individual: SUM(amount) WHERE client_id=X AND group_id IS NULL │
│     group: SUM(amount) WHERE client_id IN (group_members)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               MATERIALIZED CACHE (OPTIONAL)                 │
│                                                             │
│     clients.credit_balance         = cached value          │
│     client_budget_groups.shared_balance = cached value     │
│                                                             │
│     RULE: Pouze pro rychlé zobrazení v UI                  │
│     SYNC: Automaticky přes trigger AFTER INSERT/UPDATE     │
└─────────────────────────────────────────────────────────────┘
```

### Zabránění rozdílům stored vs ledger

**Řešení A (doporučeno): Database Trigger**

Vytvořit trigger `AFTER INSERT ON credit_transactions`, který automaticky aktualizuje stored_balance:

```sql
CREATE OR REPLACE FUNCTION trg_sync_balance_on_transaction()
RETURNS trigger AS $$
DECLARE
  v_group_id uuid;
BEGIN
  -- Check if client is in a group
  SELECT group_id INTO v_group_id
  FROM client_budget_members
  WHERE client_id = NEW.client_id;
  
  IF v_group_id IS NOT NULL THEN
    -- Update group balance
    UPDATE client_budget_groups
    SET shared_balance = shared_balance + NEW.amount
    WHERE id = v_group_id;
  ELSE
    -- Update individual balance
    UPDATE clients
    SET credit_balance = credit_balance + NEW.amount
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_balance_after_transaction
AFTER INSERT ON credit_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trg_sync_balance_on_transaction();
```

**Řešení B: Odstranění stored_balance**

Vypočítávat balance vždy z ledgeru pomocí VIEW:

```sql
-- Nahradit clients.credit_balance
CREATE VIEW vw_client_effective_balance AS
SELECT 
  c.id,
  c.name,
  CASE 
    WHEN cbm.group_id IS NOT NULL THEN 0  -- Group member
    ELSE COALESCE(SUM(ct.amount), 0)
  END as effective_balance
FROM clients c
LEFT JOIN client_budget_members cbm ON cbm.client_id = c.id
LEFT JOIN credit_transactions ct ON ct.client_id = c.id AND ct.group_id IS NULL
GROUP BY c.id, c.name, cbm.group_id;
```

**Doporučení**: Implementovat Řešení A (trigger) pro zachování kompatibility s existujícím kódem.

---

### Manuální korekce - jednotný mechanismus

**Aktuální problém**: 60+ transakcí s popisem "Chyba" bez strukturovaných dat.

**Řešení**: Vytvořit strukturovanou tabulku pro korekce:

```sql
CREATE TABLE credit_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES credit_transactions(id),
  reason_code text NOT NULL, -- 'app_error', 'double_charge', 'missing_payment', 'manual_adjustment'
  reason_detail text,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

**Pravidlo**: Všechny korekce MUSÍ projít přes `type = 'manual'` s validním `reason_code`.

---

## 3. OPRAVA EXISTUJÍCÍCH DAT

### A) Klienti (7 s rozdílem)

**Krok 1: Spustit existující RPC funkci**

Funkce `rpc_recalculate_all_balances()` již existuje a správně přepočítá všechny balance z ledgeru.

```sql
SELECT rpc_recalculate_all_balances();
```

Očekávaný výstup:
```json
{
  "success": true,
  "clients_fixed": 7,
  "groups_fixed": 0,
  "transactions_linked": 0
}
```

**Krok 2: Ověřit opravu**

```sql
SELECT * FROM vw_client_ledger_balances WHERE discrepancy != 0;
-- Měl by vrátit 0 řádků
```

**Audit log**: Výsledek RPC funkce obsahuje timestamp a počet opravených záznamů.

---

### B) Skupina "Kok" (záporný kredit -3793 Kč)

**Rozhodnutí**: Záporný zůstatek je VALIDNÍ stav (pohledávka).

**Možnosti řešení**:

| Možnost | Popis | Akce |
|---------|-------|------|
| 1. Ponechat | Evidovat jako pohledávku | Žádná změna, zobrazit v dashboardu jako A/R |
| 2. Top-up | Klient doplatí | Přidat platbu +3793 Kč |
| 3. Odpis | Trenér odpíše dluh | Manuální korekce +3793 Kč s reason='debt_writeoff' |

**Doporučení**: Možnost 1 - ponechat a zobrazit jako pohledávku v dashboardu.

**Implementace overdraft limitu (volitelné)**:

```sql
ALTER TABLE client_budget_groups 
ADD COLUMN overdraft_limit numeric DEFAULT 0;

-- Validační trigger
CREATE OR REPLACE FUNCTION check_overdraft_limit()
RETURNS trigger AS $$
BEGIN
  IF NEW.shared_balance < -COALESCE(NEW.overdraft_limit, 0) THEN
    RAISE EXCEPTION 'Překročen overdraft limit skupiny';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### C) Produkty - jednotná definice

**Zdroj pravdy pro metriky**:

| Metrika | Zdroj | Definice |
|---------|-------|----------|
| **product_revenue** | `sales_orders.total_amount` | Celková tržba za produkty (po slevách) |
| **product_cost** | `sales_order_items.cost_price * quantity` | Nákladová cena |
| **product_margin** | revenue - cost | Marže |
| **product_cash_in** | `sales_orders WHERE payment_method IN ('cash','card','bank')` | Inkaso mimo kredit |
| **credit_deduction** | `credit_transactions WHERE type='product'` | Spotřeba závazku (kreditu) |

**SQL VIEW pro reporty**:

```sql
CREATE OR REPLACE VIEW vw_product_sales_report AS
SELECT 
  so.id as order_id,
  so.created_at,
  c.name as client_name,
  so.total_amount as revenue,
  COALESCE(SUM(soi.cost_price * soi.quantity), 0) as cost,
  so.total_amount - COALESCE(SUM(soi.cost_price * soi.quantity), 0) as margin,
  so.payment_method,
  CASE 
    WHEN so.payment_method = 'credit' THEN 0
    ELSE so.total_amount
  END as cash_inflow,
  CASE 
    WHEN so.payment_method = 'credit' THEN so.total_amount
    ELSE 0
  END as credit_used
FROM sales_orders so
LEFT JOIN clients c ON c.id = so.client_id
LEFT JOIN sales_order_items soi ON soi.order_id = so.id
GROUP BY so.id, so.created_at, c.name, so.total_amount, so.payment_method;
```

---

## 4. PREVENTIVNÍ PRAVIDLA (CONSTRAINTS)

### Databázová pravidla

```sql
-- 1. Zákaz mazání transakcí
REVOKE DELETE ON credit_transactions FROM authenticated;
-- Místo DELETE použít storno transakci (reversal)

-- 2. Povinná pole pro transakce
ALTER TABLE credit_transactions
ALTER COLUMN client_id SET NOT NULL,
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN type SET NOT NULL;

-- 3. Check constraint pro type
ALTER TABLE credit_transactions
ADD CONSTRAINT valid_transaction_type 
CHECK (type IN ('payment', 'training', 'product', 'manual', 'transfer', 'canceled_training', 'refund'));

-- 4. Audit fields
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS source_type text, -- 'training_session', 'sales_order', 'admin_panel'
ADD COLUMN IF NOT EXISTS source_id uuid,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
```

### Aplikační pravidla

| Pravidlo | Implementace |
|----------|--------------|
| Zákaz přímého DELETE | RLS policy + app logic |
| Storno = reversal transakce | Create opposite transaction with `type='refund'` |
| Manuální korekce | Vyžaduje `reason_code` z enum |
| Každá transakce má zdroj | `source_type` + `source_id` jsou povinné |

---

## 5. VALIDACE & ALERTY

### Automatické kontroly

**1. Denní kontrola discrepancies (scheduled function)**

```sql
-- Edge function scheduled at 02:00
SELECT * FROM rpc_get_balance_discrepancies();
-- Pokud vrátí > 0 discrepancies, odeslat alert
```

**2. Realtime trigger pro záporný zůstatek**

```sql
CREATE OR REPLACE FUNCTION notify_negative_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.shared_balance < -1000 THEN  -- Alert při dluhu > 1000 Kč
    -- Insert do notification table nebo webhook
    INSERT INTO system_alerts (type, message, entity_id)
    VALUES ('negative_balance', 
            format('Skupina %s má dluh %.0f Kč', NEW.name, ABS(NEW.shared_balance)),
            NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**3. Kontrola produktů v reportu**

```sql
-- Validace: SUM(sales_orders credit) = SUM(credit_transactions product)
SELECT 
  (SELECT SUM(total_amount) FROM sales_orders WHERE payment_method = 'credit') as orders_credit,
  (SELECT SUM(ABS(amount)) FROM credit_transactions WHERE type = 'product') as tx_credit,
  (SELECT SUM(total_amount) FROM sales_orders WHERE payment_method = 'credit') -
  (SELECT SUM(ABS(amount)) FROM credit_transactions WHERE type = 'product') as difference;
-- Pokud difference != 0 → alert
```

### Zobrazení v UI

| Kontrola | Lokace | Akce |
|----------|--------|------|
| Balance discrepancy | `/settings` → CreditAuditPanel | Badge "X diskrepancí" + tlačítko "Opravit" |
| Záporný zůstatek | Dashboard → FinanceSummaryCard | Červený badge "Pohledávky: X Kč" |
| Produkty mismatch | Nový alert v settings | Warning ikona s detailem |

---

## 6. FINÁLNÍ METRIKY PRO REPORTY

### A) CASHFLOW (přijaté peníze)

**Definice**: Skutečně přijaté peníze na účet nebo v hotovosti.

```sql
SELECT 
  -- Dobití kreditu (cash, card, bank)
  SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as credit_topups,
  
  -- Přímé platby za tréninky (cash, card, bank - bez kreditu)
  SUM(CASE WHEN type = 'training' AND payment_method IN ('cash', 'card', 'bank') 
      THEN ABS(amount) ELSE 0 END) as direct_training_payments,
      
  -- Prodeje za hotovost/kartu
  (SELECT SUM(total_amount) FROM sales_orders 
   WHERE payment_method IN ('cash', 'card', 'bank')) as product_cash
   
FROM credit_transactions
WHERE type IN ('payment', 'training');
```

**Co NESMÍ vstupovat**: Platby z kreditu (ty jsou spotřebou závazku, ne příjmem).

---

### B) VÝNOSY (accrual basis)

**Definice**: Hodnota dodaných služeb a prodaných produktů.

```sql
SELECT
  -- Odtrénované hodiny
  SUM(ts.final_price) as training_revenue,
  
  -- Prodané produkty
  (SELECT SUM(total_amount) FROM sales_orders) as product_revenue
  
FROM training_sessions ts
WHERE ts.status = 'completed';
```

**Co NESMÍ vstupovat**: Způsob platby (nezáleží zda kredit nebo cash).

---

### C) ZÁVAZKY (liabilities)

**Definice**: Předplacené služby, které ještě nebyly dodány.

```sql
-- Neodtrénovaný kredit
SELECT 
  CASE 
    WHEN cbm.group_id IS NOT NULL THEN 'group'
    ELSE 'individual'
  END as entity_type,
  COALESCE(cbg.name, c.name) as entity_name,
  CASE 
    WHEN cbm.group_id IS NOT NULL THEN cbg.shared_balance
    ELSE c.credit_balance
  END as unearned_credit
FROM clients c
LEFT JOIN client_budget_members cbm ON cbm.client_id = c.id
LEFT JOIN client_budget_groups cbg ON cbg.id = cbm.group_id
WHERE (c.credit_balance > 0 OR cbg.shared_balance > 0);
```

**Co NESMÍ vstupovat**: Záporné zůstatky (to jsou pohledávky, ne závazky).

---

## 7. TEST CHECKLIST

### Po implementaci spustit následující kontroly:

```text
☐ 1. BALANCE INTEGRITY
   └─ SELECT COUNT(*) FROM vw_client_ledger_balances WHERE discrepancy != 0;
   └─ Očekáváno: 0

☐ 2. GROUP BALANCES  
   └─ SELECT COUNT(*) FROM vw_group_ledger_balances WHERE discrepancy != 0;
   └─ Očekáváno: 0

☐ 3. NO ORPHANED TRANSACTIONS
   └─ SELECT COUNT(*) FROM credit_transactions ct
      JOIN client_budget_members cbm ON ct.client_id = cbm.client_id
      WHERE ct.group_id IS NULL;
   └─ Očekáváno: 0

☐ 4. CREDIT EQUATION
   └─ SUM(payment topups) = SUM(kredit spotřebován) + SUM(aktuální zůstatky)
   └─ Rozdíl by měl být 0

☐ 5. PRODUCT CONSISTENCY
   └─ SUM(sales_orders WHERE credit) = SUM(credit_transactions WHERE product)
   └─ Rozdíl by měl být blízko 0 (tolerance na slevy)

☐ 6. REPRODUCIBILITY
   └─ Spustit report za prosinec 2025 dvakrát
   └─ Obě čísla musí být identická

☐ 7. TRIGGER TEST
   └─ INSERT novou transakci
   └─ Ověřit, že stored_balance se automaticky aktualizoval
```

---

## IMPLEMENTAČNÍ KROKY

| Krok | Priorita | Popis | Soubory |
|------|----------|-------|---------|
| 1 | KRITICKÁ | Spustit `rpc_recalculate_all_balances()` | SQL konzole |
| 2 | KRITICKÁ | Přidat trigger pro auto-sync balance | Nová migrace |
| 3 | VYSOKÁ | Přidat `source_type`, `source_id` do credit_transactions | Nová migrace |
| 4 | VYSOKÁ | Upravit `useCreateTransaction` - přidat source metadata | `useCreditOperations.ts` |
| 5 | STŘEDNÍ | Vytvořit `vw_product_sales_report` view | Nová migrace |
| 6 | STŘEDNÍ | Přidat dashboard alert pro záporné zůstatky | `FinanceSummaryCard.tsx` |
| 7 | NÍZKÁ | Scheduled edge function pro denní audit | Nová edge function |

