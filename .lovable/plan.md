
# Audit statistik -- kompletni prehled prace

## Nalezene chyby

### 1. BUG: `ExerciseStatsSection` existuje, ale neni pouzita nikde
Komponenta `ExerciseStatsSection.tsx` (cviky: RPE, PR, objem, kardio) je plne implementovana, ale **neni zarazena do zadne zalozky** na strance `Statistics.tsx`. Stranky maji 4 zalozky (Kariera, Finance, Treninky, Klienti) -- cviceni/vykon tam uplne chybi.

**Oprava:** Pridat 5. zalozku "Cviky" nebo integrovat klicove metriky (objem, PRs, kardio) do zalozky Treninky.

### 2. BUG: `ClientFeedbackCard` pouziva evaluacni barvy a texty
V `ClientFeedbackCard.tsx` (radky 15-21) funkce `getScoreDisplay` vraci:
- cervena: "Ke zlepseni"
- zluta: "Dobre"
- zelena: "Vyborne"

Toto porušuje analytickou filozofii projektu (zadne evaluacni prvky).

**Oprava:** Odstranit evaluacni texty, zobrazit pouze cislo a neutral progress bar.

### 3. BUG: `CohortRetentionCard` pouziva zeleno-cervene hodnoceni retence
V `CohortRetentionCard.tsx` (radky 14-27) funkce `getRetentionColor` prirazuje:
- 80%+ = zelena (`bg-success`)
- 20- = cervena (`bg-destructive/70`)

Toto je evaluacni semafor -- porušeni design pravidel.

**Oprava:** Pouzit neutralni skalu intenzity (monochrom/primary gradace).

### 4. BUG: `FinanceChartsSection` trend ma zeleno-cervene barvy
Radky 123-134: `text-emerald-600` / `text-destructive` pro trend. Porušeni pravidel.

**Oprava:** Nahradit neutralnimi `text-muted-foreground`.

### 5. BUG: `PeriodComparisonCard` pouziva evaluacni barvy
`TrendIndicator` (radky 18-22): `text-emerald-600` / `text-destructive`.

**Oprava:** Sjednotit na neutralni barvy.

### 6. BUG: `VolumeStatsCard` pouziva evaluacni barvy trendu
Radky 82-89: `text-success` / `text-destructive` pro trend objemu.

**Oprava:** Neutralni barvy.

### 7. BUG: `CapacityUtilizationCard` - hardcoded "176 slotu"
Radek 56: `z odhadovaných 176 slotů` (22 dnu * 8 treninku). Tento odhad neni konfigurovatelny a muze byt pro konkretniho trenera nerealisticky.

**Oprava:** Zobrazit pouze pocet treninku a procento bez falesne presneho maxima.

### 8. BUG: `useBusinessHealthMetrics` -- hodinova sazba = pocet treninku
Radek 97: `const hours = mTrainings.length; // ~1h per training`. Kazdy trenink se pocita jako 1 hodina bez ohledu na skutecnou `duration` (ktera muze byt 30, 60, 90 minut).

**Oprava:** Pouzit skutecnou `duration` z treninku pro vypocet hodinove sazby.

---

## Co vyradit (zbytecne/duplicitni)

### 9. `LifetimeStatsSection` je duplicitni s `CareerStatsSection`
Komponenta `LifetimeStatsSection.tsx` existuje jako starsí verze kariernich statistik se stejnymi daty (useLifetimeStats). `CareerStatsSection` ji nahrazuje. `LifetimeStatsSection` neni nikde importovana.

**Oprava:** Smazat soubor `LifetimeStatsSection.tsx` jako mrtvy kod.

### 10. Karta "Rozlozeni prijmu" (donut chart v `FinanceChartsSection`) je zbytecna
Donut chart ukazuje Treninky vs Produkty -- tato informace uz je v `ProfitLossCard` a v `FinanceHeroKPI`. Trojite zobrazeni stejne metriky.

**Oprava:** Odstranit donut chart z `FinanceChartsSection`, ponechat pouze trend graf.

---

## Co pridat/vylepsit (nevyuzita data)

### 11. Chybi: Feedback metriky z bohatych dat
Tabulka `training_feedback` obsahuje 40+ sloupcu, ale statistiky pouzivaji pouze `body_feel` a `session_fit`. Nevyuzita data:
- `sleep_quality`, `sleep_hours` -- prumerna kvalita spanku klientu
- `energy_rating` / `energy_level` -- energeticke trendy
- `pain` + `is_red_flag` -- pocet red flagu za obdobi
- `doms_level` -- trendy svalovych bolesti
- `readiness_level` -- pripravenost na trenink
- `enjoyment_level` -- mira zazitkove spokojenosti

**Vylepseni:** Rozširit `ClientFeedbackCard` o shrnuti spanku, energie a poctu red-flagu.

### 12. Chybi: Treninkova zatez (RPE + objem) v sekci Treninky
Tabulka `training_sessions` obsahuje `rpe`, `total_volume`, `training_load`, ale zalozka Treninky tyto data nevyuziva. Pritom `ExerciseStatsSection` (ktera neni zarazena) uz RPE a objem cástecne zpracovava.

**Vylepseni:** Pridat prumerné RPE a celkovy objem do zalozky Treninky (integraci kart z `ExerciseStatsSection`).

### 13. Chybi: Statistika poznamek a medii trenera
Tabulky `trainer_notes`, `client_media` existuji a data se sbírají v `useAnnualStats` (totalPhotos, totalVoiceNotes), ale nikde se nezobrazuji.

**Vylepseni:** Pridat do Kariera compaktni metriku "X poznamek, Y fotek, Z hlasovych zprav" jako social proof prace trenera.

---

## Plan implementace

### Faze 1: Oprava chyb (kriticke)
1. Integrace `ExerciseStatsSection` karet (RPE, PRs, objem, kardio) do zalozky Treninky
2. Oprava hodinove sazby v `useBusinessHealthMetrics` -- pouzit skutecnou `duration`
3. Smazani mrtvého kódu `LifetimeStatsSection.tsx`

### Faze 2: Evaluacni barvy (design compliance)
4. `ClientFeedbackCard` -- odstranit evaluacni texty a barvy
5. `CohortRetentionCard` -- neutralni skala
6. `FinanceChartsSection` -- neutralni trend barvy
7. `PeriodComparisonCard` -- neutralni trend
8. `VolumeStatsCard` -- neutralni trend

### Faze 3: Vylepseni obsahu
9. Rozsireni feedback metriky o spanek, energii a red-flagy
10. Odstraneni duplicitniho donut chartu
11. Oprava kapacity (bez hardcoded 176)
12. Pridani metriky poznamek/medii do Kariéry

---

## Technicke detaily

| # | Soubor | Typ zmeny | Priorita |
|---|--------|-----------|----------|
| 1 | `Statistics.tsx` | Pridani cviku do Treninky | Vysoka |
| 1 | `TrainingStatsSection.tsx` | Integrace RPE, PRs, objem | Vysoka |
| 2 | `ClientFeedbackCard.tsx` | Evaluacni barvy | Vysoka |
| 3 | `CohortRetentionCard.tsx` | Evaluacni barvy | Vysoka |
| 4 | `FinanceChartsSection.tsx` | Evaluacni barvy + donut | Stredni |
| 5 | `PeriodComparisonCard.tsx` | Evaluacni barvy | Stredni |
| 6 | `VolumeStatsCard.tsx` | Evaluacni barvy | Stredni |
| 7 | `CapacityUtilizationCard.tsx` | Hardcoded kapacita | Nizka |
| 8 | `useBusinessHealthMetrics.ts` | Hodinova sazba bug | Vysoka |
| 9 | `LifetimeStatsSection.tsx` | Smazat mrtvy kod | Nizka |
| 10 | `ClientFeedbackCard.tsx` | Rozsireni o sleep/energy/flags | Stredni |
| 11 | `CareerStatsSection.tsx` | Metrika poznamek/medii | Nizka |

