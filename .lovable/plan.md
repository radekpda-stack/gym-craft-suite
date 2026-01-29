
# Audit a redesign sekce Statistiky

## Analýza současného stavu

### Tab "Kariéra" (Career)
| Komponenta | Stav | Problém |
|------------|------|---------|
| KPICard (4 karty) | OK | Funkční, ale nepropojené s periodRange |
| InsightsBlock | Slabé | Pouze 2 typy postřehů (revenue trend, milestone) |
| Rozdělení podle typu | Statické | Jen 4 čísla bez vizualizace trendu |

**Hlavní problém:** Tab "Kariéra" ignoruje vybraný `periodRange` - vždy zobrazuje lifetime data. To je matoucí pro uživatele.

### Tab "Finance"
| Komponenta | Stav | Problém |
|------------|------|---------|
| FinanceHeroKPI | OK | Dobře strukturované |
| FinanceChartsSection | Duplikace | Má vlastní period toggle (měsíc/3m/rok), ignoruje globální periodRange |
| RevenueBreakdownCard | OK | Pie chart funguje |
| MonthlyIncomeCard | Slabé | Pouze celkový rok, ne vybraný period |
| CancellationStatsCard | OK | Funkční |

**Hlavní problém:** Dva různé period selectory (globální + v FinanceChartsSection) matou uživatele.

### Tab "Tréninky" (Trainings)
| Komponenta | Stav | Problém |
|------------|------|---------|
| TrainingHeroKPI | Slabé | Chybí trend comparison s předchozím obdobím |
| TrainingTypeDistributionCard | OK | Pie chart + progress bars |
| TrainingDurationCard | Statické | Vždy od začátku roku, ignoruje periodRange |
| HeatmapSummary | OK | Jednoduché, funkční |
| InteractiveHeatmapCard | Duplikace | Vlastní period toggle, ignoruje globální |
| GlobalTagDistributionCard | OK | Distribuce tagů |
| FeedbackTagCorrelation | Důležité | Dobře propojuje tagy s feedbackem |

**Hlavní problém:** Mnoho komponent má vlastní period selectory místo použití globálního.

### Tab "Klienti" (Clients)
| Komponenta | Stav | Problém |
|------------|------|---------|
| ClientHeroKPI | OK | Aktivní klienti, retence, délka spolupráce, pocit těla |
| ClientLTVRankingCard | Důležité | Top 5 klientů podle LTV - velmi užitečné |
| CohortRetentionCard | Pokročilé | Cohort analýza - komplexní, ale důležitá |
| ChurnRiskCard | Důležité | Rizikoví klienti - actionable data |
| ClientTenureCard | OK | Délka spolupráce |
| ClientAgeCard | Slabé | Jen věková distribuce - málo užitečné |
| ClientFeedbackCard | OK | Průměrný feedback |
| ClientTagsCard | Slabé | Distribuce tagů klientů |

**Hlavní problém:** Příliš mnoho malých karet bez jasné hierarchie důležitosti.

---

## Identifikované problémy

### 1. Nekonzistentní použití period selectoru
- Globální `StatsPeriodSelector` existuje, ale mnoho komponent ho ignoruje
- `FinanceChartsSection`, `InteractiveHeatmapCard`, `TrainingDurationCard` mají vlastní period toggles
- Matoucí UX - uživatel neví, co ovlivňuje globální filtr

### 2. Chybějící trend porovnání
- Většina metrik zobrazuje jen absolutní hodnoty
- Chybí "vs. předchozí období" pro kontext
- Bez trendu trenér neví, jestli se zlepšuje nebo zhoršuje

### 3. Duplicitní nebo nepodstatné grafy
- `ClientAgeCard` - věková distribuce má nízkou hodnotu pro rozhodování
- `ClientTagsCard` - tagy klientů nejsou přímo actionable
- Dva různé income grafy (MonthlyIncomeCard + FinanceChartsSection)

### 4. Chybějící důležité metriky
- **Profitabilita tréninků** - které typy tréninků generují nejvíc příjmů
- **Klientská aktivita** - kdo přestal chodit, kdo chodí více
- **Sezonalita** - vzorce napříč měsíci/roky
- **Revenue per client** - porovnání hodnoty klientů

### 5. Příliš mnoho klikání
- Modály pro detaily vyžadují extra kliknutí
- Důležité informace jsou skryté za "rozbalit" tlačítky

---

## Návrh změn

### A. Konzistence period selectoru

**Změna:** Všechny komponenty musí respektovat globální `periodRange`

| Komponenta | Akce |
|------------|------|
| `CareerStatsSection` | Přidat podporu periodRange pro všechny metriky |
| `FinanceChartsSection` | Odstranit vlastní toggle, použít globální periodRange |
| `InteractiveHeatmapCard` | Odstranit vlastní toggle, použít globální periodRange |
| `TrainingDurationCard` | Předat periodRange jako prop |
| `CohortRetentionCard` | Ponechat vlastní granularitu (týden/měsíc) - toto dává smysl |

### B. Vylepšené grafy s trendy

#### B1. Nový "Period Comparison Card"
Nahradit statické KPI karty dynamickým porovnáním:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ POROVNÁNÍ OBDOBÍ                                                        │
│                                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│ │ TRÉNINKY        │ │ PŘÍJEM          │ │ KLIENTI         │            │
│ │                 │ │                 │ │                 │            │
│ │ 45              │ │ 67 500 Kč       │ │ 12 aktivních    │            │
│ │ ↑ +15% vs min.  │ │ ↓ -8% vs min.   │ │ = stejný        │            │
│ │ období          │ │ období          │ │                 │            │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                         │
│ Období: Leden 2026 vs Prosinec 2025                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### B2. Vylepšený Income Trend graf
Sloučit `MonthlyIncomeCard` + `FinanceChartsSection` do jednoho grafu:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ VÝVOJ PŘÍJMŮ                                              [Období ▼]  │
│                                                                         │
│   80k ┤                                                    ●            │
│   60k ┤              ●─────●               ●─────●────●────┘            │
│   40k ┤    ●────●────┘                    /                             │
│   20k ┤   /                              ●                              │
│    0k ┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───                 │
│       Led Úno Bře Dub Kvě Čvn Čvc Srp Zář Říj Lis Pro                  │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Ø měsíčně: 52 000 Kč │ Nejlepší: Říjen (78k) │ Nejslabší: Srp (32k)││
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

#### B3. "Revenue per Training Type" graf (NOVÝ)
Klíčový graf pro trenéra - který typ tréninku vydělává nejvíc:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ VÝNOSNOST PODLE TYPU TRÉNINKU                                          │
│                                                                         │
│ Silový     │████████████████████████████████│ 68 500 Kč │ Ø 980 Kč/h  │
│ Kondiční   │████████████████│               │ 32 100 Kč │ Ø 850 Kč/h  │
│ Kardio     │████████│                       │ 18 200 Kč │ Ø 720 Kč/h  │
│ Ostatní    │████│                           │  8 400 Kč │ Ø 600 Kč/h  │
│                                                                         │
│ Insight: Silové tréninky generují 54% příjmů s nejvyšší hodinovou sazbou│
└─────────────────────────────────────────────────────────────────────────┘
```

### C. Zjednodušení tab "Klienti"

#### C1. Odstranit méně užitečné karty
- `ClientAgeCard` - přesunout do expandable sekce
- `ClientTagsCard` - sloučit s detailem klienta

#### C2. Nový "Client Health Dashboard"
Sloučit několik karet do přehledného dashboardu:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏥 ZDRAVÍ KLIENTELY                                                    │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ AKTIVITA           │ RETENCE           │ HODNOTA                  │  │
│ │ ───────────────── │ ─────────────────│ ───────────────────────  │  │
│ │ 42 aktivních      │ 78% (60d)         │ Ø LTV: 45 200 Kč        │  │
│ │ 8 neaktivních     │ ↓ -5% vs min. měs │ Ø měsíčně: 3 200 Kč     │  │
│ │ 4 noví tento měs. │                   │ Top: Jana N. (89k)      │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ⚠️ 3 klienti vyžadují pozornost:                                       │
│ • Petr S. - pokles frekvence 50%                                       │
│ • Eva M. - záporný kredit                                              │
│ • Martin K. - dlouhá pauza (21 dní)                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### D. Vylepšení tab "Kariéra"

#### D1. Přidat podporu periodRange
Umožnit zobrazit kariérní metriky pro vybrané období, ne jen lifetime

#### D2. Nový "Career Milestones" timeline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏆 KARIÉRNÍ MILNÍKY                                                     │
│                                                                         │
│ ●──────────●──────────●──────────●──────────●                          │
│ 2023       2024       2025       2026       →                          │
│                                                                         │
│ 2023-03: První klient                                                   │
│ 2023-11: 100 tréninků ✓                                                │
│ 2024-06: 500 tréninků ✓                                                │
│ 2025-02: 1000 tréninků ✓                                               │
│ 2026-??: Další cíl: 1500 tréninků (chybí 138)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### E. Nové grafy pro tab "Tréninky"

#### E1. "Training Volume Trend" (NOVÝ)
Graf zobrazující vývoj objemu tréninků:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ OBJEM TRÉNINKŮ                                                          │
│                                                                         │
│  Týden  │ Po Út St Čt Pá So Ne │ Celkem │ vs min. týden              │
│ ─────────────────────────────────────────────────────────────────────  │
│  Tento  │ ██ ██ ░░ ██ ██ ░░ ░░ │   8    │ ↑ +2 (+33%)               │
│  Min.   │ ██ ░░ ██ ██ ░░ ░░ ██ │   6    │                           │
│  Ø      │ 1.4  0.8 1.2 1.1 0.6 0.2 0.4 │   5.7  │                   │
│                                                                         │
│ Trend: Pondělí a čtvrtek jsou nejobsazenější dny                       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### E2. Sloučená heatmapa s globalním periodRange
Odstranit vlastní toggle, použít globální period

---

## Technické změny

### Nové komponenty

| Komponenta | Účel |
|------------|------|
| `PeriodComparisonCard.tsx` | Porovnání aktuálního vs předchozího období |
| `RevenueByTrainingTypeCard.tsx` | Graf výnosnosti podle typu tréninku |
| `ClientHealthDashboard.tsx` | Sloučený přehled zdraví klientely |
| `CareerMilestonesTimeline.tsx` | Timeline kariérních milníků |
| `TrainingVolumeTrend.tsx` | Týdenní objem tréninků s porovnáním |
| `UnifiedIncomeChart.tsx` | Sloučený income trend + rozložení |

### Úpravy existujících komponent

| Soubor | Změna |
|--------|-------|
| `CareerStatsSection.tsx` | Přidat podporu periodRange, přidat milestones |
| `FinanceStatsSection.tsx` | Odstranit duplikátní grafy, přidat UnifiedIncomeChart |
| `FinanceChartsSection.tsx` | Předat periodRange jako prop, odstranit vlastní toggle |
| `TrainingStatsSection.tsx` | Přidat PeriodComparisonCard, TrainingVolumeTrend |
| `InteractiveHeatmapCard.tsx` | Předat periodRange jako prop, odstranit vlastní toggle |
| `TrainingDurationCard.tsx` | Předat periodRange jako prop |
| `ClientStatsSection.tsx` | Nahradit jednotlivé karty ClientHealthDashboard |

### Odstranit komponenty

| Komponenta | Důvod |
|------------|-------|
| `ClientAgeCard.tsx` | Nízká hodnota pro rozhodování |
| `ClientTagsCard.tsx` | Sloučit do detailu klienta |

### Nové hooky

| Hook | Účel |
|------|------|
| `usePeriodComparison` | Výpočet porovnání dvou period (current vs previous) |
| `useRevenueByType` | Agregace příjmů podle typu tréninku |
| `useCareerMilestones` | Detekce a výpočet milníků |
| `useWeeklyTrainingVolume` | Objem tréninků po týdnech s trendem |

---

## Shrnutí priorit

### Vysoká priorita (musí se opravit)
1. **Konzistence period selectoru** - všechny komponenty musí respektovat globální periodRange
2. **Revenue by Training Type** - klíčový graf pro trenéra
3. **Period Comparison** - přidání trendů vs předchozí období

### Střední priorita (vylepšení)
4. **Unified Income Chart** - sloučení duplicitních grafů
5. **Client Health Dashboard** - zjednodušení tab Klienti
6. **Training Volume Trend** - lepší vizualizace objemu

### Nízká priorita (nice-to-have)
7. **Career Milestones Timeline** - motivační prvek
8. **Odstranění nepotřebných karet** - ClientAgeCard, ClientTagsCard

---

## Očekávané výsledky

1. **Konzistentnější UX** - jeden period selector ovládá vše
2. **Více actionable dat** - trenér vidí trendy, ne jen absolutní čísla
3. **Méně klikání** - důležité informace jsou viditelné okamžitě
4. **Jasnější hierarchie** - nejdůležitější metriky nahoře
5. **Lepší rozhodování** - graf "Revenue by Type" pomůže optimalizovat nabídku

