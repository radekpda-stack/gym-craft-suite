
# RX Workout Šablony + Leaderboard Systém

## Přehled

Implementuji kompletní systém pro:
1. **RX Workout šablony** - standardizované tréninky (benchmarky)
2. **Trenérský zápis výsledků** - formulář pro zadání skóre klientům
3. **Gender-segmentovaný leaderboard** - oddělené žebříčky pro muže a ženy
4. **Import z textu** - parser formátu JM_WORKOUT_V1

---

## Část 1: Databázové změny

### 1.1 Rozšíření tabulky `training_templates`

```sql
ALTER TABLE training_templates 
ADD COLUMN is_rx_workout BOOLEAN DEFAULT false,
ADD COLUMN scoring_mode TEXT DEFAULT 'standard' 
  CHECK (scoring_mode IN ('standard', 'for_time', 'amrap', 'max_load', 'rounds_reps'));
```

### 1.2 Rozšíření tabulky `training_template_exercises`

```sql
ALTER TABLE training_template_exercises
ADD COLUMN rx_weight_kg NUMERIC,
ADD COLUMN rx_distance_m NUMERIC,
ADD COLUMN unit_label TEXT;
```

### 1.3 Rozšíření typu `workout_format`

Přidat `max_load` do existujících hodnot (už máme: standard, amrap, emom, for_time, tabata, circuit).

---

## Část 2: UI Komponenty

### 2.1 Nová stránka: RX Workouty (`/rx-workouts`)

Hlavní správa RX benchmarků s:
- Seznam RX šablon (filtr: AMRAP, For Time, Max Load)
- Import z textu (tlačítko "Import")
- Propojení s Výzvami (vytvoř challenge z RX)

### 2.2 Import Dialog (`RxImportDialog.tsx`)

Textarea pro vložení textu ve formátu JM_WORKOUT_V1:
```
@name: Fran
@type: for_time
@timecap: 10:00

21x Thruster | 43kg
21x Pull-up
15x Thruster | 43kg
15x Pull-up
9x Thruster | 43kg
9x Pull-up
```

Parser provede:
1. Extrakci metadat
2. Rozpoznání cviků
3. Mapování na `exercises` tabulku
4. Zobrazení náhledu před uložením

### 2.3 Trenérský formulář zápisu (`TrainerResultEntry.tsx`)

Formulář v sekci Výsledky výzvy:
- Výběr klienta (combobox)
- Automatická detekce pohlaví z `clients.gender`
- Vstupní pole podle typu výzvy:
  - **For Time**: čas (MM:SS)
  - **AMRAP**: kola + opakování (2 pole)
  - **Max Load**: váha (kg)
- Potvrzení trenérem

### 2.4 Gender Leaderboard Tabs

Rozšíření `ChallengeSubmissionsView.tsx`:
- Záložky: Všichni | Muži | Ženy
- Filtr podle `clients.gender`
- Samostatné pořadí pro každou kategorii

---

## Část 3: Hooky a Logika

### 3.1 Parser `useRxWorkoutParser.ts`

```typescript
interface ParsedRxWorkout {
  valid: boolean;
  errors: string[];
  template: {
    name: string;
    workout_format: string;
    time_cap_seconds?: number;
    rounds?: number;
    is_rx_workout: true;
  };
  exercises: Array<{
    exercise_name: string;
    exercise_id?: string; // mapováno z DB
    reps_min?: number;
    rx_weight_kg?: number;
    rx_distance_m?: number;
  }>;
  unmapped_exercises: string[]; // cviky nenalezené v DB
}
```

### 3.2 Hook `useRxWorkouts.ts`

- `useRxWorkouts()` - seznam RX šablon
- `useCreateRxWorkout()` - vytvoření z parseru
- `useRxWorkoutToChallenge()` - konverze na výzvu

### 3.3 Hook `useTrainerResultEntry.ts`

- Zápis výsledku trenérem
- Automatické nastavení `confirmed_by: 'coach'`
- Validace podle scoring_type

### 3.4 Rozšíření `useChallengeSubmissions.ts`

- Přidání gender filtru
- Join s `clients.gender`
- Výpočet pořadí v rámci kategorie

---

## Část 4: Scoring Logika

### 4.1 AMRAP Kompozitní Skóre

```typescript
// 18 kol + 7 opak → 18.07
const compositeScore = rounds + (reps / 1000);
```

Uloženo do `score_primary`, sekundární do `score_secondary`.

### 4.2 For Time

- `score_primary` = čas v sekundách
- Nižší = lepší

### 4.3 Max Load

- `score_primary` = váha v kg
- Vyšší = lepší

---

## Část 5: Integrace

### 5.1 Propojení RX → Challenge

Tlačítko "Vytvořit výzvu" u RX workoutu:
1. Předvyplní challenge z RX šablony
2. Nastaví `training_template_id`
3. Auto-generuje instrukce

### 5.2 Navigace

- Přidat položku "RX Workouty" do menu (pod Tréninkové šablony)
- Route: `/rx-workouts`

---

## Soubory k vytvoření/úpravě

| Soubor | Akce |
|--------|------|
| `src/pages/RxWorkouts.tsx` | NOVÝ - hlavní stránka |
| `src/components/rx/RxImportDialog.tsx` | NOVÝ - import UI |
| `src/components/rx/RxWorkoutCard.tsx` | NOVÝ - karta workoutu |
| `src/components/rx/TrainerResultEntry.tsx` | NOVÝ - formulář zápisu |
| `src/hooks/useRxWorkouts.ts` | NOVÝ - CRUD RX |
| `src/hooks/useRxWorkoutParser.ts` | NOVÝ - parser |
| `src/hooks/useTrainerResultEntry.ts` | NOVÝ - zápis výsledků |
| `src/hooks/useTrainingTemplates.ts` | ROZŠÍŘIT - is_rx_workout |
| `src/hooks/useChallenges.ts` | ROZŠÍŘIT - gender filtr |
| `src/components/challenges/ChallengeSubmissionsView.tsx` | ROZŠÍŘIT - gender tabs |
| `src/components/AppSidebar.tsx` | ROZŠÍŘIT - navigace |
| `src/App.tsx` | ROZŠÍŘIT - route |

---

## Vizuální návrh

### Import Dialog
```
┌────────────────────────────────────────────────────┐
│ 📥 Import RX Workoutu                        [X]   │
├────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐ │
│ │ @name: Fran                                    │ │
│ │ @type: for_time                                │ │
│ │ @timecap: 10:00                                │ │
│ │                                                │ │
│ │ 21x Thruster | 43kg                            │ │
│ │ 21x Pull-up                                    │ │
│ │ ...                                            │ │
│ └────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ ✓ Parsováno: Fran (For Time, 10 min cap)           │
│ ✓ 6 cviků nalezeno                                 │
│ ⚠ 1 cvik nenalezen: "Thruster" → [Vytvořit]       │
├────────────────────────────────────────────────────┤
│                          [Zrušit] [Importovat]     │
└────────────────────────────────────────────────────┘
```

### Trenérský zápis výsledku
```
┌──────────────────────────────────────────────┐
│ 🏋️ Zápis výsledku: Fran                      │
├──────────────────────────────────────────────┤
│ Klient:  [▼ Vybrat klienta...]               │
│                                              │
│ Čas:     [ 4 ] min [ 23 ] sec                │
│                                              │
│ Poznámka: ____________________________        │
│                                              │
│               [Zrušit] [Zapsat výsledek]     │
└──────────────────────────────────────────────┘
```

### Gender Leaderboard
```
┌─────────────────────────────────────────────────────┐
│ Výsledky: Fran                                      │
├─────────────────────────────────────────────────────┤
│ [Všichni (12)] [Muži (7)] [Ženy (5)]                │
├─────────────────────────────────────────────────────┤
│ 🥇 Jan Novák         4:23                           │
│ 🥈 Petr Svoboda      4:58                           │
│ 🥉 Martin Černý      5:12                           │
│ 4. Tomáš Kučera      5:45                           │
└─────────────────────────────────────────────────────┘
```

---

## Pořadí implementace

1. **Databázové migrace** - rozšíření tabulek
2. **Parser JM_WORKOUT_V1** - jádro importu
3. **RX Workouts stránka** - seznam + import dialog
4. **Trenérský zápis výsledků** - formulář
5. **Gender leaderboard** - záložky v submissions view
6. **Navigace** - menu + routing

---

## Technické poznámky

- Existující `challenges` systém plně využit
- `training_templates` rozšířeno o `is_rx_workout` flag
- `clients.gender` již existuje pro segmentaci
- Kompozitní AMRAP skóre (rounds.reps) kompatibilní s existujícím `score_primary/score_secondary`
