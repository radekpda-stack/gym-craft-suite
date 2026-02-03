
# Fáze 10: Premium Upgrade - Výkonnost, Analytika, Výzvy & Knihovna cviků

## Přehled

Tato fáze aplikuje konzistentní premium glassmorphism styl na zbývající sekce:
1. **PerformanceHub** - hlavní stránka Výkonnost s přehledem
2. **Analytika** - záložka s grafy a KPI kartami
3. **Výzvy (Challenges)** - správa výzev pro klienty
4. **Knihovna cviků** - seznam a filtrování cviků

---

## ČÁST 1: PERFORMANCE HUB - Přehled

### 1.1 PerformanceHub.tsx - Premium Header & Layout

**Soubor:** `src/pages/PerformanceHub.tsx`

Aktuální: `p-3 rounded-2xl bg-primary/15 backdrop-blur-sm`
Nové: Premium floating header s enhanced icon glow

Změny:
- Header icon container s `shadow-lg shadow-primary/20`
- TabsList jako glass container s `backdrop-blur-sm bg-secondary/30`
- Consistent spacing a typography

---

### 1.2 PerformanceKPIBar.tsx - Instrument Cards

**Soubor:** `src/components/performance/PerformanceKPIBar.tsx`

Aktuální: Má `bg-card/80 backdrop-blur-md` - již částečně upraven
Nové: Zesílit hover efekty a glow

Změny:
- Přidat `shadow-sm` default + `shadow-md` on hover
- Zesílit border glow podle kategorie
- Trend badge s refined styling

---

### 1.3 CategoryCards.tsx - Premium Category Tiles

**Soubor:** `src/components/performance/CategoryCards.tsx`

Aktuální: `bg-card/80 backdrop-blur-md` s basic hover
Nové: Enhanced floating tiles s category glow

Změny:
- Přidat `shadow-sm` + `hover:shadow-lg`
- Category-specific glow on hover (`shadow-primary/30`, `shadow-emerald-500/30`, `shadow-warning/30`)
- Stock gauge pro entries jako horizontální bar
- ChevronRight s hover animation

---

### 1.4 ClientProgressLeaderboard.tsx - Premium Leaderboard

**Soubor:** `src/components/performance/ClientProgressLeaderboard.tsx`

Aktuální: `bg-card/80 backdrop-blur-md` container s basic rows
Nové: Floating container s premium client rows

Změny:
- Container jako `.card-floating`
- Client rows s enhanced hover lift
- Rank badges s category-specific glow (gold/silver/bronze)
- Progress bar s gradient fill
- Trophy icon s warning glow

---

### 1.5 ExerciseSearchCommand.tsx - Glass Command Palette

**Soubor:** `src/components/performance/ExerciseSearchCommand.tsx`

Aktuální: Standard Command dialog
Nové: Premium glass command s enhanced items

Změny:
- Search button s glass background + focus glow
- Command items s hover lift
- Category badges s colored backgrounds
- Star icon s warning fill glow
- Keyboard shortcut badge refined

---

### 1.6 RecentExercisesChips.tsx - Premium Pills

**Soubor:** `src/components/performance/RecentExercisesChips.tsx`

Aktuální: Basic colored pills
Nové: Floating glass pills s hover effects

Změny:
- Pills s `backdrop-blur-sm` + `shadow-sm`
- Hover → lift + shadow-md
- Category icon s colored glow background
- Active/focus states refined

---

## ČÁST 2: ANALYTIKA - Charts & KPIs

### 2.1 ExerciseAnalyticsView.tsx - Premium Tab Navigation

**Soubor:** `src/components/exercises/ExerciseAnalyticsView.tsx`

Aktuální: Standard TabsList
Nové: Glass tabs s animated indicator

Změny:
- TabsList jako `bg-secondary/30 backdrop-blur-sm rounded-lg p-1`
- Tab icons s category-specific colors
- Active state s enhanced styling

---

### 2.2 StrengthAnalyticsView.tsx - Layout Polish

**Soubor:** `src/components/exercises/analytics/StrengthAnalyticsView.tsx`

Aktuální: Standard grid layout
Nové: Consistent card spacing + floating style

Změny:
- Ensure all child cards use consistent `.card-floating` pattern
- Add subtle section dividers
- Loading states s consistent skeleton styling

---

### 2.3 AnalyticsCard.tsx - Premium Card Wrapper

**Soubor:** `src/components/exercises/analytics/AnalyticsCard.tsx`

Aktuální: Standard Card component
Nové: Floating glass card s premium header

Změny:
- Card jako `.card-floating` s `bg-card/80 backdrop-blur-md`
- Header icon s colored glow background
- Loading spinner refined
- Empty state s premium illustration

---

### 2.4 AnalyticsKPICards.tsx - Instrument KPIs

**Soubor:** `src/components/exercises/analytics/AnalyticsKPICards.tsx`

Aktuální: Standard Card s basic styling
Nové: Premium floating KPI cards

Změny:
- Cards jako floating mini-instruments
- Icon containers s category glow
- Values s `tabular-nums`
- Trend badges s refined colors

---

### 2.5 VolumeTimelineCardNew.tsx - Chart Polish

**Soubor:** `src/components/exercises/analytics/VolumeTimelineCardNew.tsx`

Aktuální: AnalyticsCard wrapper s AreaChart
Nové: Enhanced tooltip + gradient styling

Změny:
- Tooltip s glass background (`backdrop-blur-md`)
- Gradient fill zesílený
- Total summary s prominent styling

---

### 2.6 AnalyticsFiltersBar.tsx - Glass Filters

**Soubor:** `src/components/exercises/analytics/AnalyticsFiltersBar.tsx`

Aktuální: Standard filter controls
Nové: Premium glass filter bar

Změny:
- Bar jako floating glass container
- Period pills s animated selection
- Client select s glass styling
- Toggle switch refined

---

## ČÁST 3: VÝZVY (CHALLENGES)

### 3.1 ChallengesContent.tsx - Premium Challenge Cards

**Soubor:** `src/components/performance/ChallengesContent.tsx`

Aktuální: Standard Card s `hover:shadow-md`
Nové: Premium floating challenge cards

Změny:
- Challenge cards jako `.card-floating`
- Status badges s glow effects (active = success glow)
- Public badge s emerald glow
- Date/metric info s refined typography
- Video badge s play icon glow

---

### 3.2 Challenges.tsx (page) - Premium Layout

**Soubor:** `src/pages/Challenges.tsx`

Aktuální: Standard page layout
Nové: Premium header + glass search

Změny:
- Trophy icon s `shadow-lg shadow-warning/20`
- Search input s glass background + focus glow
- TabsList jako glass container
- Empty states s premium illustrations

---

## ČÁST 4: KNIHOVNA CVIKŮ

### 4.1 ExerciseListView.tsx - Premium List

**Soubor:** `src/components/exercises/ExerciseListView.tsx`

Aktuální: Standard accordion s basic exercise rows
Nové: Premium floating categories + exercise items

Změny:
- Accordion items jako floating containers
- Exercise rows s hover lift + glass background
- Category headers s premium styling
- Bulk edit mode s refined selection states
- Filter panel s glass background
- Sort/toggle controls s refined styling
- Star (favorite) icon s warning glow

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita - Performance Hub
| Soubor | Změna |
|--------|-------|
| `src/pages/PerformanceHub.tsx` | Premium header + tabs |
| `src/components/performance/CategoryCards.tsx` | Enhanced floating tiles |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Premium leaderboard |
| `src/components/performance/PerformanceKPIBar.tsx` | Enhanced instrument cards |

### Vysoká priorita - Analytika
| Soubor | Změna |
|--------|-------|
| `src/components/exercises/analytics/AnalyticsCard.tsx` | Floating glass wrapper |
| `src/components/exercises/analytics/AnalyticsKPICards.tsx` | Premium KPI cards |
| `src/components/exercises/ExerciseAnalyticsView.tsx` | Glass tab navigation |
| `src/components/exercises/analytics/AnalyticsFiltersBar.tsx` | Glass filter bar |

### Střední priorita - Výzvy
| Soubor | Změna |
|--------|-------|
| `src/components/performance/ChallengesContent.tsx` | Premium challenge cards |
| `src/pages/Challenges.tsx` | Premium page layout |

### Střední priorita - Knihovna
| Soubor | Změna |
|--------|-------|
| `src/components/exercises/ExerciseListView.tsx` | Premium list + filters |
| `src/components/performance/ExerciseSearchCommand.tsx` | Glass command palette |
| `src/components/performance/RecentExercisesChips.tsx` | Premium pills |

---

## TECHNICKÉ DETAILY

### Category Card Enhanced
```tsx
<button className={cn(
  'relative overflow-hidden rounded-xl p-4 text-left',
  'bg-card/80 backdrop-blur-md',
  'border shadow-sm transition-all duration-200',
  config.borderColor,
  'hover:shadow-lg hover:-translate-y-1',
  `hover:shadow-${config.glowColor}`,
  'focus:outline-none focus:ring-2 focus:ring-primary/30'
)}>
  {/* Category glow effect */}
  <div className={cn(
    "absolute inset-0 opacity-20 bg-gradient-to-br to-transparent",
    config.bgColor
  )} />
  ...
</button>
```

### Leaderboard Client Row
```tsx
<button className={cn(
  'w-full flex items-center gap-3 p-3 rounded-xl',
  'bg-card/60 backdrop-blur-sm',
  'border border-border/30 shadow-sm',
  'hover:bg-secondary/50 hover:shadow-md hover:-translate-y-0.5',
  'transition-all duration-200'
)}>
```

### Analytics Card Floating
```tsx
<Card className={cn(
  'bg-card/80 backdrop-blur-md',
  'border border-border/50 shadow-sm',
  'transition-all duration-200'
)}>
```

### Challenge Card Premium
```tsx
<Card className={cn(
  'bg-card/80 backdrop-blur-md',
  'border border-border/50 shadow-sm',
  'hover:shadow-md hover:-translate-y-0.5',
  'transition-all duration-200'
)}>
```

### Exercise Row Premium
```tsx
<button className={cn(
  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
  'bg-card/60 backdrop-blur-sm',
  'hover:bg-secondary/50 hover:shadow-sm hover:-translate-y-0.5',
  'transition-all duration-200',
  selected && 'ring-2 ring-primary bg-primary/10'
)}>
```

---

## VIZUÁLNÍ SROVNÁNÍ

### Category Cards PŘED:
```text
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 💪 SÍLA     │ │ ❤️ KARDIO   │ │ ⚡ PLYO     │
│    52       │ │    18       │ │    24       │
│ 1,234 zázn. │ │   456 zázn. │ │   890 zázn. │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Category Cards PO:
```text
╭─────────────╮ ╭─────────────╮ ╭─────────────╮
│ 💪 SÍLA     │ │ ❤️ KARDIO   │ │ ⚡ PLYO     │  ← glass blur
│    52       │ │    18       │ │    24       │
│ ━━━━━━━━    │ │ ━━━━        │ │ ━━━━━━      │  ← usage gauge
│ 1,234 zázn. │ │   456 zázn. │ │   890 zázn. │
╰─────────────╯ ╰─────────────╯ ╰─────────────╯
      ↑ category-specific glow on hover
```

### Leaderboard PŘED:
```text
[1] 🏅 Jan Novák      📈+15%  45 zázn.
[2] 🥈 Petr Svoboda   📈+8%   38 zázn.
[3] 🥉 Marie Veselá   📈+3%   32 zázn.
```

### Leaderboard PO:
```text
╭───────────────────────────────────────────╮
│ 🏆 Top aktivní klienti          [30 dní] │
├───────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ │
│ │ 🥇 Jan Novák    📈+15%    ━━━━━━ 45  │ │  ← gold glow
│ └───────────────────────────────────────┘ │
│ ┌───────────────────────────────────────┐ │
│ │ 🥈 Petr Svoboda 📈+8%     ━━━━━  38  │ │  ← silver glow
│ └───────────────────────────────────────┘ │
│ ┌───────────────────────────────────────┐ │
│ │ 🥉 Marie Veselá 📈+3%     ━━━━   32  │ │  ← bronze glow
│ └───────────────────────────────────────┘ │
╰───────────────────────────────────────────╯
```

### Challenge Card PŘED:
```text
┌───────────────────────────────────┐
│ 100 Burpees        [Aktivní]     │
│ Kdo dá nejrychleji 100 burpees?  │
│ Metrika: Čas  │  Hodnocení: Nižší│
│ Od: 1.1.2025  │  Do: 31.1.2025   │
└───────────────────────────────────┘
```

### Challenge Card PO:
```text
╭───────────────────────────────────╮
│ 100 Burpees    🌍  ┃ 🟢 Aktivní ┃│  ← status glow
│ ────────────────────────────────  │
│ Kdo dá nejrychleji 100 burpees?  │
├───────────────────────────────────┤
│ Metrika: Čas     Hodnocení: Nižší │
│ ┌──────────┐    ┌───────────────┐ │
│ │📅 1.1.25 │    │📅 31.1.25    │ │
│ └──────────┘    └───────────────┘ │
╰───────────────────────────────────╯
      ↑ floating glass + hover lift
```

---

## ANIMACE A INTERAKCE

1. **Category Cards:**
   - Hover: `-translate-y-1`, `shadow-lg`, category glow
   - Usage gauge: gradient fill animation
   - ChevronRight: `translateX(2px)` on hover

2. **Leaderboard:**
   - Client rows: hover lift + shadow
   - Rank badges: subtle pulse for top 3
   - Progress bar: smooth width transition

3. **Challenge Cards:**
   - Hover: `-translate-y-0.5`, `shadow-md`
   - Active status: success glow pulse
   - Public badge: emerald glow

4. **Analytics Cards:**
   - Loading: refined spinner
   - Charts: smooth fade-in
   - Tooltips: glass background

5. **Exercise List:**
   - Accordion: smooth expand/collapse
   - Exercise rows: hover lift
   - Favorite star: scale + glow on click

---

## KONZISTENCE S PŘEDCHOZÍMI FÁZEMI

Všechny změny následují zavedený design systém:
- `.card-floating` / `bg-card/80 backdrop-blur-md` pro glass cards
- `shadow-sm` default + `shadow-md/lg` on hover
- `tabular-nums` pro číselné hodnoty
- Category-specific glow colors (primary, emerald, warning)
- Hover lift effects (`-translate-y-0.5` až `-translate-y-1`)
- Status-based color coding (success/warning/destructive)
- Premium typography (uppercase labels, bold values, `tracking-widest`)
