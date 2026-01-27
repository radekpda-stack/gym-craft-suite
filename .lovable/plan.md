
# RX Workout V2 - Implementační plán

## Přehled

Implementuji kompletní vylepšení RX Workout systému s podporou vašeho formátu workoutů, automatickým mapováním cviků a přímým zápisem výsledků.

---

## Část 1: Databázové změny

### Nové sloupce v `training_template_exercises`
```sql
ALTER TABLE training_template_exercises
ADD COLUMN incline_percent NUMERIC,      -- sklon (treadmill)
ADD COLUMN speed_setting TEXT,           -- rychlost
ADD COLUMN damper_resistance INTEGER,    -- odpor (rower/skierg)
ADD COLUMN round_marker TEXT,            -- značka konce kola
ADD COLUMN load_format TEXT;             -- formát váhy (2x8)
```

### Nová tabulka `rx_workout_results`
```sql
CREATE TABLE rx_workout_results (
  id UUID PRIMARY KEY,
  rx_workout_id UUID REFERENCES training_templates(id),
  client_id UUID REFERENCES clients(id),
  score_primary NUMERIC NOT NULL,
  score_secondary NUMERIC,
  performed_at DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_rx_result_per_day UNIQUE (rx_workout_id, client_id, performed_at)
);
```

---

## Část 2: V2 Parser (`useRxWorkoutParserV2.ts`)

### Podporované klíčové slova

| Klíč | Popis | Příklad |
|------|-------|---------|
| `WORKOUT:` | Název | `Engine + Strength Circuit` |
| `TYPE:` | Typ hodnocení | `FOR_TIME`, `AMRAP` |
| `ROUNDS:` | Počet kol | `3` |
| `EXERCISE:` | Název cviku | `DUMBBELL_THRUSTER` |
| `DISTANCE:` | Vzdálenost | `500 m` |
| `REPS:` | Opakování | `20` |
| `LOAD:` | Váha | `2x8 kg` |
| `INCLINE:` | Sklon | `15 %` |
| `SPEED:` | Rychlost | `INDIVIDUAL` |
| `DAMPER:` | Odpor | `7` |
| `ROUND_COMPLETE:` | Konec kola | `AFTER_SKIERG` |

### Funkce parseru
1. **Normalizace názvů**: `DUMBBELL_THRUSTER` → `Dumbbell Thruster`
2. **Fuzzy matching**: Hledá podobné cviky v databázi
3. **Automatické mapování**: Pokud shoda > 85%, automaticky přiřadí
4. **Návrhy**: Zobrazí až 5 nejlepších shod

---

## Část 3: Import s mapováním cviků

### Krok 1: Vložení textu
- Textarea pro vložení workoutu
- Real-time parsování
- Zobrazení rozpoznaných cviků

### Krok 2: Mapování nenamapovaných cviků (`RxExerciseMappingStep.tsx`)
```
┌─────────────────────────────────────────────────────┐
│ 🔗 Mapování cviků                                   │
├─────────────────────────────────────────────────────┤
│ SKILLUP_SKIERG                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ (○) Vybrat existující cvik                      │ │
│ │     [▼ Hledat... ]                              │ │
│ │     Návrhy: SkiErg (78%), Ski Machine (65%)     │ │
│ │ (●) Vytvořit nový cvik                          │ │
│ │     Název: [SkillUp SkiErg            ]         │ │
│ │     Kategorie: [▼ Kardio               ]        │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│                    [← Zpět] [Importovat]            │
└─────────────────────────────────────────────────────┘
```

---

## Část 4: Hook pro výsledky (`useRxWorkoutResults.ts`)

```typescript
// Načtení výsledků
useRxWorkoutResults(workoutId)

// Leaderboard s best-per-client
useRxWorkoutLeaderboard(workoutId, scoringMode)

// CRUD operace
useCreateRxWorkoutResult()
useUpdateRxWorkoutResult()
useDeleteRxWorkoutResult()

// Pomocné funkce
formatRxScore(120, 'for_time') → "2:00"
timeInputToSeconds(2, 30) → 150
amrapInputToScore(5, 12) → { primary: 5.012, secondary: 12 }
```

---

## Část 5: Dialog pro zápis výsledku (`RxResultEntryDialog.tsx`)

```
┌─────────────────────────────────────────────────────┐
│ 📝 Zápis výsledku: Engine + Strength Circuit        │
├─────────────────────────────────────────────────────┤
│ Klient:     [▼ Vybrat klienta...              ]     │
│                                                     │
│ Čas:        [ 18 ] min [ 23 ] sec                   │
│                                                     │
│ Datum:      [📅 27.1.2026]                          │
│                                                     │
│ Poznámka:   [________________________]              │
├─────────────────────────────────────────────────────┤
│                          [Zrušit] [Zapsat]          │
└─────────────────────────────────────────────────────┘
```

### Dynamický vstup podle typu workoutu
- **For Time**: Minuty + Sekundy
- **AMRAP**: Kola + Opakování
- **Max Load**: Váha v kg

---

## Část 6: Leaderboard (`RxWorkoutLeaderboard.tsx`)

```
┌─────────────────────────────────────────────────────┐
│ 📊 Výsledky                     [Všichni|M|Ž]       │
├─────────────────────────────────────────────────────┤
│ 🥇 Jan Novák (M)       18:23  (27.1.2026)           │
│ 🥈 Petra Svobodová (Ž) 19:45  (25.1.2026)           │
│ 🥉 Martin Černý (M)    21:12  (24.1.2026)           │
│ 4. Tomáš Kučera (M)    22:30  (23.1.2026)           │
└─────────────────────────────────────────────────────┘
```

### Funkce
- Gender filtr (Všichni / Muži / Ženy)
- Best result per client
- Zobrazení data výkonu
- Kliknutím na řádek → detail/editace

---

## Část 7: Aktualizovaná RxWorkoutCard

```
┌─────────────────────────────────────────────────────┐
│ Engine + Strength Circuit                    [⋮]    │
├─────────────────────────────────────────────────────┤
│ [For Time] [3 kola]                                 │
│                                                     │
│ 🏃 500m Treadmill (15% incline)                     │
│ 💪 20x Dumbbell Thruster (2x8kg)                    │
│ 🚣 400m Row Erg (damper 7)                          │
│ 🦵 12x Dumbbell Lunges (2x12kg)                     │
│ ⛷️ 500m SkiErg (resistance 7)                       │
├─────────────────────────────────────────────────────┤
│ Top 3:                                              │
│ 🥇 Jan N. 18:23  🥈 Petra S. 19:45  🥉 Martin Č.    │
├─────────────────────────────────────────────────────┤
│ [+ Zapsat výsledek]                 [🏆 Výzva]      │
└─────────────────────────────────────────────────────┘
```

---

## Část 8: Aktualizovaný Import Dialog

Třístupňový wizard:
1. **Vložení textu** → Parse + validace
2. **Mapování cviků** → Přiřadit/vytvořit nenamapované
3. **Potvrzení** → Import do databáze

---

## Soubory k vytvoření

| Soubor | Popis |
|--------|-------|
| `supabase/migrations/xxx_rx_workout_v2.sql` | DB migrace |
| `src/hooks/useRxWorkoutParserV2.ts` | V2 parser |
| `src/hooks/useRxWorkoutResults.ts` | CRUD výsledků |
| `src/components/rx/RxExerciseMappingStep.tsx` | Mapování cviků |
| `src/components/rx/RxResultEntryDialog.tsx` | Zápis výsledku |
| `src/components/rx/RxWorkoutLeaderboard.tsx` | Žebříček |
| `src/components/rx/RxWorkoutDetailSheet.tsx` | Detail workoutu |

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/rx/RxImportDialog.tsx` | Třístupňový wizard |
| `src/components/rx/RxWorkoutCard.tsx` | Leaderboard + zápis |
| `src/hooks/useRxWorkouts.ts` | Podpora nových polí |
| `src/integrations/supabase/types.ts` | Nové typy |

---

## Workflow uživatele

```
1. Vloží text workoutu
         ↓
2. Parser rozpozná strukturu
         ↓
3. Zobrazí nenamapované cviky
         ↓
4. Uživatel přiřadí/vytvoří cviky
         ↓
5. Import do databáze
         ↓
6. Workout se zobrazí na kartě
         ↓
7. Klik "Zapsat výsledek"
         ↓
8. Vyplní klienta + skóre
         ↓
9. Výsledek v leaderboardu
```

---

## Bonus funkce

1. **Export CSV** - Možnost exportu leaderboardu
2. **Historie klienta** - Všechny pokusy jednoho klienta
3. **PR (Personal Record)** - Označení osobních rekordů
4. **Porovnání** - Graf progrese v čase
