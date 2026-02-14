
# Oprava mobilniho UI na karte Vykonnost -- podkategorie a dalsi karty

## Identifikovane problemy

### 1. Analytika > Sila: KPI radek (AnalyticsKPIRow)
- 5 KPI karet v gridu `grid-cols-2 sm:grid-cols-4 lg:grid-cols-5` -- na mobilu 5. karta (`col-span-2`) zabira cely radek, ale prvni 4 se tisknou do 2 sloupcu, coz je OK
- **Problem**: Texty jako "FREKVENCE" a "POZORNOST" se mohou orizavat v 2-sloupcovem gridu na uzkych telefonech

### 2. Analytika > Sila: Filters Bar (AnalyticsFiltersBar)
- Sticky bar s `flex-col sm:flex-row` -- na mobilu se client selector roztahne na plnou sirku, coz je spravne
- **Problem**: Switch "Zahrnout testy" ma `ml-auto` coz na mobilu (flex-col) nefunguje spravne -- zustavava vlevo bez vizualniho oddeleni

### 3. Analytika > Sila: 3 karty v radku (Stagnace, Pohybove vzorce, Nepouzivane cviky)
- Grid `grid-cols-1 lg:grid-cols-3` -- na mobilu plna sirka, OK
- **Problem u MovementGapsCard**: Label siroke `w-20` (80px) muze byt malo pro delsi ceske nazvy jako "Core anti-lateralni flexe" -- orizne se

### 4. Analytika > Sila: RPE vs. progrese (RPEProgressCorrelationCard)
- **Problem**: Na mobilu se radek s metrikami (`weightTrend`, `rpeTrend`, status label) tiskne do jednoho radku, ale na uzkem displeji se prekryvaji -- `shrink-0` brani wrap

### 5. Analytika > Sila: Top cviky tabulka (TopExercisesTable)
- HTML tabulka s 6 sloupci -- na mobilu se horizontalne posouva (ScrollArea), ale neni to zrejme
- **Problem**: Sloupec "Cvik" ma `max-w-[200px]` coz na mobilu zabira vetsi cast, zatimco ostatni sloupce se stisnuji

### 6. Analytika > Sila: Gender Comparison (GenderComparisonCard)
- **Problem**: YAxis s `width={90}` zabira moc mista na mobilu u horizontalniho BarChartu -- labely "Max vaha (kg)" jsou prilis siroky

### 7. Analytika > Sila: Weight Progression (WeightProgressionCard)
- **Problem**: Legend s 5 nazvy cviku se na mobilu lami do vice radku a zabira moc prostoru. Nazvy cviku mohou byt dlouhe ("Bench Press s jednorukami")

### 8. Analytika > Kardio: KPI karty
- Grid `grid-cols-2 sm:grid-cols-5` -- na mobilu 5 karet do 2 sloupcu = 3 radky, 5. karta sama
- **Problem**: Label "DNI S TRENINKEM" se muze orizavat

### 9. Analytika > Skill: KPI karty
- Grid `grid-cols-3` bez responzivniho breakpointu -- na mobilu 3 karty v radku prilis uzke
- **Problem**: "UNIKATNI SKILLY" a "DNI S TRENINKEM" se orizavaji

### 10. Analytika sub-taby (ExerciseAnalyticsView)
- Sub-taby Sila/Kardio/Skill pouzivaji texty na vsech velikostech
- **Problem**: Na uzkem mobilu se taby mohou stisknout

## Reseni

### A. AnalyticsKPIRow -- horizontalni scroll na mobilu
- Zmena z `grid grid-cols-2` na `flex overflow-x-auto snap-x` na mobilu, `sm:grid sm:grid-cols-4 lg:grid-cols-5` od sm+
- Kazda KPI karta: `min-w-[130px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start`

### B. AnalyticsFiltersBar -- lepsi mobilni layout
- Switch + label zabalit do vlastniho `flex` radku s vizualnim oddelenim

### C. RPEProgressCorrelationCard -- wrap metrik na mobilu
- Zmena `shrink-0` na `flex-wrap` pro metriky radek, status label na novy radek na mobilu

### D. GenderComparisonCard -- uzsi Y osa na mobilu
- Zmensit YAxis `width` z 90 na 70 a zkratit labely ("Max (kg)" misto "Max vaha (kg)")

### E. WeightProgressionCard -- Legend pod graf
- Pridat `wrapperStyle` pro Legend s `fontSize: 10` a omezit delku nazvu

### F. Kardio KPI -- horizontalni scroll
- Zmena gridu na `flex overflow-x-auto snap-x` na mobilu, `sm:grid sm:grid-cols-5` od sm+

### G. Skill KPI -- zmena na 2 sloupce na mobilu
- `grid-cols-2 sm:grid-cols-3` misto `grid-cols-3`

### H. ExerciseAnalyticsView sub-taby -- mensi na mobilu
- Text `text-xs sm:text-sm`, padding `px-2 sm:px-3`

### I. TopExercisesTable -- vizualni hint pro scroll
- Pridat gradient fade na prave strane na mobilu jako indikace scrollovatelnosti

## Zmeny v souborech

| Soubor | Zmena |
|--------|-------|
| `src/components/exercises/analytics/AnalyticsKPIRow.tsx` | Horizontalni scroll na mobilu misto 2-col gridu |
| `src/components/exercises/analytics/AnalyticsFiltersBar.tsx` | Lepsi rozlozeni switch a filru na mobilu |
| `src/components/exercises/analytics/RPEProgressCorrelationCard.tsx` | Flex-wrap pro metriky na mobilu |
| `src/components/exercises/analytics/GenderComparisonCard.tsx` | Uzsi Y osa, kratsi labely |
| `src/components/exercises/analytics/WeightProgressionCard.tsx` | Kompaktnejsi legenda |
| `src/components/exercises/analytics/CardioAnalyticsView.tsx` | Horizontalni scroll KPI na mobilu |
| `src/components/exercises/analytics/SkillAnalyticsView.tsx` | 2 sloupce KPI na mobilu misto 3 |
| `src/components/exercises/ExerciseAnalyticsView.tsx` | Mensi sub-taby na mobilu |
| `src/components/exercises/analytics/TopExercisesTable.tsx` | Uzsi sloupce na mobilu, lepsi truncate |
