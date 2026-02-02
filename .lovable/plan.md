
# Fáze 3 & 4: Pokračování grafických úprav UI/UX

## Shrnutí předchozích změn (Fáze 1 & 2)
✅ Nové CSS utility třídy (`.metric-hero`, `.label-caps`, `.card-floating`, `.skeleton-glow`)
✅ Activity Ring komponenta (Apple-style progress kruhy)
✅ Gauge Meter komponenta (Garmin-style indikátory)
✅ Vylepšená Card komponenta s `floating` a `instrument` variantami
✅ Animation presets library (`src/lib/animations.ts`)

---

## Fáze 3: Integrace do existujících komponent

### 3.1 Dashboard Header - Hero metriky

**Soubor:** `src/components/dashboard/DashboardHeader.tsx`

Současně: Malé badge s metrikami (text-xs, bg-secondary/50)
Nově: Premium "Instrument Panel" s většími čísly a Activity Rings

```text
┌─────────────────────────────────────────────────────────────┐
│  ● Dobré ráno                                               │
│    Pondělí, 3. února                    [🏋️ Trénink] [📊]  │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ ○○○3/5  │ │   3     │ │  4.2k   │ │   ↑     │           │
│  │ Tréninky│ │ Klienti │ │ Příjem  │ │ Trend   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

Změny:
- Status dot větší (w-3 h-3) s subtle glow
- Metriky jako mini-karty s `.card-floating` efektem
- Ikony menší a monochromatické
- Micro Activity Ring pro kapacitu (completed/total)

---

### 3.2 Today Timeline - Premium Timeline design

**Soubor:** `src/components/dashboard/TodayTimelineCompact.tsx`

Současně: Rounded-xl karty s bg-secondary/30
Nově: Floating glass karty s timeline connector

```text
    ○──── 09:00 ───────────────────────────
    │   ┌─────────────────────────────────┐
    │   │ 🔵 Jan Novák • Solo             │
    │   │ Další trénink                   │
    │   └─────────────────────────────────┘
    │
    ●──── 10:30 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← NYNÍ
    │   ┌─────────────────────────────────┐
    │   │ 🟢 Eva Svobodová • Done         │
    │   └─────────────────────────────────┘
    │
    ○──── 12:00 ───────────────────────────
```

Změny:
- Timeline čára vlevo místo pouze tečky
- "NOW" indikátor jako červená horizontální čára
- Floating glass effect na položkách (bg-card/60, backdrop-blur)
- Jemnější přechody (opacity 0.8 pro dokončené)
- Hover efekt: slight lift (y: -2px)

---

### 3.3 Business Yield Score - Activity Ring integrace

**Soubor:** `src/components/dashboard/BusinessYieldScoreCard.tsx`

Současně: Velké číslo (text-3xl) v boxu
Nově: Activity Ring s score uprostřed

```text
    ┌────────────────────────────────────────────────┐
    │       ╭────────╮                               │
    │      ╱ ╭────╮  ╲   Business Yield    ⓘ        │
    │     │  │ 78 │   │  ✓ Stabilní  +2/týden       │
    │      ╲ ╰────╯  ╱                               │
    │       ╰────────╯                               │
    │                                                │
    │  [████ Efekt] [███░ Využití] [██░░ Klienti]   │
    └────────────────────────────────────────────────┘
```

Změny:
- Nahradit box 20x20 Activity Ringem
- Score uvnitř kruhu
- Pillar bars pod ringem
- Gradient background subtilnější

---

### 3.4 Quick Stats - Instrument Cards

**Soubor:** `src/components/dashboard/QuickStats.tsx`

Současně: Grid 2x3 s p-4 kartami
Nově: Instrument-style karty s micro-gauge

Změny:
- Card variant="instrument" pro každou stat kartu
- Micro gauge pro trendy (LinearGauge komponenta)
- Ikony menší (w-3.5) s subtle color
- Čísla větší (text-2xl font-bold tracking-tighter)
- Labels jako `.label-caps` (uppercase, letter-spacing)

---

### 3.5 Sidebar - Collapsed jako default

**Soubor:** `src/components/layout/Sidebar.tsx`

Současně: `const [collapsed, setCollapsed] = useState(false);`
Nově: `const [collapsed, setCollapsed] = useState(true);`

+ Hover expand behavior:
```tsx
onMouseEnter={() => !collapsed && setHovered(true)}
onMouseLeave={() => setHovered(false)}
```

Změny:
- Default collapsed (w-16)
- Hover na desktop → expand animace
- Tooltip pro navigaci při collapsed stavu již funguje
- Jemnější border (border-border/20)

---

### 3.6 Mobile Nav - Větší touch targets

**Soubor:** `src/components/layout/MobileNav.tsx`

Současně: Touch targets w-10 h-10
Nově: Touch targets w-12 h-12 s premium glass

Změny:
- Větší ikony (w-6 h-6)
- Aktivní stav: subtle glow efekt
- Tap feedback: scale(0.95) transition
- Label text-[10px] místo text-[9px]

---

### 3.7 Empty State - Animované ilustrace

**Soubor:** `src/components/ui/empty-state.tsx`

Současně: Statická ikona v kruhu
Nově: Animated icon s breathing effect

```tsx
<motion.div
  className="rounded-full bg-muted/30 flex items-center justify-center"
  animate={{ 
    scale: [1, 1.02, 1],
    opacity: [0.8, 1, 0.8] 
  }}
  transition={{ duration: 3, repeat: Infinity }}
>
  <Icon />
</motion.div>
```

Změny:
- Breathing animation na ikonu
- Gradient background (from-muted/40 to-muted/20)
- Akční tlačítko s hover glow

---

### 3.8 Alerts Summary Card - Premium Alert styling

**Soubor:** `src/components/dashboard/AlertsSummaryCard.tsx`

Současně: Flat colored backgrounds (bg-warning/10)
Nově: Glass morphism s colored border glow

Změny:
- Alert items jako floating cards
- Border glow pro severity (ring-1 ring-warning/40)
- Icon container s subtle pulse pro critical
- ChevronRight s hover animation

---

## Fáze 4: Polish & Micro-interactions

### 4.1 Globální Touch Feedback

**Soubor:** `src/lib/animations.ts` (už existuje)

Přidat nové presets:
```typescript
export const touchFeedback = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.1 }
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: 0.2, ease: appleEase }
};

export const buttonPress = {
  whileTap: { scale: 0.98, opacity: 0.9 },
  transition: { duration: 0.1 }
};
```

### 4.2 Loading Skeleton Enhancement

**Soubor:** `src/components/ui/skeleton.tsx`

Změny:
- Přidat `.skeleton-shimmer` třídu jako default
- Gradient shimmer animace
- Subtle rounded corners (rounded-xl)

### 4.3 Success Celebrations

**Využití existujícího:** `src/lib/confetti.ts`

Přidat volání při:
- Dokončení tréninku
- Dosažení PR
- Uhrazení platby

---

## Soubory k úpravě

| Soubor | Změna | Priorita |
|--------|-------|----------|
| `src/components/dashboard/DashboardHeader.tsx` | Hero metriky + Activity Ring | Vysoká |
| `src/components/dashboard/TodayTimelineCompact.tsx` | Premium timeline design | Vysoká |
| `src/components/dashboard/BusinessYieldScoreCard.tsx` | Activity Ring score | Vysoká |
| `src/components/dashboard/QuickStats.tsx` | Instrument cards | Střední |
| `src/components/layout/Sidebar.tsx` | Collapsed default | Střední |
| `src/components/layout/MobileNav.tsx` | Větší touch targets | Střední |
| `src/components/ui/empty-state.tsx` | Animated icons | Střední |
| `src/components/dashboard/AlertsSummaryCard.tsx` | Premium alerts | Střední |
| `src/components/ui/skeleton.tsx` | Shimmer effect | Nízká |
| `src/lib/animations.ts` | Nové presets | Nízká |

---

## Vizuální srovnání

### Dashboard PŘED:
```text
┌─────────────────────────────────┐
│ ● Dobré ráno, pondělí           │
│ [3/5] [3] [4.2k Kč] [↑12%]     │  ← malé badge
└─────────────────────────────────┘
```

### Dashboard PO:
```text
┌─────────────────────────────────┐
│ ●○ Dobré ráno                   │  ← větší status dot
│    Pondělí, 3. února            │
│                                 │
│ ┌──────┐┌──────┐┌──────┐┌──────┐│
│ │(○60%)││  3   ││ 4.2k ││  ↑   ││  ← instrument cards
│ │Kapac.││Klient││Příjem││Trend ││
│ └──────┘└──────┘└──────┘└──────┘│
└─────────────────────────────────┘
```

---

## Technické poznámky

1. **Activity Ring v DashboardHeader:**
   - Použije `import { ActivityRing } from '@/components/ui/activity-ring'`
   - Progress = (completed / total) * 100
   - Size "sm" pro kompaktní zobrazení

2. **Timeline NOW indicator:**
   - Spočítat pozici podle aktuálního času
   - Absolutní pozicování s červenou čárou
   - Pulse animace pro viditelnost

3. **Sidebar collapsed:**
   - localStorage persist pro user preference
   - Keyboard shortcut (Cmd+B) pro toggle

4. **Touch feedback:**
   - Aplikovat `touchFeedback` na všechny interaktivní elementy
   - Kombinovat s `haptic.light()` z existujícího systému
