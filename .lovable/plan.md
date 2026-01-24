
# Plán opravy automatického párování klientů v kalendáři

## Diagnostika problému

Provedl jsem analýzu a identifikoval jsem **3 hlavní příčiny** proč automatické párování nefunguje:

### 1. FastMode přeskakuje párování při velkých kalendářích
Když kalendář obsahuje více než 200 událostí, systém aktivuje "rychlý režim" (`fastMode`), který **zcela přeskakuje párování klientů**. Události se ukládají bez jakékoliv asociace s klientem.

V databázi je aktuálně přes 1000 událostí jako "Parezová Martina #tr" bez spárování, přestože klientka "Parezová Martina" existuje.

### 2. Rematch selhává na velkých kalendářích
Při pokusu o ruční "Přepárovat" (1000+ událostí) dochází k **timeout CPU** - operace se nedokončí a události zůstanou nespárované.

### 3. Učení aliasů nefunguje na přesné shody
Systém ukládá pouze **nové tokeny** jako aliasy (např. přezdívky). Když je jméno v kalendáři "Parezová Martina #tr" a klient se jmenuje "Parezová Martina", systém neukládá žádný alias, protože tokeny už jsou součástí jména.

---

## Navrhované řešení

### Krok 1: Optimalizovat párování při syncu

Místo přeskakování párování v `fastMode` změním logiku:

- **Vytvořit lookup mapu** ze všech jmen klientů (normalizovaných) na jejich ID
- Provádět **rychlé přímé porovnání** (exact match) i v fast mode
- Plný fuzzy matching ponechat pouze pro small sync

**Změny v souboru:** `supabase/functions/sync-ics-calendar/index.ts`
- Přidat funkci `buildClientNameLookupMap()` 
- V `fastMode` provádět rychlé exact-match porovnání
- Zachovat fuzzy matching pro případy bez přímé shody

### Krok 2: Opravit rematch pro velké kalendáře

Změnit `rematch_clients` akci:
- Zpracovávat události ve **stránkovaných dávkách** (např. 200 najednou)
- Používat **hromadné UPDATE** místo jednotlivých dotazů
- Přidat **timeout-resilient** logiku

**Změny v souboru:** `supabase/functions/sync-ics-calendar/index.ts`
- Přepsat `rematch_clients` s batch processing
- Použít single UPDATE s CASE WHEN pro hromadné aktualizace

### Krok 3: Ukládat celý summary jako alias

Při manuálním přiřazení ukládat **celý normalizovaný summary** jako alias (ne jen tokeny):

```
Událost: "Parezová Martina #tr"
Alias:   "parezova martina #tr" → uložit pro klienta
```

Tím se příští události se stejným názvem automaticky spárují.

**Změny v souboru:** `supabase/functions/sync-ics-calendar/index.ts`
- V akci `learn_alias` přidat ukládání celého summary jako alias
- Filtrovat pouze #tr a podobné tagy

### Krok 4: Přidat "Spárovat vše najednou" tlačítko

Přidat nové UI tlačítko do CalendarImportReview, které:
- Spáruje všechny události s přímou shodou jména jedním kliknutím
- Zobrazí progress a výsledky

**Změny v souboru:** `src/components/settings/CalendarImportReview.tsx`
- Přidat tlačítko "Auto-párovat přímé shody"
- Volat novou backend akci

---

## Technické detaily implementace

### Nová logika pro rychlé párování (exact match)

```text
┌─────────────────────────────────────────────────────┐
│  Při syncu:                                         │
│                                                     │
│  1. Vytvořit mapu: normalized_name → client_id     │
│     "parezova martina" → "ddcb744f-..."            │
│     "milkova alena" → "abc123..."                  │
│                                                     │
│  2. Pro každou událost:                            │
│     summary = "Parezová Martina #tr"               │
│     clean = odstranit #tr, časy, speciální znaky   │
│     normalized = "parezova martina"                │
│                                                     │
│  3. Lookup: map.get(normalized) → client_id        │
└─────────────────────────────────────────────────────┘
```

### Výkon
- Lookup mapa: O(1) pro každou událost
- 1500 událostí × O(1) = velmi rychlé
- Žádný fuzzy matching v rychlém režimu

---

## Shrnutí změn

| Soubor | Změna |
|--------|-------|
| `supabase/functions/sync-ics-calendar/index.ts` | Přidat exact-match v fastMode, opravit rematch batching, ukládat celý summary jako alias |
| `src/components/settings/CalendarImportReview.tsx` | Přidat tlačítko pro hromadné párování přímých shod |
| `src/hooks/useCalendarSync.ts` | Přidat hook pro novou akci |

## Očekávaný výsledek

Po implementaci:
- ✅ Události jako "Parezová Martina #tr" se **automaticky spárují** při syncu
- ✅ Rematch nebude selhávat na velkých kalendářích  
- ✅ Po manuálním přiřazení se naučí celý formát události
- ✅ Budoucí události se stejným názvem se automaticky spárují
