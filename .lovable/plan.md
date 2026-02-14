

# Rozsireni vyuziti RPE u cviku -- 4 nove funkce

## Prehled

Implementace 4 novych funkci, ktere vyuziji RPE data zadavana u cviku k poskytovani akcinich vhledu trenérovi. Vsechny nove komponenty budou integrovany do existujici analyticke sekce (`StrengthAnalyticsView`) a klientskeho detailu.

---

## 1. eVolume (Efektivni objem)

**Co:** Nova metrika `eVolume = sets * reps * weight * (RPE/10)`, ktera presneji reflektuje skutecnou zatez. Sada se 100kg pri RPE 6 neni stejna jako pri RPE 9.

**Kde se zobrazi:**
- `AnalyticsKPIRow` -- nahrazeni/doplneni stavajici KPI "tonnage" o eVolume variantu jako sekundarni cislo
- `VolumeTimelineCard` -- dual line (raw volume vs eVolume) v existujicim grafu

**Technicke detaily:**
- Vypocet pridan primo do `useExerciseAnalyticsComplete.ts` -- novy field `eVolume` a `eVolumeTrend` v `AnalyticsKPI`
- Filtrovani: pouze zaznamy s RPE > 0 se zapocitavaji do eVolume; zaznamy bez RPE se zobrazuji jen v raw volume
- Vzorec: `eVolume = SUM(sets * reps * weight_kg * (rpe / 10))` pro kazdy entry

---

## 2. RPE porovnani mezi cviky

**Co:** Serazeny seznam cviku podle prumerneho RPE -- ukazuje ktere pohyby jsou pro klienty nejnarocnejsi a ktere nejlehci.

**Kde se zobrazi:**
- Nova karta `RPEByExerciseCard` v `StrengthAnalyticsView` vedle existujicich karet (StagnationAlertCard, MovementGapsCard, UnusedExercisesCard)

**Technicke detaily:**
- Data: agregace v `useExerciseAnalyticsComplete.ts` -- novy field `exerciseRpeRanking: { name, avgRpe, entryCount }[]`
- Skupinuje exercise_entries podle exercise_id, pocita prumerne RPE
- Zobrazi top 5 nejtezsi a top 5 nejlehci cviky s horizontalnim barem (0-10 skala)
- Minimum 3 zaznamy s RPE pro zarazeni do seznamu

---

## 3. RPE vs. progrese korelace

**Co:** Indikator u cviku/klienta ukazujici zda rust vahy je doprovazen stabilnim RPE (skutecny silov progres) nebo rostoucim RPE (vetsi usili bez skutecneho zlepseni).

**Kde se zobrazi:**
- Nova karta `RPEProgressCorrelationCard` v `StrengthAnalyticsView`
- Zobrazuje seznam cviku s ikony: zelena sipka = vahy rostou + RPE stabilni/klesajici; zluta = vahy rostou + RPE roste; cervena = vahy stoji + RPE roste

**Technicke detaily:**
- Vypocet v `useExerciseAnalyticsComplete.ts` -- novy field `rpeProgressCorrelation: { exerciseName, weightTrend, rpeTrend, status }[]`
- Trend = porovnani prvni a druhe poloviny obdobi
- `status`: `true_strength_gain` | `effort_increase` | `fatigue_signal`
- Minimum 6 zaznamu u cviku s RPE pro zarazeni

---

## 4. Upozorneni na chronicky vysoke RPE

**Co:** Alert kdyz klient udrzuje RPE >= 9 po 3+ tydny bez progresu (signalizuje potrebu deloadu).

**Kde se zobrazi:**
- Integrovano do existujici `ClientAttentionCard` jako novy duvod pozornosti (`chronic_high_rpe`)
- Badge "Vysoke RPE 3+ tydny" u klienta

**Technicke detaily:**
- Rozsireni `AttentionReason` typu o `'chronic_high_rpe'`
- V sekci "CLIENTS NEEDING ATTENTION" v `useExerciseAnalyticsComplete.ts`: detekce klientu s prumernym RPE >= 9 po 3+ po sobe jdoucich tydnech BEZ noveho PR
- Aktualizace `ClientAttentionCard.tsx` pro zobrazeni noveho duvodu s vhodnou ikonou

---

## Zmeny v souborech

| Soubor | Typ zmeny |
|--------|-----------|
| `src/hooks/useExerciseAnalyticsComplete.ts` | Rozsireni o eVolume, exerciseRpeRanking, rpeProgressCorrelation, chronic_high_rpe detekci |
| `src/components/exercises/analytics/AnalyticsKPIRow.tsx` | Pridani eVolume jako sekundarni metriky pod tonnage |
| `src/components/exercises/analytics/RPEByExerciseCard.tsx` | **NOVY** -- zebricek cviku dle RPE |
| `src/components/exercises/analytics/RPEProgressCorrelationCard.tsx` | **NOVY** -- korelace RPE vs progres |
| `src/components/exercises/analytics/StrengthAnalyticsView.tsx` | Integrace 2 novych karet do layoutu |
| `src/components/exercises/analytics/ClientAttentionCard.tsx` | Pridani zobrazeni `chronic_high_rpe` duvodu |

## Vizualni styl

Vsechny nove karty pouzivaji existujici `AnalyticsCard` komponentu s `StatInfoTooltip` pro napovedu. Barvy signalu: neutralni (text-muted-foreground) pro trendy dle existujici filozofie -- zadne hodnoticke soudy, jen srovnavaci data.

