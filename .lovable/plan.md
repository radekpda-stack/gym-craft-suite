
# Modernizace a "Zchytreni" Statistik

## Analyza soucasneho stavu

Statistiky maji 4 taby (Kariera, Finance, Treninky, Klienti) s solidnimi daty. Ale z pohledu trenera jako OSVC chybi:

1. **Zadne akcni doporuceni** - Cisla bez kontextu ("co s tim mam delat?")
2. **Chybi Executive Summary** - Trener musi proklikavat 4 taby aby ziskal celkovy obraz
3. **Kariera tab je slaby** - Jen lifetime cisla a milniky, zadny business kontext
4. **Finance nemaji ziskovost** - Prijmy bez nakladu = neuplny obraz
5. **Chybi "business health" skore** - Trener nevi jestli jeho podnikani roste nebo stagnuje
6. **Zadne predikce** - Jen historicka data, zadny vyber do budoucna
7. **Duplicita** - LifetimeStatsSection a CareerStatsSection sdili podobna data

---

## Navrhovane zmeny

### 1. Executive Summary karta (nova, nad taby)

Permanentni karta PRED taby, ktera ukazuje "stav podnikani" na jeden pohled:

```
┌──────────────────────────────────────────────┐
│  Tvoje podnikani                  Unor 2026  │
│                                              │
│  ┌──────────┬──────────┬──────────┬────────┐ │
│  │ 127k Kc  │ 48 tren. │ 12 kl.  │ 89%    │ │
│  │ prijem   │ tento m. │ aktiv.  │ retence│ │
│  │ +8% ↑    │ +3 ↑     │ =       │ +2% ↑  │ │
│  └──────────┴──────────┴──────────┴────────┘ │
│                                              │
│  💡 Hodinova sazba roste (+5%). Zvaz zvyseni │
│     cen u 3 klientu s nejnizsi sazbou.       │
│                                              │
│  📊 Predikce: Pri aktualnim tempu dosahnete  │
│     1.5M Kc za rok 2026.                     │
└──────────────────────────────────────────────┘
```

- 4 klicove metriky s trendem vs minule obdobi
- 1 automaticky generovany "smart insight" (rotujici)
- Jednoducha linearni predikce rocniho prijmu

### 2. Kariera tab - Business Dashboard misto lifetime cisel

Nahradit soucasny "karierni prehled" (jen cisla) skutecnym business dashboardem:

**a) Hodinova sazba trend** - Novy graf ukazujici vyvoj hodinove sazby v case (mesicne). Klic pro OSVC - roste mi cena prace?

**b) Kapacitni vyuziti** - Kolik % moznych slotu je obsazenych? "Trenujes 32h/tyden z moznych 40h = 80%". Pomaha rozhodovat o zvyseni cen vs nabrani klientu.

**c) Prijem na klienta trend** - Prumerny mesicni prijem na klienta v case. Roste? Klesa? Pomaha identifikovat "levne" klienty.

**d) Ziskovost (prijem - naklady)** - Spojit prijem s provoznimi naklady do jednoho grafu. Ukazat CISTY ZISK, ne jen trzby.

### 3. Finance tab - Profit & Loss pohled

Pridat na zacatek finance tabu jednoduchou P&L kartu:

```
┌──────────────────────────────────────┐
│  Zisk za obdobi                      │
│                                      │
│  Prijmy:           127 000 Kc        │
│  - Treninky:       112 000 Kc        │
│  - Produkty:        15 000 Kc        │
│  Naklady:          - 18 500 Kc       │
│  ─────────────────────────────       │
│  Cisty zisk:       108 500 Kc        │
│  Marze:                85.4%         │
│                                      │
│  vs minule obdobi: +12%              │
└──────────────────────────────────────┘
```

### 4. Smart Insights Engine (pro vsechny taby)

Nahradit soucasny jednoduchy `InsightsBar` (jen popisky typu "3 nových klientů") inteligentnim systemem, ktery generuje AKCNI doporuceni:

**Finance insights:**
- "3 klienti plati pod vasi prumernou sazbou. Zvazit upravu cen?"
- "Produkty tvori jen 8% prijmu. Nabidnete vice doplnku?"
- "Tento mesic mate o 15% vice pozdnich zruseni. Zprisnit storno podminky?"

**Treninky insights:**
- "Pondeli a patek jsou plne obsazene. Otevrte nove sloty ve stredu?"
- "Prumerna delka treninku klesla o 10 min. Kontrola?"
- "80% treninku jsou silove. Rozsirite nabidku kardio/mobility?"

**Klienti insights:**
- "Jan Novak netrénoval 45 dni. Follow-up?"
- "Prumerna zivotnost klienta je 8 mesicu. Top 3 klienti: 2+ roky."
- "3 klienti maji kredit pod 500 Kc. Pripomenout dobiti?"

### 5. Predikce a Cile

Nova sekce v Kariere: "Kam smerujete"

- **Linearni predikce rocniho prijmu** na zaklade aktualnich 1-6 mesicu
- **Cilova sazba** - trener si nastavi cilovY mesicni prijem, graf ukazuje progress
- **Break-even vypocet** - "Potrebujete X treninku mesicne aby pokryl naklady"

### 6. Vizualni upgrade

- **Gradient hero headers** pro kazdy tab s unikatni barvou (finance=zelena, treninky=modra, klienti=fialova)
- **Animovane prechody** pri prepinani tabu (staggered fade-in)
- **Kompaktnejsi KPI karty** - mene paddingu, vice dat na obrazovce
- **Sparklines** v executive summary misto statickych cisel

---

## Technicke zmeny

### Nove soubory:

| Soubor | Popis |
|--------|-------|
| `src/components/statistics/ExecutiveSummaryCard.tsx` | Hlavni business prehled nad taby |
| `src/components/statistics/ProfitLossCard.tsx` | P&L karta pro finance tab |
| `src/components/statistics/HourlyRateTrendCard.tsx` | Graf vyvoje hodinove sazby |
| `src/components/statistics/CapacityUtilizationCard.tsx` | Kapacitni vyuziti |
| `src/components/statistics/RevenuePerClientCard.tsx` | Prijem na klienta trend |
| `src/components/statistics/SmartBusinessInsights.tsx` | Inteligentni akcni doporuceni |
| `src/components/statistics/RevenueForecastCard.tsx` | Predikce rocniho prijmu |
| `src/hooks/useBusinessHealthMetrics.ts` | Hook pro executive summary data |
| `src/hooks/useSmartStatsInsights.ts` | Hook pro generovani chytrych insights |
| `src/hooks/useRevenueForecast.ts` | Hook pro predikci prijmu |

### Upravene soubory:

| Soubor | Zmena |
|--------|-------|
| `src/pages/Statistics.tsx` | Pridat ExecutiveSummaryCard pred taby, animace |
| `src/components/statistics/CareerStatsSection.tsx` | Nahradit lifetime cisla business metrikami (HourlyRateTrend, CapacityUtilization, RevenuePerClient, Forecast) |
| `src/components/statistics/FinanceStatsSection.tsx` | Pridat ProfitLossCard na zacatek, SmartBusinessInsights misto InsightsBar |
| `src/components/statistics/TrainingStatsSection.tsx` | SmartBusinessInsights misto statickeho PeriodComparisonCard |
| `src/components/statistics/ClientStatsSection.tsx` | SmartBusinessInsights misto InsightsBar |
| `src/components/statistics/InsightsBar.tsx` | Rozsirit o support pro "action" typ insights s tlacitky |

### Datove zdroje (bez DB zmen):

Vsechny nove hooky pouzivaji existujici tabulky:
- `training_sessions` - treninky, casy, ceny
- `credit_transactions` - prijmy, platby
- `clients` - klientela
- `business_expenses` - naklady (jiz existuje)
- `products` + `sales_orders` - produkty

---

## Prioritizace

| Priorita | Zmena | Dopad pro trenera |
|----------|-------|-------------------|
| 1 | Executive Summary Card | "Vidim stav podnikani okamzite" |
| 2 | Smart Business Insights | "Aplikace mi rika co delat" |
| 3 | Profit & Loss Card | "Vim kolik mi opravdu zbyde" |
| 4 | Hodinova sazba trend | "Vidim jestli mi roste cena prace" |
| 5 | Predikce rocniho prijmu | "Vim kam smeruju" |
| 6 | Kapacitni vyuziti | "Vim jestli mam zvysit ceny nebo nabrat klienty" |
| 7 | Vizualni upgrade | "Vypada to profesionalne" |

---

## Ocekavany vysledek

- Trener otevre Statistiky a OKAMZITE vidi stav sveho podnikani (Executive Summary)
- Kazdy tab obsahuje 1-3 AKCNI doporuceni ("zvys ceny u X", "kontaktuj Y")
- Finance ukazuji CISTY ZISK, ne jen trzby
- Kariera tab je skutecny business dashboard s trendy a predikcemi
- Celkovy dojem: "Tenhle nastroj mi pomaha rust jako podnikatel"
