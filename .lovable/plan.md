
# Oprava kliknutí na cvik v sekci Výkonnost -- detail cviku místo přesměrování

## Problem

Když v sekci **Výkonnost > Klienti** klikneš na sparkline kartu cviku (např. Bench Press), aplikace tě přesměruje na kartu klienta (`/clients/{id}?tab=performance`). To je zbytečný a neintuitivní -- trenér chce vidět detail cviku přímo na místě, ne odcházet ze sekce Výkonnost.

## Příčina

V `ClientProgressView.tsx` (řádek 45-48) funkce `handleExerciseClick` volá `navigate()` na kartu klienta:
```typescript
const handleExerciseClick = (exercise) => {
  navigate(`/clients/${selectedClientId}?tab=performance&exercise=...`);
};
```

## Řešení

Místo navigace pryč ze stránky se po kliknutí na sparkline kartu **otevře inline detail cviku** přímo pod sparkline gridem. Využijeme existující komponentu `ExerciseDetailView` z `ClientExercisesView.tsx`, která už obsahuje:

- Graf progrese s PR body
- Statistiky (max váha / nejlepší čas, počet PR, trend)
- Historii záznamů

### Postup

1. **Přidat stav `selectedExercise`** do `ClientProgressView.tsx` pro sledování vybraného cviku
2. **Nahradit `handleExerciseClick`** -- místo `navigate()` nastavit vybraný cvik do stavu
3. **Zobrazit detail cviku inline** -- pod sparkline gridem se objeví detailní pohled s grafem, statistikami a historií
4. **Tlačítko "Zpět"** vrátí uživatele na přehled sparkline karet (bez navigace na jinou stránku)
5. **Extrahovat `ExerciseDetailView`** do samostatné sdílené komponenty, aby mohla být použita jak v `ClientExercisesView`, tak v `ClientProgressView`

### Uživatelský flow po opravě

1. Výkonnost > Klienti > vybrat klienta
2. Vidím sparkline grid s cviky
3. Kliknu na "Bench Press"
4. Pod gridem (nebo místo gridu) se zobrazí detail: graf progrese, max váha, počet PR, historie záznamů
5. Kliknu "Zpět" a jsem zpátky na sparkline přehledu

## Technické detaily

| Soubor | Změna |
|--------|-------|
| `src/components/performance/ExerciseProgressDetail.tsx` | Nová komponenta -- extrahovaný detail cviku s grafem a historií (z existujícího `ExerciseDetailView`) |
| `src/components/performance/ClientProgressView.tsx` | Nahrazení `navigate()` za inline zobrazení detailu, přidání stavu pro vybraný cvik |
| `src/components/exercises/ClientExercisesView.tsx` | Refaktor -- `ExerciseDetailView` nahradí import sdílené komponenty |
