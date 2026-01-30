
# Oprava záložky "Vyplněné" feedbacky

## Identifikovaný problém

Záložka "Vyplněné" nezobrazuje žádné feedbacky, přestože v databázi existuje 20+ vyplněných záznamů. 

**Příčina**: Dotaz v `CompletedFeedbacksTab.tsx` obsahuje neexistující sloupec:

```typescript
// Řádek 61-67 v CompletedFeedbacksTab.tsx
.select(`
  *,
  training_sessions!inner (
    id,
    date,
    training_template_id  // ← TENTO SLOUPEC NEEXISTUJE!
  )
`)
```

Tabulka `training_sessions` nemá sloupec `training_template_id`, takže celý dotaz selže a vrátí prázdný výsledek.

---

## Navrhované řešení

### 1. Oprava dotazu v CompletedFeedbacksTab.tsx

Odebrat neexistující sloupec z SELECT:

```typescript
// PŘED (nefunkční):
.select(`
  *,
  training_sessions!inner (
    id,
    date,
    training_template_id
  )
`)

// PO (funkční):
.select(`
  *,
  training_sessions (
    id,
    date,
    training_type
  )
`)
```

**Poznámky k opravě:**
- Odebrat `training_template_id` (neexistuje)
- Přidat `training_type` místo toho (existuje a je užitečný)
- Změnit `!inner` na prostý join, aby feedbacky bez session nebyly odfiltrovány

### 2. Zjednodušení UI dle požadavku uživatele

Uživatel chce **jednoduchý chronologický seznam** bez složitého filtrování:

```text
SOUČASNÝ STAV:
┌────────────────────────────────────────────┐
│ ClientFeedbackLeaderboard (zabírá místo)  │
├────────────────────────────────────────────┤
│ [7 dní ▼] [Klient ▼] [Filtry...]         │
│ [Vysoká bolest] [Nízká energie] [...]     │
├────────────────────────────────────────────┤
│ "Žádné feedbacky odpovídající filtru"     │
└────────────────────────────────────────────┘

NOVÝ STAV:
┌────────────────────────────────────────────┐
│ Vyplněné feedbacky (23)                   │
│ [Období: Vše ▼]                           │
├────────────────────────────────────────────┤
│ 29.1. Jan Novák - Pocit: 5/10            │
│ 29.1. Marie S. - Pocit: 10/10            │
│ 29.1. Petr K. - Pocit: 5/10              │
│ 28.1. ...                                 │
│ (chronologicky od nejnovějších)           │
└────────────────────────────────────────────┘
```

---

## Technická implementace

### Změny v CompletedFeedbacksTab.tsx

| Změna | Popis |
|-------|-------|
| Oprava SELECT | Odebrat `training_template_id`, přidat `training_type` |
| Výchozí období | Změnit z `'30'` na `'all'` |
| Zjednodušit filtry | Skrýt pokročilé filtry, ponechat jen období a klienta |
| Odebrat Leaderboard | Nebo ho přesunout do Collapsible |
| Odstranit Quick Filters | Severity, sorting jako sekundární akce |

### Konkrétní úpravy kódu

**1. Oprava dotazu (řádky 56-90):**
```typescript
const { data: feedbackData, isLoading } = useQuery({
  queryKey: ['completed-feedbacks', period, selectedClientId],
  queryFn: async () => {
    let query = supabase
      .from('training_feedback')
      .select(`
        *,
        training_sessions (
          id,
          date,
          training_type
        )
      `)
      .order('created_at', { ascending: false });

    // Period filter - výchozí 'all' místo '30'
    if (period !== 'all') {
      const startDate = subDays(new Date(), parseInt(period));
      query = query.gte('created_at', startOfDay(startDate).toISOString());
    }

    // Client filter
    if (selectedClientId !== 'all') {
      query = query.eq('client_id', selectedClientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item) => ({
      ...item,
      trainingDate: item.training_sessions?.date || item.training_date,
      trainingType: item.training_sessions?.training_type,
    }));
  },
});
```

**2. Změna výchozího období:**
```typescript
// Změnit z '30' na 'all'
const [period, setPeriod] = useState<PeriodOption>('all');
```

**3. Zjednodušení UI - odebrat/skrýt:**
- `ClientFeedbackLeaderboard` - přesunout do Collapsible nebo odstranit
- `FeedbackQuickFilters` - odstranit úplně
- Ponechat jen základní Select pro období a klienta

---

## Očekávaný výsledek

| Metrika | Před | Po |
|---------|------|-----|
| Feedbacky zobrazeny | 0 | 23+ |
| Počet kroků k zobrazení | N/A (nefunguje) | 1 klik |
| Výchozí pohled | 30 dní + filtry | Vše, chronologicky |
| Složitost UI | Vysoká (5 filtrů) | Nízká (2 filtry) |

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/feedback/CompletedFeedbacksTab.tsx` | Oprava dotazu, zjednodušení UI |

---

## Shrnutí

1. **Kritická oprava**: Odebrat `training_template_id` z dotazu
2. **UX vylepšení**: Výchozí období na "Vše" 
3. **Zjednodušení**: Odstranit pokročilé filtry pro přehlednější seznam
