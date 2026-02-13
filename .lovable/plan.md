

# Audit a redesign sekce Vykonnost

## Souhrn nalezenych problemu

### 1. Prilis mnoho zalozek -- kognitivni pretizeni
Aktualne az 8 zalozek (Prehled, Klienti, Knihovna, Porovnani, Analytika, PR Historie, Testy, Vyzvy). Trener musi hadat, kde co najde. Mnoho funkci je duplikovano mezi zalozkami (napr. porovnani klientu je v "Klienti" I v "Porovnani").

**Navrh:** Zredukovat na 4 hlavni zalozky:
- **Prehled** (dashboard s KPI, top klienty, nedavne cviky)
- **Klienti** (jednotlivy klient + porovnani -- slouci "Klienti" a "Porovnani")
- **Knihovna** (seznam cviku)
- **Analytika** (akcni vhledy -- stagnace, mezery, atd.)

PR Historie se presune jako podsekce do Klientu (kdyz je klient vybrany) a jako globalni prehled do Prehledu. Testy a Vyzvy zustanou volitelne.

### 2. BUG: Evaluacni barvy v Leaderboardu a Sparkline karte
`ClientProgressLeaderboard` (radek 129): `text-emerald-500` / `text-destructive` pro trendy.
`ProgressSparklineGrid` (radky 115-119): `bg-emerald-500/10 text-emerald-500` / `bg-destructive/10 text-destructive`.
`ProgressHeroCard` (radky 121-136): `text-emerald-500` / `text-amber-500` pro volume trend.
`PerformanceKPIBar` (radky 22-25): `text-emerald-600` / `text-red-500` pro trend.

**Oprava:** Nahradit vse neutralnimi barvami `text-muted-foreground` / `text-foreground`.

### 3. BUG: `useClientProgressStats` ignoruje cardio a skill entries
Hook nacita data **pouze z `exercise_entries`** (silove cviky). Tabulky `cardio_entries` a `skill_entries` jsou kompletne ignorovany. Trener tak nevidi historii kardia ani plyometrie klienta.

**Oprava:** Rozsirit hook o nacitani ze vsech tri tabulek (stejne jako uz dela `usePerformanceOverview`).

### 4. BUG: `useAllClientsProgress` ignoruje cardio a skill entries
Stejny problem -- klienti kteri delaji predevsim kardio/plyo se ukazuji s 0 zaznamy.

**Oprava:** Nacitat ze vsech tri tabulek.

### 5. BUG: `useCohortBenchmarks` ignoruje cardio a skill entries
Benchmark porovnani nacita **pouze z `exercise_entries`**. Kardio a skill cviky nejsou srovnavany.

**Oprava:** Zahrnout vsechny tri tabulky do benchmarku.

### 6. Chybi: Celkova historie klienta (timeline)
Trener chce videt "co klient delal u me za celou dobu". Aktualne `useClientProgressStats` nacita jen poslednich 12 mesicu. Chybi moznost prepnout na "vse".

**Oprava:** Pridat period selector (12m / vse) do ClientProgressView.

### 7. Chybi: Rychly prehled klienta bez vyberu
Na zalozce Klienti je nutne nejdriv vybrat klienta z dropdownu. Chybi vizualni prehled -- napr. seznam klientu s mini-statistikami (celkem PR, posledni trenink, trend), ze ktereho trener primo klikne.

**Oprava:** Pred vyberem klienta zobrazit kompaktni seznam klientu s klicovymi metrikami.

### 8. Chybi: Jednotky u benchmarku pro casove cviky
`useCohortBenchmarks` pouziva `Math.max` pro vsechny cviky, ale u casovych cviku (beh) by melo byt `Math.min` (nizsi cas = lepsi). Vysledek: benchmark casovych cviku je prevraceny.

**Oprava:** Detekovat casove cviky a pouzit `Math.min` + obraceny diffPercent.

---

## Plan implementace

### Faze 1: Kriticke bugy (data)

**1. Rozsirit `useClientProgressStats` o cardio + skill entries**
- Pridat paralelni dotazy na `cardio_entries` a `skill_entries`
- Normalizovat data do spolecneho formatu ExerciseProgress
- Zajistit spravne urceni unit a isInverted pro kazdy typ

**2. Rozsirit `useAllClientsProgress` o cardio + skill entries**
- Pridat dotazy na `cardio_entries` a `skill_entries`
- Agregovat pocty zaznamu a PR ze vsech tabulek

**3. Rozsirit `useCohortBenchmarks` o cardio + skill entries**
- Pridat nacitani ze vsech tri tabulek
- Pouzit `Math.min` pro casove cviky misto `Math.max`
- Obratit diffPercent logiku pro casove cviky

### Faze 2: Evaluacni barvy (design compliance)

**4. `PerformanceKPIBar` -- neutralni trend barvy**
- TrendIndicator: nahradit `text-emerald-600`/`text-red-500` za `text-muted-foreground`

**5. `ClientProgressLeaderboard` -- neutralni trend barvy**
- Radek 129: nahradit evaluacni barvy za neutralni

**6. `ProgressSparklineGrid` -- neutralni trend badge**
- Radky 115-119: nahradit zeleno-cervene badge za neutralni

**7. `ProgressHeroCard` -- neutralni volume trend**
- Radky 121-136: sjednotit na neutralni barvy

### Faze 3: UX vylepseni

**8. Redukce zalozek z 8 na 4+2**
- Slouciit "Porovnani" do zalozky "Klienti" (uz tam porovnani existuje jako sub-tab)
- Presunout "PR Historie" jako podsekci do "Prehledu"
- Zachovat Testy a Vyzvy jako volitelne
- Vysledek: Prehled | Klienti | Knihovna | Analytika | (Testy) | (Vyzvy)

**9. Klientsky prehled -- seznam misto prazdneho stavu**
- V ClientProgressView pred vyberem klienta zobrazit clickable seznam klientu s mini-statistikami (PR count, entries, posledni aktivita)
- Kliknutim na klienta se rovnou vybere

**10. Podpora zobrazeni cele historie**
- Pridat period selector do ClientProgressView (12 mesicu / vse)
- Predavat parametr do `useClientProgressStats`

---

## Technicke detaily

| # | Soubor | Zmena |
|---|--------|-------|
| 1 | `useClientProgressStats.ts` | Pridat cardio_entries + skill_entries do dotazu |
| 2 | `useClientProgressStats.ts` (useAllClientsProgress) | Pridat cardio + skill do agregace |
| 3 | `useCohortBenchmarks.ts` | Pridat cardio + skill, opravit casove cviky |
| 4 | `PerformanceKPIBar.tsx` | Neutralni trend barvy |
| 5 | `ClientProgressLeaderboard.tsx` | Neutralni trend barvy |
| 6 | `ProgressSparklineGrid.tsx` | Neutralni trend badge |
| 7 | `ProgressHeroCard.tsx` | Neutralni volume trend |
| 8 | `PerformanceHub.tsx` | Redukce zalozek, integrace PR Historie |
| 9 | `ClientProgressView.tsx` | Seznam klientu misto prazdneho stavu, period selector |
| 10 | `useClientProgressStats.ts` | Parametr pro rozsireni casoveho okna |

