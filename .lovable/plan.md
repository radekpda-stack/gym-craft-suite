

# Přestavba Analytiky Výkonnosti -- zaměření na klienty a cviky

## Co se změní

Sekce Analytika v kartě Výkonnost se přestaví tak, aby se zaměřila na **skutečné posuny klientů, srovnání mezi klienty a data o cvicích** (váhy, kardio, plyo). Odstraní se karty, které vás nezajímají, a přidají se nové, užitečnější.

### Karty k odstranění
- **StagnationAlertCard** (stagnace)
- **MovementGapsCard** (pohybové vzorce)
- **UnusedExercisesCard** (nepoužité cviky)
- **ClientAttentionCard** (klienti vyžadující pozornost)
- **PRDistributionCard** (distribuce PR)
- KPI "Pozornost" a "Tonnage" z horního řádku

### Karty k ponechání (upravené)
- **KPI řádek** -- zůstane frekvence, RPE, BW reps; tonnage se nahradí za "Ø váha/záznam" a PR se nahradí za "Aktivní klienti"
- **GenderComparisonCard** -- rozšíří se o Ø váhu na záznam a frekvenci
- **AgeGroupComparisonCard** -- rozšíří se o frekvenci a objem na klienta
- **WeightProgressionCard** -- zůstane (progrese vah top cviků)
- **TopExercisesByGenderCard** -- zůstane
- **RPE karty** -- zůstanou (RPE by Exercise + RPE Progress Correlation)
- **TopExercisesTable** -- zůstane

### Nové karty

1. **ClientProgressLeaderboard** -- Žebříček klientů seřazený podle skutečného zlepšení (nárůst Ø váhy, frekvence, počet záznamů). Každý klient s mini-sparkline trendem. Filtr: síla / kardio / plyo.

2. **ClientVolumeComparisonCard** -- Sloupcový graf srovnávající celkový objem (kg) nebo čas (kardio) mezi klienty za zvolené období. Umožňuje vidět kdo trénuje nejvíc.

3. **ExercisePopularityByClientCard** -- Tabulka: jaký cvik u kterého klienta a jak často, s max váhou. Odpovídá na "co s kým dělám a jak mu to jde".

4. **ClientWeightProgressionCard** -- Stejný koncept jako WeightProgressionCard, ale místo top 5 cviků zobrazí top 5 klientů a jejich Ø váhu po týdnech -- posuny klientů v čase.

5. **CardioClientComparisonCard** -- Srovnání kardio metrik (celkový čas, vzdálenost, Ø watts, Ø HR) mezi klienty. Data z `cardio_entries`.

6. **SkillClientComparisonCard** -- Srovnání skill/plyo aktivity mezi klienty (počet záznamů, unikátní cviky). Data z `skill_entries`.

## Nové rozložení stránky

```text
+--[ Filtry (období, klient, testy) ]--+

+--[ KPI: Ø váha | Aktivní klienti | Frekvence | RPE | BW reps ]--+

+--[ Client Progress Leaderboard (full width) ]--+

+--[ Client Volume Comparison ]--+--[ Client Weight Progression ]--+

+--[ Gender Comparison ]--------+--[ Age Group Comparison ]--------+

+--[ Weight Progression (top cviky, full width) ]--+

+--[ Top Exercises by Gender ]--+--[ Exercise Popularity by Client ]--+

+--[ Cardio Client Comparison ]-+--[ Skill Client Comparison ]--------+

+--[ RPE by Exercise ]----------+--[ RPE Progress Correlation ]------+

+--[ Top Exercises Table (full width) ]--+
```

## Technické detaily

### Hook `useExerciseAnalyticsComplete`
- Odstraní se výpočty pro `stagnatingClients`, `movementGaps`, `unusedExercises`, `clientsNeedingAttention`, `prDistribution`
- Přidají se nové datové struktury:
  - `clientProgressRanking`: pro každého klienta vypočte Ø váhu v 1. a 2. polovině období, nárůst, frekvenci, počet záznamů
  - `clientVolumeComparison`: celkový objem (kg) per klient
  - `exerciseByClient`: matice cvik x klient (počet, max váha)
  - `clientWeightProgression`: týdenní Ø váha per klient (top 5 klientů dle objemu)

### Nový hook `useClientCardioComparison`
- Dotaz na `cardio_entries` seskupený po klientech
- Vrátí: celkový čas, vzdálenost, Ø watts, Ø HR per klient

### Nový hook `useClientSkillComparison`
- Dotaz na `skill_entries` seskupený po klientech
- Vrátí: počet záznamů, unikátní cviky per klient

### Nové komponenty (6 souborů)
- `ClientProgressLeaderboard.tsx`
- `ClientVolumeComparisonCard.tsx`
- `ExercisePopularityByClientCard.tsx`
- `ClientWeightProgressionCard.tsx`
- `CardioClientComparisonCard.tsx`
- `SkillClientComparisonCard.tsx`

### Upravené soubory
- `StrengthAnalyticsView.tsx` -- nové rozložení, nové importy, odstranění starých karet
- `AnalyticsKPIRow.tsx` -- nahrazení Tonnage za Ø váha, PR za Aktivní klienti, odstranění Pozornost
- `useExerciseAnalyticsComplete.ts` -- rozšíření dat, odstranění nepotřebných výpočtů
- `GenderComparisonCard.tsx` -- rozšíření o frekvenci
- `AgeGroupComparisonCard.tsx` -- rozšíření o objem na klienta

### Odstraněné soubory (nepoužívané po refactoru)
- Žádné soubory se nemažou (mohou být použity jinde), ale importy se odstraní z `StrengthAnalyticsView.tsx`

### Databáze
- Žádné změny schématu -- vše se počítá z existujících tabulek (`exercise_entries`, `cardio_entries`, `skill_entries`, `clients`)

