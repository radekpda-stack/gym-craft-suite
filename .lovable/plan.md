
# Oprava kreditového systému - Cache invalidace po dokončení tréninku

## Identifikovaný problém

Po dokončení tréninku se UI neaktualizuje správně, protože:

1. **Příliš dlouhá staleTime** - `useClient` má 2 minuty, `useSharedBudgetBalance` má 30 sekund
2. **Neúplná invalidace** - `invalidateQueries({ queryKey: ["clients"] })` invaliduje klíč, ale data se nerefetchnou okamžitě kvůli staleTime
3. **Chybí granulární invalidace** - nebyly invalidovány konkrétní klíče pro jednotlivé účastníky (`["clients", clientId]`)

## Řešení

### Část A: Oprava `useCompleteTrainingAtomic.ts`

Přidám granulární invalidaci pro **všechny účastníky tréninku** s `refetchType: 'all'`:

```typescript
onSuccess: (result, params) => {
  // NOVÉ: Granulární invalidace pro každého účastníka
  for (const participant of params.participants) {
    queryClient.invalidateQueries({ 
      queryKey: ["clients", participant.client_id],
      refetchType: 'all',
    });
    queryClient.invalidateQueries({ 
      queryKey: ["credit_transactions", participant.client_id],
      refetchType: 'all',
    });
    queryClient.invalidateQueries({ 
      queryKey: ["shared_budget_balance", participant.client_id],
      refetchType: 'all',
    });
  }
  
  // Stávající invalidace...
}
```

### Část B: Snížení staleTime v kritických hooks

V `useClients.ts`:
- `useClient`: snížit staleTime z 2 minut na **30 sekund**
- `useCreditTransactions`: snížit staleTime z 2 minut na **30 sekund**

V `useCreditOperations.ts`:
- `useSharedBudgetBalance`: ponechat 30 sekund (OK)

### Část C: Přidání refetchType do hlavních invalidací

Změnit všechny invalidace v `useCompleteTrainingAtomic.ts` na použití `refetchType: 'all'`:

```typescript
queryClient.invalidateQueries({ 
  queryKey: ["clients"], 
  refetchType: 'all' 
});
```

Tím se zajistí, že se data opravdu refetchnou, i když jsou v rámci staleTime.

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useCompleteTrainingAtomic.ts` | Přidat granulární invalidaci pro účastníky + refetchType |
| `src/hooks/useClients.ts` | Snížit staleTime useClient na 30s |
| `src/hooks/useCreditOperations.ts` | Snížit staleTime useCreditTransactions na 30s |

---

## Technické detaily změn

### 1. useCompleteTrainingAtomic.ts (řádky 276-295)

**Před:**
```typescript
onSuccess: (result, params) => {
  queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
  queryClient.invalidateQueries({ queryKey: ["clients"] });
  queryClient.invalidateQueries({ queryKey: ["credit_transactions"] });
  queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
  // ...
}
```

**Po:**
```typescript
onSuccess: (result, params) => {
  // Granulární invalidace pro každého účastníka - kritické pro UI update
  for (const participant of params.participants) {
    queryClient.invalidateQueries({ 
      queryKey: ["clients", participant.client_id],
      refetchType: 'all',
    });
    queryClient.invalidateQueries({ 
      queryKey: ["credit_transactions", participant.client_id],
      refetchType: 'all',
    });
    queryClient.invalidateQueries({ 
      queryKey: ["shared_budget_balance", participant.client_id],
      refetchType: 'all',
    });
  }
  
  // Hlavní invalidace s refetchType
  queryClient.invalidateQueries({ queryKey: ["training_sessions"], refetchType: 'all' });
  queryClient.invalidateQueries({ queryKey: ["clients"], refetchType: 'all' });
  queryClient.invalidateQueries({ queryKey: ["credit_transactions"], refetchType: 'all' });
  queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"], refetchType: 'all' });
  // ... zbytek bez změn
}
```

### 2. useClients.ts - snížení staleTime

**Řádek 67:** Změnit `staleTime: 1000 * 60 * 2` na `staleTime: 1000 * 30`

### 3. useCreditOperations.ts - snížení staleTime

**Řádek 229:** Změnit `staleTime: 1000 * 60 * 2` na `staleTime: 1000 * 30`

---

## Očekávaný výsledek

Po implementaci:
- UI se okamžitě aktualizuje po dokončení tréninku
- Zůstatek klienta zobrazí správnou hodnotu (načtenou z ledger view)
- Všichni účastníci duo/group tréninku uvidí aktualizovaný kredit
- Žádné další manuální refetch není potřeba

## Proč to bude fungovat

1. **Granulární invalidace** - přímo cílíme na konkrétního klienta, ne jen na celou kolekci
2. **refetchType: 'all'** - vynutí refetch i když data jsou v rámci staleTime
3. **Kratší staleTime** - data se považují za zastaralá dříve, takže běžná invalidace funguje spolehlivěji
4. **Ledger view** - `useClient` už načítá balance z `vw_client_ledger_balances`, takže jakmile se refetchne, zobrazí správný zůstatek
