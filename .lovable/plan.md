
# Plán opravy kalendářového importu - Komplexní audit

## Zjištěné problémy

### Problém 1: Smart Import NEVYTVÁŘÍ tréninky (KRITICKÝ)
**Příčina:** V edge function `sync-ics-calendar/index.ts` (řádky 2284-2290) je explicitně napsáno:
```
// Sessions are created by create_approved_sessions action, not here
// This keeps smart_import fast and within CPU limits
```

Smart Import pouze:
- ✅ Synchronizuje události z kalendáře
- ✅ Páruje klienty (exact match)
- ✅ Učí se aliasy
- ❌ **NEVYTVÁŘÍ tréninky!**

### Problém 2: UI nezavolá druhou akci
**Příčina:** V `CalendarQuickImport.tsx` (řádky 40-67) se po úspěšném Smart Import jen zobrazí výsledky, ale **nikdy se nezavolá** `create_approved_sessions`:

```typescript
const handleSmartImport = async () => {
  const importResult = await smartImport.mutateAsync({...});
  setResult(importResult);  // Pouze uložení výsledku
  // ❌ CHYBÍ: await createSessions.mutateAsync(feedId);
};
```

### Problém 3: Statistika v databázi
Aktuální stav (z dotazu):
| Metrika | Počet |
|---------|-------|
| Celkem událostí | 2944 |
| Spárované s klientem | 2314 |
| Schválené | 698 |
| S vytvořeným tréninkem | 188 |

**2126 událostí** je spárováno, ale nemá vytvořený trénink!

---

## Navrhované řešení

### Změna 1: Rozšířit `useSmartImport` hook o automatické vytvoření tréninků

Po úspěšném smart_import volat `create_approved_sessions` v rámci mutace:

**Soubor:** `src/hooks/useSmartImport.ts`

```typescript
export function useSmartImport() {
  return useMutation({
    mutationFn: async (options: SmartImportOptions): Promise<SmartImportResult> => {
      const { feedId, autoCreateSessions = true, ... } = options;
      
      // Krok 1: Smart Import (sync + match)
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: { action: 'smart_import', feedId, ... },
      });
      
      // Krok 2: Vytvořit tréninky (pokud povoleno)
      let sessionsResult = { sessions_created: 0, duplicates_skipped: 0 };
      if (autoCreateSessions) {
        const sessionsResponse = await supabase.functions.invoke('sync-ics-calendar', {
          body: { action: 'create_approved_sessions', feedId },
        });
        if (!sessionsResponse.error) {
          sessionsResult = sessionsResponse.data;
        }
      }
      
      return {
        ...response.data,
        imported: sessionsResult.sessions_created,
        duplicates_skipped: sessionsResult.duplicates_skipped,
      };
    },
  });
}
```

### Změna 2: Opravit párování přímých shod v fast mode

V edge function není správně prováděno exact-match párování při velkém počtu událostí. Lookup mapa existuje, ale párování se může přeskočit.

**Soubor:** `supabase/functions/sync-ics-calendar/index.ts`

Logika v kroku 4 smart_import:
1. Přidat robustnější čištění summary (odstranit #tr, časy, speciální znaky)
2. Zajistit, že lookup mapa obsahuje i kombinace "příjmení křestní"
3. Přidat fallback na fuzzy matching pro přímé shody s diakritikou

### Změna 3: Opravit learn_alias pro celý summary

Aktuální logika ukládá pouze tokeny. Přidat ukládání celého normalizovaného summary:

```typescript
// Aktuální (špatné):
aliases: ["parezova", "martina"]  // jednotlivé tokeny

// Nové (správné):
aliases: ["parezova martina #tr", "parezova martina"]  // celý vzor
```

### Změna 4: Přidat tlačítko "Vytvořit tréninky" do Smart Import UI

**Soubor:** `src/components/settings/CalendarQuickImport.tsx`

Po zobrazení výsledků přidat tlačítko pro manuální vytvoření tréninků (pro případ, že automatická session creation byla přeskočena kvůli timeoutu):

```tsx
{result && result.matched > result.imported && (
  <Button onClick={handleCreateSessions}>
    Vytvořit zbývající tréninky ({result.matched - result.imported})
  </Button>
)}
```

---

## Technický detail: Optimalizovaná lookup mapa

```text
Událost:   "Parezová Martina #tr"
           ↓ normalize
Cleaned:   "parezova martina"
           ↓ lookup
Mapa:      { "parezova martina" → "client-uuid-123" }
           → MATCH!
```

Mapa obsahuje:
- Celé normalizované jméno klienta
- Jednotlivé části jména (příjmení, křestní)
- Uložené aliasy z databáze
- Kombinace přeházených jmen ("martina parezova")

---

## Shrnutí změn

| Soubor | Změna |
|--------|-------|
| `src/hooks/useSmartImport.ts` | Přidat volání `create_approved_sessions` po úspěšném smart_import |
| `src/components/settings/CalendarQuickImport.tsx` | Přidat tlačítko pro ruční vytvoření tréninků |
| `supabase/functions/sync-ics-calendar/index.ts` | Vylepšit lookup mapu o reversed name patterns, opravit learn_alias |

## Očekávaný výsledek

Po implementaci:
- ✅ Smart Import bude **skutečně vytvářet tréninky** do kalendáře
- ✅ Události jako "Parezová Martina #tr" se automaticky spárují a importují
- ✅ Po manuálním přiřazení se naučí celý formát události
- ✅ UI zobrazí správný počet importovaných tréninků
- ✅ Možnost ručně dokončit import, pokud automatický proces vyprší
