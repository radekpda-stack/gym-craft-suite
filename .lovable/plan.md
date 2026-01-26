
# Přidání popisků cviků pro klienty

## Shrnutí situace

Dobrá zpráva: **Databáze už popisky podporuje!** Sloupce `description_cs` (popis) a `instructions_cs` (instrukce) již existují. Problém je, že:
1. Pouze 7 ze 195 cviků má vyplněné instrukce
2. Klientská aplikace tyto popisky nezobrazuje

---

## Co bude implementováno

### 1. Rozšíření interface DiaryExercise
Přidání polí pro popis cviku do datového modelu

### 2. Obohacení dat o popisky z exercises tabulky
Při načítání cviků v deníku se přidají popisy přímo z hlavní tabulky cviků

### 3. Rozkliknutelný detail cviku v klientské zóně
- Klient klikne na název cviku → otevře se modal/sheet s:
  - **Název cviku**
  - **Popis** (co cvik je, na co je zaměřen)
  - **Instrukce k provedení** (jak správně cvičit)
  - **Vybavení** (pokud relevantní)
  - **Svalové skupiny** (pokud relevantní)

### 4. Vizuální indikace dostupnosti popisu
Cviky s popisem budou mít ikonu "info" u názvu

---

## Návrh UI pro klienta

```text
┌─────────────────────────────────────────┐
│  BENCH PRESS                          ℹ️│  ← Kliknutelný
│  3×10 • 80 kg                           │
└─────────────────────────────────────────┘
         ↓ Po kliknutí se otevře:
┌─────────────────────────────────────────┐
│ ← Bench press                           │
├─────────────────────────────────────────┤
│                                         │
│ 📝 POPIS                                │
│ Základní tlakový cvik na lavici pro     │
│ rozvoj hrudníku, ramen a tricepsů.      │
│                                         │
│ 📋 JAK CVIČIT                           │
│ 1. Lehni si na lavici, nohy pevně na    │
│    zemi                                 │
│ 2. Uchop činku šířeji než ramena        │
│ 3. Spusť činku kontrolovaně k hrudníku  │
│ 4. Vytlač zpět do výchozí pozice        │
│                                         │
│ 🏋️ VYBAVENÍ                             │
│ [Činka] [Lavice]                        │
│                                         │
│ 💪 SVALOVÉ SKUPINY                       │
│ [Hrudník] [Ramena] [Triceps]            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementační kroky

| Krok | Soubor | Změna |
|------|--------|-------|
| 1 | `src/hooks/useUnifiedDiary.ts` | Rozšířit `DiaryExercise` o `description_cs`, `instructions_cs`, a přidat JOIN na `exercises` tabulku |
| 2 | Nový soubor: `src/components/client-portal/workout-diary/ExerciseDetailSheet.tsx` | Nová komponenta pro zobrazení detailu cviku |
| 3 | `src/components/client-portal/workout-diary/PlannedWorkoutDetailSheet.tsx` | Přidat kliknutelnost na cviky a otevírání detailu |
| 4 | `src/components/client-portal/workout-diary/WorkoutDateDetailDialog.tsx` | Přidat stejnou funkcionalitu |

---

## Technické detaily

### Rozšíření DiaryExercise interface

```typescript
export interface DiaryExercise {
  id: string;
  exercise_name: string;
  exercise_id?: string | null;
  // ... existující pole
  
  // Nové pole pro popisy (z exercises tabulky)
  description_cs?: string | null;
  instructions_cs?: string | null;
  equipment?: string[] | null;
  muscle_groups?: string[] | null;
}
```

### Obohacení dat v useUnifiedDiary

Buď:
- **Varianta A**: JOIN při dotazu (složitější, ale efektivní)
- **Varianta B**: Samostatný dotaz na exercises a merge v JS (jednodušší)

Doporučuji Variantu B - při načtení deníku se sesbírají exercise_id, udělá se jeden dotaz na exercises tabulku, a popisy se přimapují.

### Nová komponenta ExerciseDetailSheet

```typescript
interface ExerciseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: {
    name: string;
    description_cs?: string | null;
    instructions_cs?: string | null;
    equipment?: string[] | null;
    muscle_groups?: string[] | null;
  } | null;
}
```

---

## Poznámky k datům

Aktuálně máte vyplněno:
- **143/195** cviků má popis (`description_cs`)
- **7/195** cviků má instrukce (`instructions_cs`)

Po implementaci můžete průběžně doplňovat instrukce v knihovně cviků → záložka "Poznámky".

---

## Vedlejší benefity

1. **Motivace k vyplnění** - Jakmile klienti uvidí, že některé cviky mají popis a jiné ne, budete mít motivaci doplnit chybějící
2. **Vzdělávání klientů** - Klienti pochopí, co cvičili
3. **Konzistence** - Jeden zdroj pravdy (exercises tabulka)
