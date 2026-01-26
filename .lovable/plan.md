

# Unilaterální cviky: Volba strany L/R a výpočet asymetrie

## Souhrn změn

Implementace umožní klientům a trenérům zaznamenávat stranu (levá/pravá/obě) u jednostranných cviků a automaticky počítat procentuální rozdíl síly mezi končetinami.

---

## Databázová změna

### Přidání sloupce `side` do `client_workout_exercises`

```sql
ALTER TABLE client_workout_exercises
ADD COLUMN side TEXT DEFAULT 'none' 
CHECK (side IN ('left', 'right', 'both', 'none'));
```

**Důvod:** Tabulka `exercise_entries` (trenérská) už má sloupec `side`, ale klientská tabulka `client_workout_exercises` ho postrádá.

---

## Změny v kódu

### 1. Rozšíření `useExerciseDetailsLookup.ts`

Přidat `is_unilateral` do interface a dotazu:

```typescript
export interface ExerciseLookupData {
  // ... existing fields
  is_unilateral: boolean;  // NOVÉ
}

// V dotazu přidat:
.select('id, name, name_cs, description_cs, instructions_cs, equipment, muscle_groups, is_unilateral')
```

---

### 2. Úprava `SimpleAddWorkoutDialog.tsx`

**Rozšíření interface:**
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

**Při přidání cviku:**
- Detekovat `is_unilateral` z exercise lookup
- Defaultně nastavit `side: 'both'` pro unilaterální cviky

**UI změna:**
- Pod názvem unilaterálního cviku zobrazit `SideSelector` (L / Obě / R)
- Vizuální indikace pomocí badge pro jednostranné cviky

**Úprava handleSave:**
```typescript
exercises: exercises.map(e => ({
  exercise_name: e.name,
  exercise_id: e.exerciseId,
  sets: parseInt(e.sets) || undefined,
  reps: parseInt(e.reps) || undefined,
  weight_kg: parseFloat(e.weight) || undefined,
  side: e.isUnilateral ? e.side : 'none',  // NOVÉ
})),
```

---

### 3. Úprava `useClientWorkoutLogs.ts`

**Rozšíření `WorkoutExercise` interface:**
```typescript
export interface WorkoutExercise {
  // ... existing fields
  side?: 'left' | 'right' | 'both' | 'none' | null;  // NOVÉ
}
```

**Při insertu cviků:**
```typescript
const exercisesToInsert = input.exercises.map((ex, idx) => ({
  // ... existing fields
  side: ex.side || 'none',  // NOVÉ
}));
```

---

### 4. Úprava `useUnifiedDiary.ts`

**Rozšíření `DiaryExercise` interface:**
```typescript
export interface DiaryExercise {
  // ... existing fields
  side?: 'left' | 'right' | 'both' | 'none' | null;  // NOVÉ
}
```

---

### 5. Zobrazení `SideBadge` ve workout kartách

**Soubory k úpravě:**
- `SimpleWorkoutCard.tsx` - zobrazit badge u cviků v rozbalené sekci
- `WorkoutDateDetailDialog.tsx` - zobrazit badge u seznamu cviků
- `PlannedWorkoutDetailSheet.tsx` - zobrazit badge u plánovaných cviků

**Příklad zobrazení:**
```
Single Leg Glute Bridge [L]  3×10 • 25kg
Pistole [R]  3×8
Bird Dog [L+R]  3×12
```

---

### 6. Přidání `AsymmetryCard` do `ClientPortalProgress.tsx`

Import existující komponenty a přidání do stránky:

```tsx
import { AsymmetryCard } from '@/components/client-portal/progress/AsymmetryCard';

// V renderovací části:
{clientId && <AsymmetryCard clientId={clientId} />}
```

Hook `useAsymmetryAnalysis` již existuje a automaticky:
- Seskupí záznamy podle cviku a strany
- Vybere nejlepší výkon pro každou stranu
- Vypočítá procento: `((max - min) / max) * 100`
- Určí dominantní stranu

---

## Vizuální návrh

### Výběr strany v dialogu přidání tréninku:

```
┌─────────────────────────────────────────────┐
│ Pistole                              [X]    │
├─────────────────────────────────────────────┤
│ 🦵 Jednostranný cvik                        │
│ ┌─────┬─────────┬─────┐                     │
│ │  L  │   Obě   │  R  │                     │
│ └─────┴─────────┴─────┘                     │
├─────────────────────────────────────────────┤
│ Série: [3]  Opakování: [8]                  │
└─────────────────────────────────────────────┘
```

### Karta asymetrie na stránce Pokrok:

```
┌──────────────────────────────────────────────┐
│ ⚖️ ASYMETRIE L vs R                          │
├──────────────────────────────────────────────┤
│ Single Leg Glute Bridge         [15%]        │
│ L ████████░░░░ 25kg | 30kg ██████████████ R  │
│      → Pravá strana silnější                 │
├──────────────────────────────────────────────┤
│ Pistole                          [8%]        │
│ L ██████████ 12× | 13× ██████████████████ R  │
│          Symetrický výkon                    │
└──────────────────────────────────────────────┘
│ Legenda: <10% ● | 10-20% ● | >20% ●          │
└──────────────────────────────────────────────┘
```

---

## Soubory k úpravě

| Soubor | Typ změny |
|--------|-----------|
| Databáze `client_workout_exercises` | Migrace - přidat sloupec `side` |
| `src/hooks/useExerciseDetailsLookup.ts` | Přidat `is_unilateral` |
| `src/hooks/useClientWorkoutLogs.ts` | Přidat `side` do interface a insert |
| `src/hooks/useUnifiedDiary.ts` | Přidat `side` do `DiaryExercise` |
| `src/components/client-portal/workout-diary/SimpleAddWorkoutDialog.tsx` | Přidat `SideSelector` pro unilaterální cviky |
| `src/components/client-portal/workout-diary/SimpleWorkoutCard.tsx` | Zobrazit `SideBadge` |
| `src/components/client-portal/workout-diary/WorkoutDateDetailDialog.tsx` | Zobrazit `SideBadge` |
| `src/components/client-portal/workout-diary/PlannedWorkoutDetailSheet.tsx` | Zobrazit `SideBadge` |
| `src/pages/client-portal/ClientPortalProgress.tsx` | Přidat `AsymmetryCard` |

---

## Existující komponenty k využití

- `SideSelector` - UI pro výběr strany (L / Obě / R)
- `SideBadge` - vizuální badge [L], [R], [L+R]
- `useAsymmetryAnalysis` - hook pro výpočet asymetrie
- `AsymmetryCard` - karta s vizualizací asymetrie

---

## Poznámky

- **16 cviků** je již označeno jako `is_unilateral` v databázi (Pistole, Bird dog, Single Leg Jump, atd.)
- Hook `useAsymmetryAnalysis` automaticky počítá asymetrie z `exercise_entries` - bude fungovat pro trenérské záznamy ihned
- Pro klientské záznamy bude potřeba rozšířit hook, aby zahrnoval i `client_workout_exercises`

