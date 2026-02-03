
# Fáze 11: Premium UI Upgrade - Výkonnost (Přehled & Knihovna cviků)

## Analýza aktuálního stavu

Po důkladné analýze jsem identifikoval několik oblastí ke zlepšení:

### Aktuální struktura stránky Výkonnost
```text
┌─────────────────────────────────────────────────────────────┐
│ ⚡ VÝKONNOST                                                │
│    Cviky, testy a výzvy na jednom místě                    │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Rychle hledat cvik...                       ⌘K]        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ 💪 218  │ │ 📊 45   │ │ 🏆 12   │  <- KPI Bar           │
│ │ cviků   │ │ záznamů │ │ PR      │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
├─────────────────────────────────────────────────────────────┤
│ [Přehled] [Knihovna] [Analytika] [Testy] [Výzvy]           │
├─────────────────────────────────────────────────────────────┤
│ PŘEHLED:                                                   │
│  - CategoryCards (3 dlaždice)                              │
│  - ClientProgressLeaderboard (Top 5 klientů)               │
│  - RecentExercisesChips (Nedávno použité)                  │
├─────────────────────────────────────────────────────────────┤
│ KNIHOVNA:                                                  │
│  - Search + Filters                                        │
│  - Accordion s kategoriemi                                 │
│  - Exercise Cards                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Identifikované problémy

### 1. Layout Přehledu
- **CategoryCards** - chybí vizuální hierarchie, kategorie jsou si příliš podobné
- **Leaderboard** - standard styl, chybí "trophy cabinet" efekt
- **RecentChips** - málo výrazné, splývají s pozadím

### 2. Knihovna cviků
- **Filtry** - collapsible panel působí ploše
- **Accordion** - kategorie nemají dostatek vizuálního odlišení
- **Exercise Cards** - uniformní vzhled bez indikace důležitosti (PR, oblíbené)

### 3. Obecné
- **Header** - mohl by mít výraznější "hero" efekt
- **Navigace** - tab navigation bez animovaného indicatoru

---

## Navržená řešení

### ČÁST A: PŘEHLED (Overview Tab)

#### A1. Hero Section s vylepšeným headerem
```text
╭─────────────────────────────────────────────────────────────╮
│                                                             │
│   ┌────────┐                                                │
│   │   ⚡   │  VÝKONNOST                                     │
│   │  glow  │  Sleduj pokrok svých klientů                  │
│   └────────┘                                                │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 🔍 Rychle hledat cvik...                      ⌘K   │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
```

Změny:
- Header icon s výraznějším glow efektem
- Search bar integrovaný do hero sekce
- Subtilní gradient background

---

#### A2. Premium KPI Dashboard
```text
╭───────────────────────────────────────────────────────────────────╮
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│ │   ╭────────╮    │ │   ╭────────╮    │ │   ╭────────╮    │      │
│ │   │  💪   │    │ │   │  📊   │    │ │   │  🏆   │    │      │
│ │   │ glow  │    │ │   │ glow  │    │ │   │ glow  │    │      │
│ │   ╰────────╯    │ │   ╰────────╯    │ │   ╰────────╯    │      │
│ │                 │ │                 │ │                 │      │
│ │     218         │ │      45         │ │      12         │      │
│ │   CVIKŮ         │ │   ZÁZNAMŮ       │ │   PR            │      │
│ │   v knihovně    │ │   tento měsíc   │ │   tento měsíc   │      │
│ │                 │ │                 │ │                 │      │
│ │ ━━━━━━━━━━━━    │ │ ━━━━━━━━        │ │ ━━━━━           │      │
│ │ progress ring   │ │ vs. minulý měs. │ │ 📈 +8%          │      │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘      │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `PerformanceKPIBar.tsx`:
- Přidat progress ring/gauge pod hodnotu
- Zesílit icon glow efekt
- Přidat mini-sparkline nebo porovnání s minulým obdobím

---

#### A3. Kategorie jako "Dashboard Tiles"
```text
╭───────────────────────────────────────────────────────────────────╮
│  KATEGORIE CVIKŮ                                                 │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │
│ │ gradient overlay │ │ gradient overlay │ │ gradient overlay │      │
│ │                 │ │                 │ │                 │      │
│ │  💪 SÍLA        │ │  ❤️ KARDIO      │ │  ⚡ PLYOMETRIE  │      │
│ │                 │ │                 │ │                 │      │
│ │     152         │ │      48         │ │      18         │      │
│ │    cviků        │ │    cviků        │ │    cviků        │      │
│ │                 │ │                 │ │                 │      │
│ │ ━━━━━━━━━━━━━━  │ │ ━━━━━━━         │ │ ━━━━            │      │
│ │ 2,847 záznamů   │ │ 423 záznamů     │ │ 156 záznamů     │      │
│ │                →│ │                →│ │                →│      │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘      │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `CategoryCards.tsx`:
- Přidat subtle gradient overlay v barvě kategorie
- Zvětšit číslo cvíků (prominence)
- Usage gauge jako horizontální progress bar
- Hover efekt s category-specific glow

---

#### A4. Leaderboard "Trophy Cabinet" styl
```text
╭───────────────────────────────────────────────────────────────────╮
│  🏆 TOP AKTIVNÍ KLIENTI                           [30 dní]       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🥇  Jan Novák                   📈+15%  ━━━━━━━━━━━━ 45    │ │
│  │     ────────────────────────────────────────────────────── │ │
│  │     gold border glow                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🥈  Petr Svoboda                📈+8%   ━━━━━━━━━   38     │ │
│  │     silver border glow                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🥉  Marie Veselá                📈+3%   ━━━━━━━     32     │ │
│  │     bronze border glow                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 4   Lukáš Horák                 ─       ━━━━━━      28     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│                                    [Zobrazit více →]             │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `ClientProgressLeaderboard.tsx`:
- Top 3 s barevným border glow (gold/silver/bronze)
- PR badge výraznější s trophy ikonou
- Progress bar s gradient fill
- Oddělení top 3 od zbytku vizuálně

---

#### A5. "Quick Access" chips pro nedávné cviky
```text
╭───────────────────────────────────────────────────────────────────╮
│  🕐 NEDÁVNO POUŽITÉ                                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ╭───────────────╮ ╭───────────────╮ ╭───────────────╮           │
│  │ 💪 Bench Press│ │ 💪 Deadlift   │ │ ❤️ Rowing     │           │
│  ╰───────────────╯ ╰───────────────╯ ╰───────────────╯           │
│                                                                   │
│  ╭───────────────╮ ╭───────────────╮ ╭───────────────╮           │
│  │ ⚡ Box Jumps  │ │ 💪 Squats     │ │ 💪 Pull-ups   │           │
│  ╰───────────────╯ ╰───────────────╯ ╰───────────────╯           │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `RecentExercisesChips.tsx`:
- Sekce header s ikonou a popiskem
- Floating glass pills s category-specific border
- Hover → lift + shadow-md
- Tooltip s časem posledního použití

---

### ČÁST B: KNIHOVNA CVIKŮ (Library Tab)

#### B1. Premium Filter Panel
```text
╭───────────────────────────────────────────────────────────────────╮
│  218 aktivních cviků                           [+ Nový cvik]     │
├───────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐ ┌───┐ ┌───┐   │
│ │ 🔍 Hledat cvik...                             │ │🎛️│ │✏️│   │
│ └───────────────────────────────────────────────┘ └───┘ └───┘   │
├───────────────────────────────────────────────────────────────────┤
│  FILTRY (zobrazeno pokud aktivní)                                │
│ ╭──────────────────────────────────────────────────────────────╮ │
│ │ Kategorie    Pohyb. vzorec     Obtížnost      Řazení        │ │
│ │ [▼ Vše]      [▼ Vše]           [▼ Vše]       [▼ Abecedně]   │ │
│ │                                                              │ │
│ │ ○ Pouze použité                                              │ │
│ ╰──────────────────────────────────────────────────────────────╯ │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `ExerciseListView.tsx`:
- Filter panel jako floating glass card
- Active filters zobrazeny jako dismissible chips
- Počet filtrovaných výsledků live update

---

#### B2. Category Accordion Premium
```text
╭───────────────────────────────────────────────────────────────────╮
│ HORNÍ TĚLO                                        45 cviků   ▼  │
│ ─────────────────────────────────────────────────────────────────│
│ ✦ 847× použito                                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ★ Bench Press                    Tlak horiz.    125× → │ │
│  │   ━━━━━━━━━━━━━━━━━━━━━━━━ usage bar                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │   Pull-ups                       Tah vertik.     89× → │ │
│  │   ━━━━━━━━━━━━━━━━━━ usage bar                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │   Shoulder Press                 Tlak vertik.    67× → │ │
│  │   ━━━━━━━━━━━━━━ usage bar                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Category header s usage statistikou
- Barevný indikátor kategorie (levý border)
- Usage bar pod názvem cviku
- Favorite star výraznější (gold fill)

---

#### B3. Exercise Card Premium
```text
┌─────────────────────────────────────────────────────────────────┐
│ ★ Bench Press                                                    │
│ ─────────────────────────────────────────────────────────────── │
│ Tlak horizontální  •  Pokročilý                                 │
│                                                                  │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                       │
│ │ 📊 125×   │ │ 👥 8      │ │ 🏆 3 PR   │                       │
│ │ použití   │ │ klientů   │ │ tento měs │                       │
│ └───────────┘ └───────────┘ └───────────┘                       │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  usage gauge (80%)     │
│                                                          →      │
└─────────────────────────────────────────────────────────────────┘
```

Změny v exercise card:
- Přidat mini-stats row (použití, klienti, PR)
- Usage gauge pod kartou
- Favorite star s glow efektem
- PR badge s trophy ikonou pokud existují

---

### ČÁST C: OBECNÁ VYLEPŠENÍ

#### C1. Animated Tab Indicator
```text
┌─────────────────────────────────────────────────────────────────┐
│  ╭─────────────────────────────────────────────────────────────╮│
│  │ [⚡Přehled] [📋Knihovna] [📊Analytika] [📝Testy] [🏆Výzvy] ││
│  │  ▓▓▓▓▓▓▓▓▓                                                 ││
│  │  animated pill indicator                                    ││
│  ╰─────────────────────────────────────────────────────────────╯│
└─────────────────────────────────────────────────────────────────┘
```

Změny:
- Tabs s glass background
- Active tab má animated background pill
- Icons barevně odlišené

---

#### C2. ExerciseSearchCommand Enhancement
```text
╭───────────────────────────────────────────────────────────────────╮
│ 🔍 Hledat cvik...                                         ⌘K    │
╰───────────────────────────────────────────────────────────────────╯
                           ↓ (open)
╭───────────────────────────────────────────────────────────────────╮
│ │ Hledej cvik...                                                │ │
├───────────────────────────────────────────────────────────────────┤
│ NEDÁVNO POUŽITÉ                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 💪 Bench Press           před 2h                [Síla]    │   │
│ └────────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 💪 Deadlift              před 1d                [Síla]    │   │
│ └────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────┤
│ OBLÍBENÉ ★                                                       │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ⚡ Box Jumps  ★           45× použito          [Plyo]     │   │
│ └────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────┤
│ VŠECHNY CVIKY                                                    │
│ ...                                                              │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Command items s category badge
- Favorite star výraznější
- Usage count zobrazeno
- Glass background na items

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita
| Soubor | Změny |
|--------|-------|
| `src/pages/PerformanceHub.tsx` | Hero header, animated tabs, layout polish |
| `src/components/performance/PerformanceKPIBar.tsx` | Progress rings, enhanced glow, mini-trends |
| `src/components/performance/CategoryCards.tsx` | Gradient overlays, prominent numbers, enhanced gauges |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Trophy cabinet, rank-based glow, visual separation |
| `src/components/performance/RecentExercisesChips.tsx` | Section header, glass pills, tooltips |

### Střední priorita
| Soubor | Změny |
|--------|-------|
| `src/components/exercises/ExerciseListView.tsx` | Filter panel glass, accordion polish, usage bars |
| `src/components/performance/ExerciseSearchCommand.tsx` | Enhanced command items, category badges |

---

## TECHNICKÉ DETAILY

### KPI Card s Progress Ring
```tsx
<div className={cn(
  "relative overflow-hidden rounded-xl p-4",
  "bg-card/80 backdrop-blur-md",
  "border shadow-sm",
  kpi.borderColor,
  "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
)}>
  {/* Background gradient */}
  <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br to-transparent", kpi.bgColor)} />
  
  <div className="relative">
    {/* Icon with enhanced glow */}
    <div className={cn(
      'p-3 rounded-xl w-fit mb-3',
      kpi.bgColor,
      'shadow-lg',
      `shadow-${kpi.glowColor}`
    )}>
      <kpi.icon className={cn('w-6 h-6', kpi.color)} />
    </div>
    
    {/* Value */}
    <p className="text-3xl font-bold text-foreground tabular-nums">
      {kpi.value.toLocaleString('cs-CZ')}
    </p>
    
    {/* Label */}
    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
      {kpi.label}
    </p>
    
    {/* Progress ring or comparison */}
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">vs. minulý měsíc</span>
        <TrendIndicator value={kpi.trend} />
      </div>
    </div>
  </div>
</div>
```

### Leaderboard Row s Rank Glow
```tsx
<button className={cn(
  'w-full flex items-center gap-3 p-3.5 rounded-xl',
  'bg-card/60 backdrop-blur-sm',
  'border shadow-sm',
  'hover:shadow-md hover:-translate-y-0.5',
  'transition-all duration-200',
  // Rank-specific styling
  index === 0 && 'border-yellow-500/40 shadow-yellow-500/20',
  index === 1 && 'border-gray-400/40 shadow-gray-400/20',
  index === 2 && 'border-amber-600/40 shadow-amber-600/20',
  index > 2 && 'border-border/30'
)}>
```

### Exercise Card s Usage Bar
```tsx
<Card className={cn(
  "p-3 bg-background/60 backdrop-blur-sm border-border/30 shadow-sm",
  "hover:bg-secondary/50 hover:shadow-md hover:-translate-y-0.5",
  "transition-all duration-200 cursor-pointer group"
)}>
  <div className="flex items-center justify-between mb-2">
    {/* Name + badges */}
  </div>
  
  {/* Usage bar */}
  <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
    <div 
      className="h-full rounded-full bg-primary/60 transition-all duration-500"
      style={{ width: `${usagePercent}%` }}
    />
  </div>
</Card>
```

---

## OČEKÁVANÝ VÝSLEDEK

### Vizuální srovnání

#### PŘED (Přehled):
```text
┌───────────────────────────────────────┐
│ ⚡ Výkonnost                          │
│ [Search...]                           │
│ ┌───┐ ┌───┐ ┌───┐  <- flat KPIs      │
│ ┌───┐ ┌───┐ ┌───┐  <- flat categories │
│ Leaderboard (basic list)              │
│ Recent: [chip] [chip] [chip]          │
└───────────────────────────────────────┘
```

#### PO (Přehled):
```text
╭───────────────────────────────────────╮
│ ⚡ VÝKONNOST         hero section     │
│ ────────────────────────────────────  │
│ [🔍 Rychle hledat...]    glass input │
├───────────────────────────────────────┤
│ ╭─────╮ ╭─────╮ ╭─────╮              │
│ │ 218 │ │  45 │ │  12 │  ← floating  │
│ │glow │ │glow │ │glow │    KPI cards │
│ ╰─────╯ ╰─────╯ ╰─────╯              │
├───────────────────────────────────────┤
│ KATEGORIE CVIKŮ                       │
│ ╭─────────╮ ╭─────────╮ ╭─────────╮  │
│ │gradient │ │gradient │ │gradient │  │
│ │  152    │ │   48    │ │   18    │  │
│ │ ━━━━━━  │ │ ━━━     │ │ ━━      │  │
│ ╰─────────╯ ╰─────────╯ ╰─────────╯  │
├───────────────────────────────────────┤
│ 🏆 TOP AKTIVNÍ KLIENTI                │
│ ╭─────────────────────────────────╮   │
│ │ 🥇 Jan Novák      gold glow    │   │
│ ╰─────────────────────────────────╯   │
│ ╭─────────────────────────────────╮   │
│ │ 🥈 Petr Svoboda   silver glow  │   │
│ ╰─────────────────────────────────╯   │
├───────────────────────────────────────┤
│ 🕐 NEDÁVNO POUŽITÉ                    │
│ ╭──────╮ ╭──────╮ ╭──────╮           │
│ │glass │ │glass │ │glass │           │
│ ╰──────╯ ╰──────╯ ╰──────╯           │
╰───────────────────────────────────────╯
```

---

## ANIMACE A INTERAKCE

1. **KPI Cards:**
   - Icon pulse na hover
   - Shadow-md + lift na hover
   - Trend badge s micro-animation

2. **Category Cards:**
   - Gradient intensify na hover
   - Usage gauge smooth fill
   - ChevronRight translate

3. **Leaderboard:**
   - Top 3 s subtle glow pulse
   - Row hover → lift + shadow
   - Progress bar smooth transition

4. **Recent Chips:**
   - Hover → lift + category glow
   - Focus ring na keyboard nav

5. **Exercise Cards:**
   - Usage bar animate on mount
   - Star scale + glow on toggle
   - Card lift + shadow on hover

---

## KONZISTENCE

Všechny změny dodržují zavedený design systém:
- `.card-floating` / `bg-card/80 backdrop-blur-md`
- `shadow-sm` → `shadow-md` on hover
- `tabular-nums` pro číselné hodnoty
- Category-specific glow colors
- Hover lift (`-translate-y-0.5` až `-translate-y-1`)
- Status-based color coding
- Premium typography (uppercase labels, bold values)
