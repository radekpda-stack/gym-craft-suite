
# Plán: Našeptávač cviků ve formuláři Výkonnost

## Problém
`TrainerStrengthInputForm` používá `Select` s až 100 cviky bez možnosti vyhledávání. Na mobilu je to nepoužitelné.

## Řešení

Nahradit `Select` komponentou `ExerciseAutocomplete` (již existuje v `src/components/client-portal/workout-diary/ExerciseAutocomplete.tsx`) a hardcoded `POPULAR_EXERCISES` nahradit hookem `usePopularExercises` (také existuje).

### Změny v `TrainerStrengthInputForm.tsx`:
1. **Odstranit** `Select` dropdown (řádky 157-171) a hardcoded `POPULAR_EXERCISES` (řádky 21-29)
2. **Přidat** `ExerciseAutocomplete` — při výběru nastaví `exerciseId` + `exerciseName`
3. **Přidat** `usePopularStrengthExercises(6)` — zobrazit chipy nejpoužívanějších cviků nad vyhledáváním
4. **Drobná úprava `ExerciseAutocomplete`**: přidat normalizaci diakritiky do vyhledávání (stejný `normalizeText` pattern jako v ProductSearchAndFilters)

### Změny v `ExerciseAutocomplete.tsx`:
1. Přidat `normalizeText` funkci pro ignorování diakritiky
2. Filtrovat návrhy přes normalizovaný text (klientská strana) vedle stávajícího `ilike` dotazu

Žádné DB změny.
