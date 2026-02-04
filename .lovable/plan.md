
# Oprava nesouladu kreditního zůstatku

## Analýza problému

### Co vidíme na screenshotu
- Zobrazený zůstatek: **2 960 Kč**
- Vypočtený zůstatek: **360 Kč**
- Rozdíl: **2 600 Kč**

### Co je ve skutečnosti v databázi
- `clients.credit_balance`: **-469 Kč**
- Součet transakcí (ledger): **-440 Kč**
- Zuzka **není** členem sdíleného budgetu

### Root cause
Problém má **dvě části**:

1. **Audit v UI počítá balance nesprávně** - Komponenta `ClientFinanceLedger` buduje `ledgerEntries` ze směsi transakcí a training sessions, ale logika přeskakuje transakce typu `training` s `training_session_id` a pak přidává sessions znovu. To může vést k chybným výsledkům.

2. **Hook `useSharedBudgetBalance` vrací zastaralou hodnotu** - Pro individuální klienty vrací `client.credit_balance` z tabulky clients místo aktuálního ledger balance z view `vw_client_ledger_balances`.

---

## Navrhované řešení

### Fáze 1: Oprava hooku `useSharedBudgetBalance`
Změnit hook tak, aby pro individuální klienty používal ledger balance z databázové view místo uložené hodnoty.

**Změny v `src/hooks/useCreditOperations.ts`:**

```typescript
// Aktuální logika (chybná):
if (!membership) {
  const { data: client } = await supabase
    .from("clients")
    .select("credit_balance")
    .eq("id", clientId)
    .maybeSingle();
  const balance = client?.credit_balance || 0;
  // ...
}

// Nová logika (správná):
if (!membership) {
  // Použít ledger balance místo uložené hodnoty
  const { data: ledgerData } = await supabase
    .from("vw_client_ledger_balances")
    .select("ledger_balance")
    .eq("client_id", clientId)
    .maybeSingle();
  
  const balance = ledgerData?.ledger_balance ?? 0;
  // ...
}
```

### Fáze 2: Oprava auditu v `ClientFinanceLedger`
Změnit logiku auditu tak, aby porovnávala zobrazený zůstatek pouze s transakcemi (ne se sessions).

**Změny v `src/components/clients/ClientFinanceLedger.tsx`:**

```typescript
// Aktuální audit (chybný):
const calculatedBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

// Nový audit - počítat pouze z transakcí:
const calculatedFromTransactions = useMemo(() => {
  return transactions
    .filter(tx => tx.status === 'completed' || !tx.status) // completed transactions only
    .reduce((sum, tx) => sum + tx.amount, 0);
}, [transactions]);

const auditResult = useMemo(() => {
  const difference = Math.abs(calculatedFromTransactions - currentBalance);
  const matches = difference < 1;
  return { calculatedBalance: calculatedFromTransactions, matches, difference };
}, [calculatedFromTransactions, currentBalance]);
```

### Fáze 3: Jednorázová oprava dat v databázi
Synchronizovat `credit_balance` s ledger balance pro všechny klienty.

**SQL migrace:**
```sql
-- Synchronizovat credit_balance s ledger pro všechny individuální klienty
UPDATE clients c
SET credit_balance = COALESCE(
  (SELECT SUM(amount) 
   FROM credit_transactions 
   WHERE client_id = c.id AND status = 'completed'),
  0
),
updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM client_budget_members WHERE client_id = c.id
);
```

---

## Technické detaily

### Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useCreditOperations.ts` | Hook `useSharedBudgetBalance` - použít ledger balance místo credit_balance |
| `src/components/clients/ClientFinanceLedger.tsx` | Opravit logiku auditu - počítat pouze z transakcí |
| Databázová migrace | Synchronizovat credit_balance pro všechny klienty |

### Změna v `useCreditOperations.ts`

```typescript
export function useSharedBudgetBalance(clientId?: string) {
  return useQuery({
    queryKey: ["shared_budget_balance", clientId],
    queryFn: async (): Promise<SharedBudgetInfo> => {
      if (!clientId) {
        return { /* default empty */ };
      }

      const membership = await getClientBudgetGroup(clientId);

      if (!membership) {
        // ZMĚNA: Použít ledger balance místo credit_balance
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("vw_client_ledger_balances")
          .select("ledger_balance")
          .eq("client_id", clientId)
          .maybeSingle();

        if (ledgerError) throw ledgerError;
        const balance = ledgerData?.ledger_balance ?? 0;
        
        return {
          isShared: false,
          groupId: null,
          groupName: null,
          sharedBalance: balance,
          displayBalance: balance,
          isExhausted: balance <= 0,
          isNegative: balance < 0,
          members: [],
        };
      }
      
      // ... zbytek logiky pro shared budget zůstává stejný
    },
    // ...
  });
}
```

### Změna v `ClientFinanceLedger.tsx`

Přidat nový `useMemo` pro výpočet balance z transakcí:

```typescript
// Před auditResult, přidat:
const calculatedFromTransactions = useMemo(() => {
  // Součet všech transakcí
  let sum = 0;
  
  transactions.forEach(tx => {
    // Přeskočit transakce s training_session_id (jsou započítány jako sessions)
    if (tx.training_session_id) return;
    sum += tx.amount;
  });
  
  // Přidat sessions placené kreditem
  sessions.forEach(session => {
    if (session.status === 'scheduled') return;
    
    const participantData = participantPayments.get(session.id);
    const paymentMethod = participantData?.payment_method ?? session.payment_method ?? 'credit';
    const price = participantData?.price_share ?? session.final_price ?? 0;
    
    if (paymentMethod === 'credit' && price > 0) {
      sum -= price;
    }
  });
  
  return sum;
}, [transactions, sessions, participantPayments]);

// Upravit auditResult:
const auditResult = useMemo(() => {
  const difference = Math.abs(calculatedFromTransactions - currentBalance);
  const matches = difference < 1;
  return {
    calculatedBalance: calculatedFromTransactions,
    matches,
    difference,
  };
}, [calculatedFromTransactions, currentBalance]);
```

---

## Očekávaný výsledek

Po implementaci:
1. ✅ Hook `useSharedBudgetBalance` vrací vždy aktuální ledger balance
2. ✅ Audit v UI správně porovnává zobrazený zůstatek s transakcemi
3. ✅ Databáze má synchronizované hodnoty `credit_balance` s ledgerem
4. ✅ Žádné nesoulady se již nebudou zobrazovat falešně

---

## Rizika a mitigace

| Riziko | Mitigace |
|--------|----------|
| Ledger view může být pomalá | View je již optimalizovaná s indexy |
| Existující transakce bez status | Přidat fallback pro transakce bez status (považovat za completed) |
| Uživatel uvidí jiný zůstatek po opravě | To je správné chování - uvidí skutečný stav |
