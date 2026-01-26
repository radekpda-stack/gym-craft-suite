
# Unilaterální cviky: Volba strany L/R a výpočet asymetrie

## Shrnutí

Požadavek: Při zápisu jednoručních/jednonožních cviků umožnit výběr strany (L/R) a automaticky počítat procentuální rozdíl síly mezi končetinami. Funkce bude dostupná jak pro trenéra, tak pro klienty.

## Co již existuje

Systém má solidní základ:

| Komponenta | Stav | Kde se používá |
|------------|------|----------------|
| `exercises.is_unilateral` | Hotovo | 16 cviků označeno (Pistole, Bird dog, Single Leg Jump...) |
| `exercise_entries.side` | Hotovo | Sloupec s hodnotami `left`/`right`/`both`/`none` |
| `SideSelector` | Hotovo | Pouze v trenérské aplikaci (QuickLogDialog, QuickExerciseAdd) |
| `SideBadge` | Hotovo | K dispozici, ale málo používané |
| `useAsymmetryAnalysis` | Hotovo | Počítá procentuální rozdíl L vs R |
| `AsymmetryCard` | Hotovo | Pouze v trenérském detailu klienta |

## Co chybí a bude implementováno

### 1. Přidání výběru strany do klientského formuláře

V `SimpleAddWorkoutDialog.tsx` klient aktuálně nemůže zvolit stranu. Rozšíření:

```text
┌─────────────────────────────────────────────┐
│ Single Leg Glute Bridge              [X]    │
├─────────────────────────────────────────────┤
│ 🦵 Unilaterální cvik                        │
│ ┌─────┬─────────┬─────┐                     │
│ │  L  │   Obě   │  R  │  ← SideSelector     │
│ └─────┴─────────┴─────┘                     │
├─────────────────────────────────────────────┤
│ Série: [3]  Opakování: [10]  Váha: [0]     │
└─────────────────────────────────────────────┘
```

### 2. Rozšíření interface ExerciseInput

```typescript
interface ExerciseInput {
  name: string;
  exerciseId?: string;
  sets: string;
  reps: string;
  weight: string;
  isUnilateral?: boolean;  // NOVÉ
  side?: 'left' | 'right' | 'both';  // NOVÉ
}
```

### 3. Přidání AsymmetryCard do klientského portálu

Na stránce `ClientPortalProgress.tsx` přidat kartu asymetrie:

```text
┌──────────────────────────────────────────────┐
│ ⚖️ ASYMETRIE L vs R                         │
├──────────────────────────────────────────────┤
│ Single Leg Glute Bridge         [15%]       │
│ L ████████████░░░ 25kg | 30kg ███████████ R │
│      → Pravá strana silnější                 │
├──────────────────────────────────────────────┤
│ Pistole                          [8%]        │
│ L ██████████████ 12× | 13× ██████████████ R │
│          Symetrický výkon                    │
└──────────────────────────────────────────────┘
│ Legenda: <10% ● | 10-20% ● | >20% ●         │
└──────────────────────────────────────────────┘
```

### 4. Zobrazení badge L/R ve workout diary

V seznamu cviků (SimpleWorkoutCard, WorkoutDateDetailDialog) přidat vizuální indikátor strany:

```text
Single Leg Glute Bridge [L]  3×10 • 25kg
Single Leg Glute Bridge [R]  3×10 • 30kg
```

---

## Implementační kroky

| Krok | Soubor | Změna |
|------|--------|-------|
| 1 | `src/components/client-portal/workout-diary/SimpleAddWorkoutDialog.tsx` | Rozšířit `ExerciseInput` o `side`, detekovat `is_unilateral` z exercise lookup, zobrazit `SideSelector` |
| 2 | `src/hooks/useExerciseDetailsLookup.ts` | Přidat `is_unilateral` do lookup dat |
| 3 | `src/pages/client-portal/ClientPortalProgress.tsx` | Přidat `AsymmetryCard` do stránky pokroku |
| 4 | `src/components/client-portal/workout-diary/SimpleWorkoutCard.tsx` | Zobrazit `SideBadge` u unilaterálních cviků |
| 5 | `src/components/client-portal/workout-diary/WorkoutDateDetailDialog.tsx` | Zobrazit `SideBadge` u unilaterálních cviků |
| 6 | `src/components/client-portal/workout-diary/PlannedWorkoutDetailSheet.tsx` | Zobrazit `SideBadge` u unilaterálních cviků |

---

## Technické detaily

### Detekce unilaterálního cviku

Při výběru cviku v `SimpleAddWorkoutDialog` se načte `is_unilateral` z exercise lookup:

```typescript
const handleExerciseSelect = (exercise) => {
  const details = exerciseLookup.get(exercise.name.toLowerCase());
  setExercises(prev => [...prev, {
    name: exercise.name,
    exerciseId: exercise.id,
    sets: '',
    reps: '',
    weight: '',
    isUnilateral: details?.is_unilateral || false,
    side: details?.is_unilateral ? 'both' : undefined,
  }]);
};
```

### Uložení strany do databáze

V handleSave předat `side`:

```typescript
exercises: exercises.map(e => ({
  exercise_name: e.name,
  exercise_id: e.exerciseId,
  sets: parseInt(e.sets) || undefined,
  reps: parseInt(e.reps) || undefined,
  weight_kg: parseFloat(e.weight) || undefined,
  side: e.isUnilateral ? e.side : 'none',
})),
```

### Výpočet asymetrie

Hook `useAsymmetryAnalysis` již existuje a automaticky:
- Seskupí záznamy podle cviku a strany
- Vybere nejlepší výkon pro každou stranu
- Vypočítá procento: `((max - min) / max) * 100`
- Určí dominantní stranu

---

## Vedlejší benefity

1. **Vzdělávání klientů** - Klienti uvidí své nerovnováhy a pochopí proč trénují jednostranně
2. **Motivace** - Sledování pokroku vyrovnávání asymetrií
3. **Konzistence** - Stejná funkcionalita pro trenéra i klienta
4. **Přesnost dat** - Oddělené PR pro levou a pravou stranu

---

## Časový odhad

| Krok | Čas |
|------|-----|
| Rozšíření lookup hooku | 5 min |
| Úprava SimpleAddWorkoutDialog | 25 min |
| Přidání AsymmetryCard do Progress | 5 min |
| Přidání SideBadge do workout karet | 15 min |
| Testování | 10 min |
| **Celkem** | **~60 min** |
