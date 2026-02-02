
# Audit Statistik - Kompletní přehled a doporučení

## Shrnutí současného stavu

Stránka Statistiky je rozdělena do 4 záložek:
1. **Kariéra** - celoživotní přehled trenéra
2. **Finance** - příjmy, platby, ziskovost
3. **Tréninky** - aktivita, heatmapa, distribuce
4. **Klienti** - retence, LTV, rizikoví klienti

---

## KARIÉRA (CareerStatsSection)

### Správně funguje:
| Komponenta | Status | Poznámka |
|------------|--------|----------|
| KPI Grid (tréninky, hodiny, klienti, hodinová sazba) | ✅ OK | Data z `useLifetimeStats` |
| Rozdělení podle typu (silové, kardio, kondiční, ostatní) | ✅ OK | Správně agreguje |
| CareerMilestonesTimeline | ✅ OK | Progress k dalšímu cíli + historie |

### Problémy:
| Komponenta | Problém | Doporučení |
|------------|---------|------------|
| PeriodComparisonCard | **Duplicita** - zobrazuje se i v Kariéře i v Trénincích | **Odstranit z Kariéry** - kariéra je celoživotní přehled, porovnání období sem nepatří |
| Hodinová sazba | Záleží na tom, zda má trénink vyplněnou `duration` | Přidat varování pokud < 50% tréninků má délku |

### Chybí:
| Funkce | Popis | Priorita |
|--------|-------|----------|
| Graf vývoje přes čas | Jak rostl počet tréninků/klientů po rocích | Střední |
| Top klienti celkově | Kdo přinesl nejvíc peněz za celou kariéru | Nízká |

---

## FINANCE (FinanceStatsSection)

### Správně funguje:
| Komponenta | Status | Poznámka |
|------------|--------|----------|
| FinanceHeroKPI | ✅ OK | Přijatý kredit, odtrénováno, průměr/trénink, nezaplaceno |
| RevenueByTrainingTypeCard | ✅ OK | Výnosnost podle typu s hodinovou sazbou |
| FinanceChartsSection (Trend + Pie) | ✅ OK | Správně zobrazuje trend a rozložení |
| MonthlyIncomeCard | ✅ OK | Roční přehled s trendem vs loni |
| CancellationStatsCard | ✅ OK | Zrušené tréninky, pozdní zrušení, storno poplatky |

### Problémy:
| Komponenta | Problém | Doporučení |
|------------|---------|------------|
| InsightsBar | Některé insights jsou **evaluativní** ("Výborné", "Ke zlepšení") | Přeformulovat na fakta bez hodnocení |
| RevenueBreakdownCard | **Duplicitní s Pie chartem** v FinanceChartsSection | **Odstranit** - ukazuje stejná data (tréninky vs produkty) |
| Produkty karta (podmíněná) | Zobrazuje se jen pokud je nezaplaceno + produkty > 0 - nelogické | Buď zobrazit vždy, nebo smazat |

### Chybí:
| Funkce | Popis | Priorita |
|--------|-------|----------|
| Cash flow predikce | Očekávaný příjem na základě naplánovaných tréninků | Vysoká |
| Provozní náklady | Karta s náklady chybí ve Finance sekci (existuje komponenta) | Střední |

---

## TRÉNINKY (TrainingStatsSection)

### Správně funguje:
| Komponenta | Status | Poznámka |
|------------|--------|----------|
| TrainingHeroKPI | ✅ OK | Celkem, tento měsíc, průměr/týden, nejčastější typ |
| TrainingTypeDistributionCard | ✅ OK | Pie + progress bary |
| TrainingDurationCard | ✅ OK | Průměrná délka, min/max, celkem hodin |
| InteractiveHeatmapCard | ✅ OK | Heatmapa kapacity |
| GlobalTagDistributionCard | ✅ OK | Distribuce tagů (zaměření, partie, intenzita) |
| FeedbackTagCorrelation | ✅ OK | Korelace feedback vs tagy |

### Problémy:
| Komponenta | Problém | Doporučení |
|------------|---------|------------|
| PeriodComparisonCard | **Duplicita** - zobrazuje se i zde | Ponechat zde (patří sem), odstranit z Kariéry |
| HeatmapSummary | Jen text pod heatmapou | **Sloučit** do InteractiveHeatmapCard jako header |
| Trend výpočet | `trendVsPrevious` je hrubý odhad z průměru | Použít skutečná data minulého období |

### Chybí:
| Funkce | Popis | Priorita |
|--------|-------|----------|
| Graf tréninků po dnech/týdnech | Area chart s historií | Střední |
| Obsazenost kapacity | Kolik % slotů je využito (existuje hook) | Vysoká |

---

## KLIENTI (ClientStatsSection)

### Správně funguje:
| Komponenta | Status | Poznámka |
|------------|--------|----------|
| ClientHealthDashboard | ✅ OK | Aktivní, retence, LTV, rizikoví klienti |
| ClientHeroKPI | ✅ OK | 4 karty - aktivní, retence, délka spolupráce, pocit těla |
| ClientLTVRankingCard | ✅ OK | Top 5 klientů podle LTV |
| CohortRetentionCard | ✅ OK | Kohortová tabulka retence |
| ChurnRiskCard | ✅ OK | Rizikoví klienti s doporučeními |
| ClientTenureCard | ✅ OK | Délka spolupráce - distribuce |
| ClientFeedbackCard | ✅ OK | Průměrný pocit těla a session fit |

### Problémy:
| Komponenta | Problém | Doporučení |
|------------|---------|------------|
| InsightsBar | Obsahuje **evaluativní** texty ("Výborná retence") | Přeformulovat |
| ClientHealthDashboard vs ClientHeroKPI | **Částečná duplicita** - oba ukazují aktivní klienty a retenci | Sloučit do jednoho |
| GaugeCard pro retenci | Používá barvy (zelená/červená) = evaluativní | Změnit na neutrální barvy |

### Chybí:
| Funkce | Popis | Priorita |
|--------|-------|----------|
| Trend nových vs odešlých klientů | Graf přírůstku/úbytku přes čas | Střední |
| Segmentace klientů | Podle tagu, frekvence, hodnoty | Nízká |

---

## SOUHRNNÁ TABULKA AKCÍ

### Odstranit (duplicity):
| Komponenta | Z | Důvod |
|------------|---|-------|
| `PeriodComparisonCard` | CareerStatsSection | Duplicita s TrainingStatsSection |
| `RevenueBreakdownCard` | FinanceStatsSection | Duplicita s FinanceChartsSection (Pie chart) |
| Podmíněná Produkty karta | FinanceStatsSection | Nelogická podmínka zobrazení |

### Upravit:
| Komponenta | Změna |
|------------|-------|
| `InsightsBar` + generátory | Odstranit evaluativní slova ("Výborné", "Nízká") - nahradit fakty |
| `ClientHeroKPI` + `ClientHealthDashboard` | Sloučit do jedné komponenty |
| `HeatmapSummary` | Přesunout do headeru `InteractiveHeatmapCard` |
| `GaugeCard` v ClientHeroKPI | Změnit varianty na neutrální |
| Trend výpočet v TrainingStatsSection | Použít skutečná data z předchozího období |

### Přidat:
| Komponenta | Sekce | Priorita |
|------------|-------|----------|
| `CapacityUtilizationCard` | Tréninky | Vysoká - existuje hook, jen chybí komponenta |
| `OperatingExpensesCard` | Finance | Střední - komponenta existuje, není integrována |
| `CashflowForecastCard` | Finance | Střední - predikce příjmu |
| Graf tréninků po týdnech | Tréninky | Střední |
| Graf nových vs odešlých klientů | Klienti | Střední |

---

## DOPORUČENÉ PRIORITY

### Fáze 1 - Čistka (Quick wins):
1. Odstranit `PeriodComparisonCard` z Kariéry
2. Odstranit `RevenueBreakdownCard` z Finance (duplicita)
3. Odstranit podmíněnou Produkty kartu

### Fáze 2 - Non-evaluativní UI:
1. Přepsat `InsightsBar` generátory - fakta místo hodnocení
2. Změnit barvy v `GaugeCard` na neutrální
3. Sloučit `HeatmapSummary` do `InteractiveHeatmapCard`

### Fáze 3 - Nové funkce:
1. Přidat `CapacityUtilizationCard` do Tréninků
2. Přidat `OperatingExpensesCard` do Finance
3. Sloučit `ClientHeroKPI` + `ClientHealthDashboard`

---

## KONKRÉTNÍ PŘÍKLAD: Evaluativní vs Faktický text

**Před (evaluativní):**
```
"Výborná retence: 85%"
"Nízká retence: 45%"
"Příjem +15% vs minulý měsíc" (s zelenou barvou)
```

**Po (faktický):**
```
"Retence: 85% (60 dní)"
"Retence: 45% (60 dní)"
"Příjem: +15% vs min. období" (neutrální barva)
```

---

## VIZUÁLNÍ ZMĚNY

```
KARIÉRA (po změnách):
┌──────────────────────────────────────────┐
│ 📊 Kariérní přehled                       │
│ Od 15. března 2023                        │
└──────────────────────────────────────────┘
┌────────┬────────┬────────┬────────┐
│Tréninky│ Hodiny │ Klienti│ Kč/hod │
│  847   │  847h  │   52   │ 1165   │
└────────┴────────┴────────┴────────┘
┌──────────────────────────────────────────┐
│ 🏆 Kariérní milníky                       │
│ [Další cíl: 1000 tréninků ████████ 85%] │
│ ✓ 500 tréninků - 12.5.2024               │
│ ✓ 50 klientů - 8.3.2024                  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 💪 Rozdělení podle typu (celkem)          │
│ [523] Silové  [156] Kardio  [100] Kond.  │
└──────────────────────────────────────────┘

FINANCE (po změnách):
┌────────┬────────┬────────┬────────┐
│Kredit  │Odtrén. │Průměr  │Nezapl. │  (HERO)
└────────┴────────┴────────┴────────┘
┌──────────────────────────────────────────┐
│ 📈 Výnosnost podle typu tréninku         │  (zachovat)
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 📊 Trend příjmů         📈 Rozložení     │  (zachovat)
└──────────────────────────────────────────┘
┌───────────────────┬──────────────────────┐
│ 📅 Měsíční přehled│ ❌ Zrušené tréninky  │  (zachovat)
└───────────────────┴──────────────────────┘
┌──────────────────────────────────────────┐
│ 🧾 Provozní náklady (NOVÉ)               │
└──────────────────────────────────────────┘
```
