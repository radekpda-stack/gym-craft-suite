
# Pokrocila analytika na karte Vykonnost -- srovnani podle pohlavi, veku a casu

## Co pridame

5 novych analytickych karet do `StrengthAnalyticsView`, ktere vyuzivaji existujici data z databaze (gender u 49 klientu, birth_date u 15, weight_kg u vsech exercise_entries):

### 1. Karta "Srovnani podle pohlavi" (GenderComparisonCard)
- Prumerna a maximalni vaha u muzu vs zen
- Pocet PR podle pohlavi
- Prumerny objem (tonnage) na trenink podle pohlavi
- Vizualizace: dvojice horizontalnich baru vedle sebe

### 2. Karta "Srovnani podle veku" (AgeGroupComparisonCard)  
- Rozdeleni klientu do vekovych skupin (pod 25, 25-35, 35-45, 45+)
- Prumerny max weight, pocet PR a frekvence treninku na skupinu
- Vizualizace: seskupeny sloupcovy graf (BarChart z recharts)
- Zobrazi se jen pokud existuji klienti s vyplnenym datem narozeni

### 3. Karta "Progrese vah v case" (WeightProgressionCard)
- Pro top 5 nejpouzivanejsich cviku zobrazuje krivku prumerne vahy po tydnech
- Vizualizace: LineChart s jednou krivkou na cvik
- Umoznuje videt, jak se vahy zvysuji/snizuji v case

### 4. Karta "Top cviky podle pohlavi" (TopExercisesByGenderCard)
- Pro muze a zeny samostatne: top 5 cviku podle max vahy
- Umoznuje trenérovi videt rozdily v preferovanych cvicich

### 5. Karta "PR distribuce v case" (PRDistributionCard)
- Heatmapa: kolik PR za mesic (rozdeleno na muze/zeny)
- Vizualizace: BarChart se stackovanymi sloupci

## Technicke detaily

### Zmeny v souboru `src/hooks/useExerciseAnalyticsComplete.ts`
- Rozsireni query o `clients.gender` a `clients.birth_date` (JOIN pres existujici client_id)
- Pridani novych vypoctu do AnalyticsData typu:
  - `genderComparison`: { male: { avgWeight, maxWeight, tonnage, prCount, entryCount }, female: {...} }
  - `ageGroupComparison`: pole { ageGroup, avgWeight, maxWeight, prCount, clientCount }
  - `weightProgression`: pole { exerciseName, weeks: { label, avgWeight }[] }
  - `topExercisesByGender`: { male: TopExercise[], female: TopExercise[] }
  - `prDistribution`: pole { month, male, female }

### Nove soubory komponent
| Soubor | Obsah |
|--------|-------|
| `src/components/exercises/analytics/GenderComparisonCard.tsx` | Srovnani muzi vs zeny (vahy, PR, objem) |
| `src/components/exercises/analytics/AgeGroupComparisonCard.tsx` | Srovnani vekovych skupin |
| `src/components/exercises/analytics/WeightProgressionCard.tsx` | Krivky vah top cviku v case |
| `src/components/exercises/analytics/TopExercisesByGenderCard.tsx` | Top cviky podle pohlavi |
| `src/components/exercises/analytics/PRDistributionCard.tsx` | Mesicni distribuce PR podle pohlavi |

### Zmeny v existujicich souborech
| Soubor | Zmena |
|--------|-------|
| `src/hooks/useExerciseAnalyticsComplete.ts` | Rozsireni AnalyticsData o nove typy a vypocty; fetch `clients.gender, clients.birth_date` |
| `src/components/exercises/analytics/StrengthAnalyticsView.tsx` | Pridani 5 novych karet pod stavajici obsah |

### Vizualni styl
- Neutralni barvy (bez hodnoceni dle design-philosophy) -- modra pro muze, fialova pro zeny
- Pouziti recharts (BarChart, LineChart) ktere uz je v projektu
- Karty budou pouzivat existujici `Card` komponentu z shadcn/ui
- Cesky jazyk ve vsech popiscich

### Data dostupnost
- Gender: 49 z 54 klientu (90%) -- dostatecne
- Birth_date: 15 z 54 (28%) -- karta s vekem zobrazi upozorneni "Data dostupna pro X klientu"
- Exercise entries s vahou: 536 zaznamu -- dostatecne pro smysluplnou analytiku
