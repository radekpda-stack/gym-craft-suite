
# Oprava kreditního systému - Stale Cache Bug

## Identifikovaný problém

Po dokončení tréninku a následném dobití kreditu se UI nezobrazuje aktuální zůstatek. Příčinou je **nesprávná invalidace React Query cache**.

### Root Cause

Mutační hooky `useAddCreditLot` a `useCreateTransaction` invalidují pouze query klíč `["clients"]` (seznam všech klientů), ale **NEinvalidují** `["clients", clientId]` (data konkrétního klienta).

Stránka `ClientDetail.tsx` používá hook `useClient(id)` s query klíčem `["clients", id]`, který tak zůstává v cache s neaktuálními daty.

### Evidence z databáze vs UI

- **Databáze**: `credit_balance = 8200 Kč` (správně)
- **Screenshot**: zobrazeno `9800 Kč` (stale cache)
- **Audit banner**: "Vypočtený zůstatek (800 Kč) nesouhlasí s evidencí (9 800 Kč)"

---

## Řešení

### 1. Oprava `useAddCreditLot` (src/hooks/useCreditLots.ts)

Přidat invalidaci query klíče pro konkrétního klienta a transakce:

```typescript
onSuccess: (result, variables) => {
  queryClient.invalidateQueries({ queryKey: ['credit_lots', variables.clientId] });
  queryClient.invalidateQueries({ queryKey: ['credit_summary', variables.clientId] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['credit_transactions', variables.clientId] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['shared_budget_balance'] });
  queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', variables.clientId] }); // PŘIDAT
},
```

### 2. Oprava `useCreateTransaction` (src/hooks/useCreditOperations.ts)

Přidat invalidaci query klíče pro konkrétního klienta:

```typescript
onSuccess: (result, variables) => {
  queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
  queryClient.invalidateQueries({ queryKey: ["credit_transactions", variables.client_id] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ["clients"] });
  queryClient.invalidateQueries({ queryKey: ["clients", variables.client_id] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
  queryClient.invalidateQueries({ queryKey: ["shared_budget_balance", variables.client_id] }); // PŘIDAT
  // ... zbytek beze změny
},
```

### 3. Oprava `useDeductCreditFifo` (src/hooks/useCreditLots.ts)

Obdobně přidat invalidaci pro konkrétního klienta:

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['credit_lots', variables.clientId] });
  queryClient.invalidateQueries({ queryKey: ['credit_summary', variables.clientId] });
  queryClient.invalidateQueries({ queryKey: ['credit_consumptions', variables.clientId] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['credit_transactions'] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['credit_transactions', variables.clientId] }); // PŘIDAT
  queryClient.invalidateQueries({ queryKey: ['shared_budget_balance', variables.clientId] }); // PŘIDAT
},
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useCreditLots.ts` | Přidat invalidace pro `['clients', clientId]`, `['credit_transactions']`, `['shared_budget_balance', clientId]` |
| `src/hooks/useCreditOperations.ts` | Přidat invalidace pro `['clients', client_id]`, `['credit_transactions', client_id]`, `['shared_budget_balance', client_id]` |

---

## Technické poznámky

1. **Query key pattern**: React Query invaliduje **přesně** podle klíče. `["clients"]` a `["clients", "abc123"]` jsou dva různé klíče.

2. **Důvod dvojité invalidace**: `["clients"]` invaliduje seznam (pro dashboard, přehledy), `["clients", id]` invaliduje detail konkrétního klienta.

3. **Kontrola po opravě**: Po dobití kreditu na stránce klienta by se měl okamžitě aktualizovat zůstatek bez nutnosti refreshe stránky.
