
# Vylepšený RX Workout Import + Zápis Výsledků

## Analýza vašeho formátu

Váš formát je strukturovanější než současný parser podporuje:

```text
WORKOUT: Engine + Strength Circuit     ← název
TYPE: FOR_TIME                          ← typ hodnocení
ROUNDS: 3                               ← počet kol

EXERCISE: TREADMILL                     ← název cviku
DISTANCE: 500 m                         ← vzdálenost
INCLINE: 15 %                           ← sklon (nový parametr)
SPEED: INDIVIDUAL                       ← rychlost (nový parametr)

EXERCISE: DUMBBELL_THRUSTER
LOAD: 2x8 kg                            ← váha (formát 2xVÁHA)
REPS: 20                                ← opakování

EXERCISE: ROW_ERG
DISTANCE: 400 m
DAMPER: 7                               ← odpor (nový parametr)

ROUND_COMPLETE: AFTER_SKIERG            ← značka konce kola

SCORE: TIME                             ← co měříme
```

---

## Část 1: Vylepšený Parser

### Nové podporované parametry

| Parametr | Popis | Příklad |
|----------|-------|---------|
| `EXERCISE:` | Název cviku | `DUMBBELL_THRUSTER` |
| `DISTANCE:` | Vzdálenost | `500 m` |
| `REPS:` | Opakování | `20` |
| `LOAD:` | Váha | `2x8 kg`, `24 kg` |
| `INCLINE:` | Sklon (treadmill) | `15 %` |
| `SPEED:` | Rychlost | `INDIVIDUAL`, `12 km/h` |
| `DAMPER:` | Odpor (rower/skierg) | `7` |
| `RESISTANCE:` | Odpor obecně | `7` |
| `TIME:` | Čas cviku | `1:00` |
| `ROUND_COMPLETE:` | Značka konce kola | `AFTER_SKIERG` |

### Mapování názvů cviků

Parser bude hledat cviky v databázi podle:
1. **Přesná shoda** - `DUMBBELL_THRUSTER` → `Dumbbell Thruster`
2. **Normalizovaná shoda** - odstraní podtržítka, převede na lowercase
3. **Alias shoda** - využije tabulku `exercise_aliases`

Pokud cvik neexistuje → **nabídne vytvoření**

---

## Část 2: UI pro Import s Mapováním Cviků

### Krok 1: Vložení textu
```text
┌─────────────────────────────────────────────────────────────┐
│ 📥 Import RX Workoutu                                  [X]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WORKOUT: Engine + Strength Circuit                     │ │
│ │ TYPE: FOR_TIME                                         │ │
│ │ ROUNDS: 3                                              │ │
│ │                                                        │ │
│ │ EXERCISE: TREADMILL                                    │ │
│ │ DISTANCE: 500 m                                        │ │
│ │ ...                                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ✓ Parsováno: Engine + Strength Circuit (For Time, 3 kola)  │
│ ✓ 5 cviků nalezeno                                          │
│ ⚠ 2 cviky potřebují namapovat                               │
├─────────────────────────────────────────────────────────────┤
│                                [Zrušit] [Pokračovat →]      │
└─────────────────────────────────────────────────────────────┘
```

### Krok 2: Mapování nenamapovaných cviků
```text
┌─────────────────────────────────────────────────────────────┐
│ 🔗 Namapovat cviky                                     [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKILLUP_SKIERG                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ (○) Vybrat existující: [▼ Hledat cvik...             ] │ │
│ │ (●) Vytvořit nový cvik                                 │ │
│ │     Název: [SkillUp SkiErg                          ]  │ │
│ │     Kategorie: [▼ Kardio                            ]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ DUMBBELL_LUNGES                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ (●) Vybrat existující: [▼ Dumbbell Lunges ✓         ]  │ │
│ │ (○) Vytvořit nový cvik                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [← Zpět] [Importovat workout]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Část 3: Přímý Zápis Výsledků na RX Workoutu

Místo vytváření výzvy → **přímý zápis výsledku** na kartě workoutu:

### RX Workout karta s historií
```text
┌─────────────────────────────────────────────────────────────┐
│ Engine + Strength Circuit                        [⋮ Menu]  │
├─────────────────────────────────────────────────────────────┤
│ [For Time] [3 kola]                                         │
│                                                             │
│ 🏃 500m Treadmill (15% incline)                             │
│ 💪 20x Dumbbell Thruster (2x8kg)                            │
│ 🚣 400m Row Erg (damper 7)                                  │
│ 🦵 12x Dumbbell Lunges (2x12kg)                             │
│ ⛷️ 500m SkiErg (resistance 7)                               │
├─────────────────────────────────────────────────────────────┤
│ 📊 Výsledky (3)                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥇 Jan Novák      18:23  (27.1.2026)                    │ │
│ │ 🥈 Petra Svobodová 19:45  (25.1.2026)                   │ │
│ │ 🥉 Martin Černý    21:12  (24.1.2026)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [+ Zapsat výsledek]                      [🏆 Vytvořit výzvu]│
└─────────────────────────────────────────────────────────────┘
```

---

## Část 4: Nová tabulka `rx_workout_results`

Místo využití `challenge_submissions` vytvoříme dedikovanou tabulku:

```sql
CREATE TABLE rx_workout_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_workout_id UUID NOT NULL REFERENCES training_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Výsledek
  score_primary NUMERIC NOT NULL,        -- čas v sekundách / počet opakování / váha
  score_secondary NUMERIC,                -- doplňkové (reps u AMRAP)
  
  -- Metadata
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Kdo zadal
  recorded_by_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_rx_result_per_day UNIQUE (rx_workout_id, client_id, performed_at)
);

-- Index pro rychlé leaderboardy
CREATE INDEX idx_rx_results_workout ON rx_workout_results(rx_workout_id, score_primary);
```

---

## Část 5: Databázové změny pro rozšířené parametry

### Rozšíření `training_template_exercises`

```sql
ALTER TABLE training_template_exercises
ADD COLUMN incline_percent NUMERIC,        -- sklon (treadmill)
ADD COLUMN speed_setting TEXT,             -- rychlost/tempo
ADD COLUMN damper_resistance INTEGER,      -- odpor (rower/skierg)
ADD COLUMN round_marker TEXT;              -- značka konce kola
```

---

## Souhrn změn

### Nové soubory
| Soubor | Popis |
|--------|-------|
| `src/hooks/useRxWorkoutParserV2.ts` | Vylepšený parser pro váš formát |
| `src/hooks/useRxWorkoutResults.ts` | CRUD pro výsledky |
| `src/components/rx/RxExerciseMappingStep.tsx` | UI pro mapování cviků |
| `src/components/rx/RxResultEntryDialog.tsx` | Dialog pro zápis výsledku |
| `src/components/rx/RxWorkoutLeaderboard.tsx` | Žebříček výsledků |
| `src/components/rx/RxWorkoutDetailSheet.tsx` | Detail workoutu s historií |

### Upravené soubory
| Soubor | Změna |
|--------|-------|
| `RxImportDialog.tsx` | Přidat krok mapování cviků |
| `RxWorkoutCard.tsx` | Přidat leaderboard a tlačítko zápisu |
| `useRxWorkouts.ts` | Podpora nových parametrů |

---

## Workflow

```text
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 1. Import textu  │ →  │ 2. Mapování      │ →  │ 3. Uložení       │
│    (parser V2)   │    │    cviků         │    │    workoutu      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                                        ↓
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 6. Porovnání     │ ←  │ 5. Leaderboard   │ ←  │ 4. Zápis         │
│    výsledků      │    │    gender/celkem │    │    výsledku      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Příklad parsování vašeho workoutu

**Vstup:**
```
WORKOUT: Engine + Strength Circuit
TYPE: FOR_TIME
ROUNDS: 3

EXERCISE: TREADMILL
DISTANCE: 500 m
INCLINE: 15 %
...
```

**Výstup parseru:**
```typescript
{
  valid: true,
  template: {
    name: "Engine + Strength Circuit",
    scoring_mode: "for_time",
    rounds: 3,
    is_rx_workout: true
  },
  exercises: [
    {
      exercise_name: "Treadmill",
      exercise_id: "abc-123", // nebo null pokud nenalezeno
      rx_distance_m: 500,
      incline_percent: 15,
      speed_setting: "INDIVIDUAL"
    },
    {
      exercise_name: "Dumbbell Thruster",
      reps_min: 20,
      rx_weight_kg: 8,
      load_format: "2x8" // 2 činky po 8kg
    },
    // ...
  ],
  unmapped_exercises: ["SKILLUP_SKIERG"]
}
```

---

## Technické poznámky

1. **Zpětná kompatibilita** - starý formát `@name:` bude stále fungovat
2. **Fuzzy matching** - pro mapování cviků použiji Levenshtein distance pro návrhy
3. **Automatické vytvoření cviku** - s rozumným defaultem (kategorie Kardio pro běžecký pás, etc.)
4. **Gender leaderboard** - využije existující `clients.gender` pole
5. **Export výsledků** - možnost exportu do CSV/PDF pro klienta
