

# Audit sekce Výkonnost – Zjednodušení a optimalizace (Fáze 8)

---

## Nalezené problémy

### P1: `usePerformanceOverview` dělá 11 paralelních DB queries
Hook stahuje **veškerá** data ze 3 tabulek (`exercise_entries`, `cardio_entries`, `skill_entries`) bez omezení — u aktivního trenéra to znamená tisíce řádků. Pak je ručně mapuje na kategorie. Navíc má relativně krátký `staleTime` (5 min), takže se při každém návratu na Přehled znovu spouští.

**Řešení:** Zvýšit `staleTime` na 10 minut a přidat `refetchOnMount: false`. Omezit "all entries" queries na count-only selecty (`select('id, exercise_id, exercise_name, is_pr', { count: 'exact', head: false })`) kde je to možné.

### P2: `ClientProgressView.tsx` má 1130 řádků — 6 komponent v jednom souboru
Celý soubor obsahuje `ExerciseListItem`, `ExerciseDetailView`, `WeekStrip`, `useWeekStrip`, `JournalView`, `ClientList`, `useClientMonthlyStats` a `ClientProgressView` — vše inline. To ztěžuje údržbu a zpomaluje HMR.

**Řešení:** Extrahovat do samostatných souborů: `ExerciseListItem.tsx`, `ExerciseDetailView.tsx`, `WeekStrip.tsx`, `JournalView.tsx`, `ClientList.tsx`. Hlavní `ClientProgressView.tsx` zůstane jako orchestrátor.

### P3: 4 osiřelé soubory v `src/components/exercises/analytics/` — 0 importů
- `StagnationAlertCard.tsx`
- `MovementGapsCard.tsx`
- `ClientAttentionCard.tsx`
- `UnusedExercisesCard.tsx`

Nikdo je neimportuje (ověřeno search). Mrtvý kód.

### P4: 4 osiřelé soubory v `src/components/performance/` — 0 importů
- `ProgressHeroCard.tsx`
- `ProgressSparklineGrid.tsx`
- `PRHistoryContent.tsx`
- `PRHistoryTimeline.tsx`

Nikde importovány. Legacy komponenty.

### P5: `ExercisesContent.tsx` a `ExerciseLibraryStats.tsx` — 0 importů
Obě komponenty nejsou nikde importovány. `ExercisesContent` byl nahrazen integrovanou záložkou Cviky v `PerformanceHub`. `ExerciseLibraryStats` používá `MovementPatternsCard` (jinak osiřelou) ale sama není nikde.

### P6: `WeekStrip` a `useClientMonthlyStats` dělají raw `useEffect` + `setState` místo `useQuery`
Oba hooky dělají `supabase` volání v `useEffect` bez cachování — při každém renderování klientského detailu se znovu spouští 3 paralelní queries. Žádné `staleTime`, žádný cache.

**Řešení:** Přepsat na `useQuery` s `staleTime: 5 * 60 * 1000`.

---

## Plán oprav

### 1) Smazat 10 osiřelých souborů
- `src/components/exercises/analytics/StagnationAlertCard.tsx`
- `src/components/exercises/analytics/MovementGapsCard.tsx`
- `src/components/exercises/analytics/ClientAttentionCard.tsx`
- `src/components/exercises/analytics/UnusedExercisesCard.tsx`
- `src/components/performance/ProgressHeroCard.tsx`
- `src/components/performance/ProgressSparklineGrid.tsx`
- `src/components/performance/PRHistoryContent.tsx`
- `src/components/performance/PRHistoryTimeline.tsx`
- `src/components/performance/ExercisesContent.tsx`
- `src/components/exercises/ExerciseLibraryStats.tsx`

### 2) Optimalizovat `usePerformanceOverview`
- Zvýšit `staleTime` na 10 minut
- Přidat `refetchOnMount: false`

### 3) Rozdělit `ClientProgressView.tsx` (1130 řádků → 5 souborů)
- `src/components/performance/journal/ExerciseListItem.tsx`
- `src/components/performance/journal/ExerciseDetailView.tsx`
- `src/components/performance/journal/WeekStrip.tsx`
- `src/components/performance/journal/JournalView.tsx`
- `src/components/performance/journal/ClientList.tsx`

`ClientProgressView.tsx` zůstane jako orchestrátor (~100 řádků).

### 4) Přepsat `useWeekStrip` a `useClientMonthlyStats` na `useQuery`
Převést raw `useEffect` + `setState` vzor na `useQuery` s cache, aby se data necachovala a nerefetchovala zbytečně.

---

## Technické detaily

### Soubory ke smazání (10)
Viz seznam výše — všechny mají 0 importů.

### Soubory k úpravě
- `src/hooks/usePerformanceOverview.ts` — staleTime + refetchOnMount
- `src/components/performance/ClientProgressView.tsx` — rozdělit na 5 dílčích souborů

### Soubory k vytvoření (5)
- `src/components/performance/journal/ExerciseListItem.tsx`
- `src/components/performance/journal/ExerciseDetailView.tsx`
- `src/components/performance/journal/WeekStrip.tsx`
- `src/components/performance/journal/JournalView.tsx`
- `src/components/performance/journal/ClientList.tsx`

### Očekávaný dopad
- **Smazání ~2000 řádků** mrtvého kódu (10 souborů)
- **Rychlejší Přehled** díky méně agresivnímu refetchování
- **Lepší údržba** — `ClientProgressView` z 1130 → ~100 řádků orchestrátoru
- **Rychlejší cache** pro WeekStrip a monthly stats díky `useQuery`

