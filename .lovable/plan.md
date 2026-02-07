
# Kompletní přepracování kreditového systému

## Executive Summary

Navrhovaný redesign kreditového systému zavádí **Event Sourcing architekturu** s jedním zdrojem pravdy (ledger), real-time WebSocket synchronizací a 100% konzistencí mezi všemi obrazovkami. Cílem je eliminovat všechny diskrepance, prodlevy a chyby.

---

## Současný stav a identifikované problémy

### Architektura (aktuální)
```text
┌─────────────────────────────────────────────────────────────────┐
│                     DUÁLNÍ ZDROJ DAT                            │
├─────────────────────────────────────────────────────────────────┤
│  Cached Balance              │  Ledger (Transakce)              │
│  ─────────────────────────   │  ──────────────────────────────  │
│  clients.credit_balance      │  credit_transactions (SUM)       │
│  groups.shared_balance       │  vw_client_ledger_balances       │
│                              │  vw_group_ledger_balances        │
├─────────────────────────────────────────────────────────────────┤
│  SYNCHRONIZACE: trigger + ruční opravy                          │
│  PROBLÉM: Trigger občas selže → diskrepance                     │
└─────────────────────────────────────────────────────────────────┘
```

### Identifikované problémy

1. **Duální zdroj pravdy** 
   - `clients.credit_balance` vs `vw_client_ledger_balances.ledger_balance`
   - Trigger `trg_sync_balance_on_transaction` občas selže
   - UI někdy čte z cache, jindy z ledgeru → nekonzistence

2. **Prodlevy v aktualizaci**
   - `staleTime: 5s` stále může způsobit 5s zpoždění
   - Žádná real-time synchronizace mezi zařízeními
   - Po dokončení tréninku může UI zobrazit starý zůstatek

3. **Složitost operací**
   - `rpc_complete_training_session` - 250 řádků SQL
   - `rpc_process_sale` - 366 řádků SQL
   - Každá operace duplikuje logiku aktualizace zůstatku

4. **Chybějící audit trail**
   - Transakce nemají `source_type` + `source_id` pro všechny případy
   - Těžké dohledat, odkud přišla transakce

5. **Klientský portál**
   - Načítá data odděleně od admin UI
   - Může zobrazit jiný zůstatek než trenér vidí

---

## Navrhovaná architektura

### Princip: Event Sourcing + CQRS

```text
┌─────────────────────────────────────────────────────────────────┐
│                   NOVÁ ARCHITEKTURA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              COMMAND: Operace                            │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │  • rpc_credit_add (dobití)                               │   │
│   │  • rpc_credit_deduct (trénink, prodej)                   │   │
│   │  • rpc_credit_refund (zrušení, vratka)                   │   │
│   │  • rpc_credit_transfer (převod mezi účty)                │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │           EVENT LOG: credit_transactions                 │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │  Jediný zdroj pravdy (immutable)                        │   │
│   │  Každá operace = 1 INSERT                               │   │
│   │  Žádné UPDATE/DELETE na transakce                       │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│            ┌─────────────┴─────────────┐                        │
│            │     TRIGGER               │                        │
│            │  trg_broadcast_credit     │                        │
│            └─────────────┬─────────────┘                        │
│                          │                                       │
│            ┌─────────────┴─────────────┐                        │
│            ▼                           ▼                        │
│   ┌─────────────────────┐   ┌─────────────────────┐             │
│   │  MATERIALIZED VIEW  │   │  REALTIME BROADCAST │             │
│   │  mv_credit_balances │   │  WebSocket → UI     │             │
│   │  (refresh: 1min)    │   │  (instant update)   │             │
│   └─────────────────────┘   └─────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fáze 1: Jednotné RPC API pro kredit

### Nové RPC funkce

Nahradit všechny různé způsoby práce s kreditem **4 atomickými operacemi**:

```sql
-- 1. DOBITÍ KREDITU
CREATE FUNCTION rpc_credit_add(
  p_client_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,  -- cash, card, bank, transfer
  p_description TEXT DEFAULT NULL,
  p_sale_order_id UUID DEFAULT NULL
) RETURNS JSONB;

-- 2. ODEČTENÍ KREDITU (trénink, prodej)
CREATE FUNCTION rpc_credit_deduct(
  p_client_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,     -- training, sale, package
  p_source_id UUID,       -- training_session.id nebo sales_order.id
  p_description TEXT DEFAULT NULL
) RETURNS JSONB;

-- 3. REFUND/VRATKA (zrušený trénink, storno)
CREATE FUNCTION rpc_credit_refund(
  p_original_transaction_id UUID,
  p_reason TEXT
) RETURNS JSONB;

-- 4. PŘEVOD (osobní → skupinový, mezi klienty)
CREATE FUNCTION rpc_credit_transfer(
  p_from_client_id UUID,
  p_to_client_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
) RETURNS JSONB;
```

### Struktura návratové hodnoty

```typescript
interface CreditOperationResult {
  success: boolean;
  transaction_id: string;
  // Nový zůstatek
  balance: {
    entity_type: 'client' | 'group';
    entity_id: string;
    entity_name: string;
    new_balance: number;
    delta: number;
  };
  // Pro UI notifikace
  message: string;
  // Timestamp pro audit
  timestamp: string;
}
```

---

## Fáze 2: Rozšířená tabulka transakcí

### Migrace: Přidat audit sloupce

```sql
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  source_type TEXT CHECK (source_type IN (
    'training_session',
    'sales_order',
    'admin_panel',
    'system_audit',
    'refund',
    'transfer',
    'migration'
  ));

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  source_id UUID;

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  idempotency_key TEXT UNIQUE;

ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS
  balance_after NUMERIC;  -- Running balance pro instant display

-- Index pro rychlé vyhledávání
CREATE INDEX idx_credit_transactions_source
  ON credit_transactions(source_type, source_id);
```

### Running Balance (klíčová optimalizace)

Každá transakce si ukládá `balance_after` - zůstatek po provedení. Tím odpadá nutnost počítat SUM při každém čtení.

```sql
-- Trigger pro automatický výpočet running balance
CREATE OR REPLACE FUNCTION trg_set_running_balance()
RETURNS trigger AS $$
DECLARE
  v_previous_balance NUMERIC;
BEGIN
  -- Získat poslední zůstatek pro danou entitu
  SELECT balance_after INTO v_previous_balance
  FROM credit_transactions
  WHERE (
    (NEW.group_id IS NOT NULL AND group_id = NEW.group_id) OR
    (NEW.group_id IS NULL AND client_id = NEW.client_id AND group_id IS NULL)
  )
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  
  NEW.balance_after := COALESCE(v_previous_balance, 0) + NEW.amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Fáze 3: Real-time synchronizace

### Supabase Realtime

```sql
-- Povolit realtime pro credit_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;
```

### Frontend hook: useCreditRealtime

```typescript
export function useCreditRealtime(clientId: string | undefined) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!clientId) return;
    
    const channel = supabase
      .channel(`credit:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          // Okamžitá aktualizace UI bez refetch
          const newTx = payload.new as CreditTransaction;
          
          // Update cache optimisticky
          queryClient.setQueryData(
            ['credit_transactions', clientId],
            (old: CreditTransaction[] = []) => [newTx, ...old]
          );
          
          // Update balance okamžitě z balance_after
          queryClient.setQueryData(
            ['shared_budget_balance', clientId],
            (old: SharedBudgetInfo) => ({
              ...old,
              sharedBalance: newTx.balance_after,
              displayBalance: newTx.balance_after,
            })
          );
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);
}
```

---

## Fáze 4: Zjednodušení completion flow

### Současný stav (složitý)

```text
useCompleteTrainingAtomic
    │
    ├── 1. supabase.rpc('rpc_complete_training_session')
    │       └── 250 řádků SQL
    │           ├── Loop přes účastníky
    │           ├── INSERT credit_transactions (každý účastník)
    │           ├── UPDATE training_sessions
    │           └── UPDATE training_participants
    │
    ├── 2. POST-UPDATE: Loop přes účastníky (frontend)
    │       └── UPDATE training_participants.payment_method
    │
    ├── 3. FIFO Credit Lots (volitelně)
    │       └── supabase.rpc('rpc_deduct_credit_fifo')
    │
    └── 4. Sync workout entries
            └── syncWorkoutEntriesToStats()
```

### Nový stav (zjednodušený)

```text
useCompleteTraining
    │
    └── supabase.rpc('rpc_complete_training_v2')
            │
            ├── 1. Validate (session exists, not completed)
            ├── 2. INSERT participants s price_share
            ├── 3. FOR each credit participant:
            │       └── CALL rpc_credit_deduct()
            ├── 4. UPDATE session status
            └── 5. RETURN {success, balances, transactions}
            
        [Trigger automatically broadcasts to Realtime]
```

---

## Fáze 5: Odstranění cached balance sloupců

### Migrační strategie

1. **Fáze A (nyní)**: UI čte pouze z `balance_after` v poslední transakci
2. **Fáze B (za měsíc)**: Deprecate `clients.credit_balance`
3. **Fáze C (za 3 měsíce)**: Drop column

```sql
-- Fáze A: View pro kompatibilitu
CREATE OR REPLACE VIEW vw_effective_balances AS
SELECT 
  client_id,
  balance_after as current_balance,
  created_at as last_updated
FROM credit_transactions
WHERE (client_id, created_at) IN (
  SELECT client_id, MAX(created_at)
  FROM credit_transactions
  WHERE group_id IS NULL
  GROUP BY client_id
);
```

---

## Fáze 6: Klientský portál - Real-time

### Sdílený hook pro obě strany

```typescript
// src/hooks/useCreditBalance.ts
export function useCreditBalance(clientId: string | undefined) {
  const [balance, setBalance] = useState<number | null>(null);
  
  // Initial fetch
  const { data: initialData } = useQuery({
    queryKey: ['credit_balance', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('credit_transactions')
        .select('balance_after')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after ?? 0;
    },
    enabled: !!clientId,
    staleTime: 0, // Vždy čerstvé
  });
  
  // Real-time updates
  useCreditRealtime(clientId);
  
  return {
    balance: balance ?? initialData ?? 0,
    isLoading: initialData === undefined,
  };
}
```

### Použití v klientském portálu

```typescript
// ClientPortalCredit.tsx
export default function ClientPortalCredit() {
  const { clientId } = useClientPortal();
  const { balance } = useCreditBalance(clientId);
  
  // Balance se aktualizuje okamžitě při změně
  return (
    <CreditBalanceDisplay balance={balance} />
  );
}
```

---

## Fáze 7: Audit a monitoring

### Automatický denní audit (vylepšený)

```typescript
// daily-financial-audit/index.ts (vylepšení)
async function auditBalances() {
  // 1. Porovnat running balance vs SUM
  const { data: discrepancies } = await supabase.rpc('rpc_audit_running_balances');
  
  // 2. Pokud nalezeny, přepočítat running balance
  if (discrepancies.length > 0) {
    await supabase.rpc('rpc_recalculate_running_balances', {
      client_ids: discrepancies.map(d => d.client_id)
    });
  }
  
  // 3. Notifikovat admina pokud > 0 chyb
  if (discrepancies.length > 0) {
    await sendSlackAlert({
      text: `⚠️ Credit audit: ${discrepancies.length} discrepancies fixed`,
      details: discrepancies,
    });
  }
}
```

### UI Dashboard pro audit

```typescript
// V Settings přidat CreditHealthDashboard
- Aktuální stav: ✅ Všechny zůstatky v pořádku
- Poslední audit: 7.2.2026 03:00
- Počet transakcí dnes: 47
- Celkový obrat dnes: +12 500 Kč / -8 200 Kč
- [Spustit manuální audit]
```

---

## Shrnutí změn

### Databáze

| Změna | Popis |
|-------|-------|
| `credit_transactions.balance_after` | Running balance pro instant display |
| `credit_transactions.source_type` | Audit trail |
| `credit_transactions.source_id` | Reference na zdroj |
| `rpc_credit_add/deduct/refund/transfer` | Jednotné API |
| Realtime enabled | WebSocket broadcast |
| `trg_set_running_balance` | Automatický running balance |

### Frontend

| Změna | Popis |
|-------|-------|
| `useCreditBalance` | Jednotný hook pro obě strany |
| `useCreditRealtime` | WebSocket subscription |
| Odstranit `staleTime` | Vždy čerstvá data |
| Optimistic updates | Okamžitá odezva UI |

### Backend Functions

| Změna | Popis |
|-------|-------|
| `rpc_complete_training_v2` | Zjednodušená verze |
| `rpc_process_sale_v2` | Volá `rpc_credit_deduct` |
| `daily-financial-audit` | Vylepšený s notifikacemi |

---

## Očekávané přínosy

1. **100% konzistence** - Running balance eliminuje diskrepance
2. **Okamžitá aktualizace** - WebSocket místo polling
3. **Jednodušší debugging** - Každá transakce má source
4. **Méně kódu** - 4 RPC funkce místo 10+
5. **Stejný zůstatek všude** - Admin i klient vidí totéž
6. **Automatická oprava** - Denní audit s notifikací

---

## Technická poznámka

### Kompatibilita

- Zachovat zpětnou kompatibilitu s `credit_balance` sloupcem během přechodu
- Nové RPC funkce vracejí stejný formát jako stávající
- Postupná migrace: nejdřív nové funkce, pak přepínání UI

### Výkon

- Running balance: O(1) místo O(n) pro čtení zůstatku
- Realtime: Eliminuje 95% polling requestů
- Index na `source_type, source_id`: Rychlé dohledání transakcí

