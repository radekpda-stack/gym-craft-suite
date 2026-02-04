

# Oprava chybějících PR záznamů na kartě tréninku

## Identifikovaný problém

Při zobrazení sekce **"Výsledky účastníků"** na kartě tréninku se nezobrazují všechny PR záznamy. Pro Martinu Štefanovou chybí:
- **Bench press** (35 kg z 2024-08-16)
- **Bulharský dřep** (20 kg z 2026-02-03)

Mirka Kotová má všech 5 záznamů správně.

## Příčina problému

### 1. Chybí cache invalidace pro `client-exercise-prs`

Po dokončení tréninku se vytvářejí nové záznamy v `exercise_entries`, ale cache pro hook `useClientExercisePRs` není invalidována:

| Soubor | Invaliduje `client-exercise-prs`? |
|--------|-----------------------------------|
| `useCompleteTrainingAtomic.ts` | ❌ NE |
| `useExerciseEntries.ts` | ❌ NE |
| `useWorkoutEntries.ts` | ❌ NE |

### 2. Výsledek

Když uživatel dokončí trénink:
1. Nové exercise entries se uloží do databáze ✅
2. Cache pro `exercise-entries` se invaliduje ✅
3. Cache pro `client-exercise-prs` zůstane **zastaralá** ❌
4. UI zobrazuje staré PRs z cache

## Řešení

### Část A: Přidat invalidaci do `useCompleteTrainingAtomic.ts`

```typescript
// Po dokončení tréninku invalidovat PRs pro všechny účastníky
for (const participant of params.participants) {
  queryClient.invalidateQueries({ 
    queryKey: ["client-exercise-prs", participant.client_id],
    refetchType: 'all',
  });
}

// Také globální invalidace
queryClient.invalidateQueries({ 
  queryKey: ["client-exercise-prs"], 
  refetchType: 'all' 
});
```

### Část B: Přidat invalidaci do `useExerciseEntries.ts`

V `addEntry` a `updateEntry` mutacích:

```typescript
onSuccess: () => {
  // Stávající invalidace...
  queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] });
}
```

### Část C: Přidat invalidaci do `useSyncToClientStats`

V `useWorkoutEntries.ts`:

```typescript
onSuccess: () => {
  // Stávající invalidace...
  queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] });
}
```

### Část D: Snížit staleTime v `useClientExercisePRs`

Pro zajištění čerstvějších dat:

```typescript
return useQuery({
  queryKey: ['client-exercise-prs', clientId],
  staleTime: 1000 * 30, // 30 sekund místo default
  queryFn: async () => { ... }
});
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useCompleteTrainingAtomic.ts` | Přidat invalidaci `client-exercise-prs` |
| `src/hooks/useExerciseEntries.ts` | Přidat invalidaci v `addEntry` a `updateEntry` |
| `src/hooks/useWorkoutEntries.ts` | Přidat invalidaci v `useSyncToClientStats` |
| `src/hooks/useClientExercisePRs.ts` | Přidat `staleTime: 30s` |

---

## Technické detaily změn

### 1. useCompleteTrainingAtomic.ts

**Řádek ~292 (po granulární invalidaci účastníků):**

```typescript
// NOVÉ: Invalidovat PRs pro každého účastníka
for (const participant of params.participants) {
  queryClient.invalidateQueries({ 
    queryKey: ["client-exercise-prs", participant.client_id],
    refetchType: 'all',
  });
}
```

**Řádek ~310 (v globálních invalidacích):**

```typescript
queryClient.invalidateQueries({ queryKey: ["client-exercise-prs"], refetchType: 'all' });
```

### 2. useExerciseEntries.ts

**Řádek ~203 (addEntry onSuccess):**

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-stats'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-progress'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-client-comparison'] });
  queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] }); // NOVÉ
  toast({ title: 'Záznam přidán', description: 'Tréninkový záznam byl uložen.' });
}
```

**Řádek ~254 (updateEntry onSuccess):**

```typescript
queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] }); // NOVÉ
```

### 3. useWorkoutEntries.ts

**Řádek ~435 (useSyncToClientStats onSuccess):**

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
  queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
  queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] }); // NOVÉ
  toast({
    title: 'Statistiky aktualizovány',
    description: 'Data byla synchronizována s profily klientů.',
  });
}
```

### 4. useClientExercisePRs.ts

**Řádek ~28:**

```typescript
export function useClientExercisePRs(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-exercise-prs', clientId],
    staleTime: 1000 * 30, // 30 sekund - pro čerstvější data
    queryFn: async () => {
      // ...
    },
    enabled: !!clientId,
  });
}
```

---

## Očekávaný výsledek

Po implementaci:
- Všechny PR záznamy klientů budou okamžitě viditelné po dokončení tréninku
- Cache se automaticky invaliduje při jakékoli změně v exercise_entries
- Martina Štefanová bude mít zobrazeno všech 7 cviků včetně Bench press a Bulharský dřep

