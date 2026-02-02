
# Fáze 6: Grafické úpravy - Výkonnost, Prodeje, Statistiky

## Shrnutí prohlédnutých souborů

Prozkoumal jsem klíčové komponenty v těchto sekcích:
- **PerformanceHub** + KPI Bar + Category Cards + Leaderboard
- **SalesStatistics** + SalesRegister - karty prodejů
- **Statistics** - Finance, Tréninky, Kariéra sekce s Hero KPI kartami
- **Charts** - MetricCard, GaugeCard, SparklineCard

---

## Navržené změny

### 1. PERFORMANCE HUB - Premium Dashboard

**Soubor:** `src/pages/PerformanceHub.tsx`

Současně: Standard header s bg-primary/10 a glass tabs
Nově: Premium floating header s larger hero metrics

Změny:
- Header icon container jako `.card-floating` s více depth
- Tabs jako floating glass pills s animated indicator
- Spacing a layout konzistentnější s ostatními stránkami

---

### 2. PERFORMANCE KPI BAR - Instrument Cards

**Soubor:** `src/components/performance/PerformanceKPIBar.tsx`

Současně: Simple glass cards s icon + text
Nově: Instrument-style cards s visual indicators

```text
┌─────────────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ ○○○ 156     │ │ ⬤ 423       │ │ 🏆 12       │    │
│ │ cviků       │ │ záz. měsíc  │ │ PR měsíc   │    │
│ │ [progress]  │ │ [sparkline] │ │ [▲ +3]     │    │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
└─────────────────────────────────────────────────────┘
```

Změny:
- Cards jako `Card variant="floating"`
- Micro progress ring pro cviky
- Sparkline trend pro záznamy
- PR card s trend badge

---

### 3. CATEGORY CARDS - Premium Tiles

**Soubor:** `src/components/performance/CategoryCards.tsx`

Současně: Glass cards s border colors
Nově: Floating instrument tiles s visual meters

Změny:
- Cards jako `.card-floating` s depth effect
- Progress ring místo simple count
- Hover → lift + shadow animation
- Gradient accent na border místo solid color

---

### 4. CLIENT PROGRESS LEADERBOARD - Premium List

**Soubor:** `src/components/performance/ClientProgressLeaderboard.tsx`

Současně: Glass container s simple rows
Nově: Floating container s premium row items

Změny:
- Container jako `.card-floating`
- Row items s subtle hover lift
- Medal icons s glow effect pro top 3
- Progress bar s gradient fill

---

### 5. ANALYTICS KPI ROW - Instrument Upgrade

**Soubor:** `src/components/exercises/analytics/AnalyticsKPIRow.tsx`

Současně: Basic Card s p-3 styling
Nově: Instrument cards s premium visuals

Změny:
- Cards jako `Card variant="instrument"`
- Labels jako `.label-caps` (uppercase, tracking)
- Values jako `tabular-nums font-bold`
- Trend badges s refined styling

---

### 6. SALES STATISTICS - Premium KPI Cards

**Soubor:** `src/components/sales/SalesStatistics.tsx`

Současně: Glass rounded-xl cards s standard text
Nově: Floating instrument cards s visual indicators

```text
┌─────────────────────────────────────────────────────────┐
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│ │ ↗ Tržby       │ │ ↘ Náklady     │ │ 💰 Čistý zisk │  │
│ │ 45,250 Kč     │ │ 12,300 Kč     │ │ 32,950 Kč    │  │
│ │ [sparkline]   │ │ [bar]         │ │ [ring 73%]   │  │
│ │ ▲ +12% vs min │ │ ▼ -5% vs min  │ │ marže: 73%   │  │
│ └───────────────┘ └───────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Změny:
- KPI cards jako `.card-floating`
- Profit card s ActivityRing pro marži
- Charts s premium styling (gradient fills, glow)
- Category pie chart s improved legend

---

### 7. SALES REGISTER - Product Card Upgrade

**Soubor:** `src/components/sales/SalesRegister.tsx`

Současně: Glass product cards s hover scale
Nově: Instrument-style product cards

Změny:
- ProductCard jako `.card-floating` s depth
- Stock indicator jako LinearGauge
- "V košíku" badge s pulse animation
- Cart panel jako `.card-floating`

---

### 8. FINANCE HERO KPI - Unified Instrument Style

**Soubor:** `src/components/statistics/FinanceHeroKPI.tsx`

Současně: Grid s MetricCard/GaugeCard/SparklineCard
Nově: Enhanced cards s consistent instrument styling

Změny:
- All cards s unified `.card-floating` base
- GaugeCard s enhanced glow effect
- SparklineCard s larger chart area
- Progress indicators s premium animations

---

### 9. TRAINING HERO KPI - Visual Upgrade

**Soubor:** `src/components/statistics/TrainingHeroKPI.tsx`

Současně: Standard Card s bg-gradient-to-br
Nově: Floating instrument cards

Změny:
- Cards jako `Card variant="floating"`
- Icon containers s glow effect
- Trend indicators prominentnější
- Typography hierarchy vylepšená

---

### 10. CAREER STATS SECTION - Premium Layout

**Soubor:** `src/components/statistics/CareerStatsSection.tsx`

Současně: Basic Card layouts s gradient backgrounds
Nově: Premium floating cards s instruments

Změny:
- KPICard jako `.card-floating`
- Header card s enhanced trophy glow
- Training types grid s better visual separation
- Milestones timeline s premium styling

---

### 11. PERIOD COMPARISON CARD - Instrument Style

**Soubor:** `src/components/statistics/PeriodComparisonCard.tsx`

Současně: Card s MetricBox components
Nově: Premium instrument comparison

Změny:
- MetricBox jako `.card-floating` mini cards
- Trend indicators s animated glow
- Better visual hierarchy
- Sparkline integration pro trends

---

### 12. INTERACTIVE HEATMAP - Premium Styling

**Soubor:** `src/components/statistics/InteractiveHeatmapCard.tsx`

Současně: Standard Card s heatmap grid
Nově: Floating card s enhanced heatmap

Změny:
- Card jako `Card variant="floating"`
- Heatmap cells s subtle glow on hover
- Legend s refined styling
- Summary badges s premium look

---

## Vylepšení existujících chart komponent

### MetricCard Enhancement
**Soubor:** `src/components/charts/MetricCard.tsx`

Změny:
- Přidat `floating` variant pro card wrapper
- Progress bar s enhanced glow
- Dot indicator s pulse animation
- Typography refinement

### SparklineCard Enhancement
**Soubor:** `src/components/charts/SparklineCard.tsx`

Změny:
- Floating variant pro card
- Chart s subtle drop shadow
- Trend badge s refined styling
- Icon container s glow

### GaugeCard Enhancement
**Soubor:** `src/components/charts/GaugeCard.tsx`

Změny:
- Floating variant pro card
- Gauge s enhanced glow effect
- Label typography improvement
- Better responsive sizing

---

## Soubory k úpravě

| Soubor | Změna | Priorita |
|--------|-------|----------|
| `src/pages/PerformanceHub.tsx` | Premium header + tabs | Vysoká |
| `src/components/performance/PerformanceKPIBar.tsx` | Instrument cards | Vysoká |
| `src/components/performance/CategoryCards.tsx` | Floating tiles | Vysoká |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Premium list | Vysoká |
| `src/components/sales/SalesStatistics.tsx` | Premium KPI cards + charts | Vysoká |
| `src/components/sales/SalesRegister.tsx` | Product card upgrade | Střední |
| `src/components/exercises/analytics/AnalyticsKPIRow.tsx` | Instrument style | Střední |
| `src/components/statistics/FinanceHeroKPI.tsx` | Unified instruments | Střední |
| `src/components/statistics/TrainingHeroKPI.tsx` | Visual upgrade | Střední |
| `src/components/statistics/CareerStatsSection.tsx` | Premium layout | Střední |
| `src/components/statistics/PeriodComparisonCard.tsx` | Instrument style | Nízká |
| `src/components/statistics/InteractiveHeatmapCard.tsx` | Premium styling | Nízká |
| `src/components/charts/MetricCard.tsx` | Floating variant | Nízká |
| `src/components/charts/SparklineCard.tsx` | Enhanced styling | Nízká |
| `src/components/charts/GaugeCard.tsx` | Glow enhancement | Nízká |

---

## Vizuální srovnání

### Performance KPI PŘED:
```text
[🏋️ 156 cviků] [📊 423 záznamů] [🏆 12 PR]
```

### Performance KPI PO:
```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   ╭───╮      │ │   ▁▂▄▆█     │ │   🏆         │
│  (○156)      │ │   423        │ │   12         │
│   ╰───╯      │ │   záznamy    │ │   PR         │
│   cviků      │ │   ▲ +8%      │ │   ▲ +3       │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Sales Stats PŘED:
```text
Tržby: 45,250 Kč | Náklady: 12,300 Kč | Zisk: 32,950 Kč
```

### Sales Stats PO:
```text
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ▲ TRŽBY      │  │ ▼ NÁKLADY    │  │ 💰 ČISTÝ ZISK│      │
│  │ 45,250 Kč    │  │ 12,300 Kč    │  │   ╭────╮     │      │
│  │ ▁▃▅▇ +12%    │  │ ▇▅▃▁ -5%     │  │  ( 73% )    │      │
│  └──────────────┘  └──────────────┘  │   ╰────╯     │      │
│                                      │   32,950 Kč  │      │
│                                      └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Technické poznámky

1. **Konzistentní Card variants:**
   - Všechny KPI/metric cards používají `variant="floating"`
   - Instrument cards mají `variant="instrument"` pro extra depth

2. **Typography hierarchy:**
   - Labels: `.label-caps` (text-[10px] uppercase tracking-widest)
   - Values: `text-2xl font-bold tracking-tighter tabular-nums`
   - Subtitles: `text-xs text-muted-foreground`

3. **Visual indicators:**
   - ActivityRing pro procentuální metriky
   - LinearGauge pro stock/progress
   - Sparkline pro trendy
   - Glow effects pro důležité hodnoty

4. **Animation consistency:**
   - Hover: `scale-[1.02]` + `shadow-md` + `y: -2px`
   - Tap: `scale-[0.98]`
   - Transitions: `duration-200 ease-out`

5. **Color system:**
   - Primary (zelená): hlavní metriky, cviky
   - Success (emerald): zisky, pozitivní trendy
   - Warning (amber): PR, důležité hodnoty
   - Destructive (red): náklady, negativní trendy
   - Blue/Accent: neutrální/informativní

