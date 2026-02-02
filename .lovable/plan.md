
# Vylepšení UI/UX - Inspirace Whoop, Garmin, Apple

## Shrnutí současného stavu

Aplikace má dobrý základ:
- ✅ Dark-first design s více tématy (Arctic Pro, Nike, Pulse, Noir Luxe)
- ✅ Glassmorphism efekty (backdrop-blur, transparence)
- ✅ Framer Motion animace
- ✅ Responsivní design s mobile-first přístupem

Ale chybí několik klíčových prvků prémiových fitness aplikací:

---

## Principy designu Whoop/Garmin/Apple

| Prvek | Whoop | Garmin | Apple Fitness |
|-------|-------|--------|---------------|
| Vizuální jazyk | Data-first, tmavý, minimal | Přístrojový, robustní | Čistý, barevné kruhy |
| Typografie | Mono-space pro čísla | Condensed, technický | SF Pro, velké nadpisy |
| Barvy | Zelená/červená jako signály | Oranžová/modrá akcenty | Duha aktivit |
| Metriky | Kruhy (strain, recovery) | Gauge meters | Activity rings |
| Animace | Plynulé, data-driven | Minimální | Oslavné, achievement |

---

## Navrhované změny

### 1. TYPOGRAFIE - Větší kontrast a hierarchy

**Problém:** Současná typografie je příliš uniformní, chybí dramatický kontrast.

**Řešení:**
```
Metriky/čísla: 
- Současně: text-[28px] font-semibold
- Nově: text-[48px] font-bold tracking-tighter (Whoop style)

Sekundární:
- Současně: text-sm text-muted-foreground
- Nově: text-[11px] uppercase tracking-widest text-muted-foreground
```

**Soubory:**
- `src/index.css` - nové utility třídy `.metric-hero`, `.label-caps`
- `src/components/dashboard/KPICard.tsx` - aplikovat novou typografii

---

### 2. METRIKY - Instrumenty místo plain text

**Problém:** Data zobrazena jako text, ne jako vizuální "instrumenty".

**Řešení:** Přidat komponenty:

**A) Activity Rings (Apple style)**
```tsx
<ActivityRing 
  progress={75} 
  color="primary" 
  size="lg" 
  label="Kapacita" 
/>
```

**B) Gauge Meters (Garmin style)**
```tsx
<GaugeMeter 
  value={85} 
  min={0} 
  max={100}
  zones={[
    { from: 0, to: 40, color: 'red' },
    { from: 40, to: 70, color: 'yellow' },
    { from: 70, to: 100, color: 'green' }
  ]}
/>
```

**C) Strain Score (Whoop style)**
```tsx
<StrainIndicator 
  score={14.2} 
  maxScore={21}
  pulse // animovaný glow efekt
/>
```

**Nové soubory:**
- `src/components/ui/activity-ring.tsx`
- `src/components/ui/gauge-meter.tsx`
- `src/components/ui/strain-indicator.tsx`

---

### 3. NAVIGACE - Simplifikace a Focus

**Problém:** Sidebar má 15+ položek, cognitive overload.

**Řešení:**

**A) Desktop Sidebar - Ikony jako default**
```
Současně: Rozbalený sidebar (224px) jako default
Nově: Collapsed (64px) jako default, hover expand
```

**B) Mobile Bottom Bar - Přidat haptic feedback styling**
```tsx
// Větší touch targets, glow on active
<NavItem className="w-16 h-16 rounded-2xl" />
```

**C) Quick Actions - Floating radial menu**
Inspirace Apple Watch:
```tsx
<RadialActionMenu 
  trigger={<Plus />}
  actions={[
    { icon: Dumbbell, label: 'Trénink' },
    { icon: CreditCard, label: 'Platba' },
    { icon: User, label: 'Klient' },
  ]}
/>
```

**Soubory:**
- `src/components/layout/Sidebar.tsx` - collapsed default
- `src/components/layout/MobileNav.tsx` - větší touch targets
- `src/components/ui/radial-action-menu.tsx` (nový)

---

### 4. KARTY - Floating glass layers

**Problém:** Karty mají border a shadow, ale chybí depth.

**Řešení:**

```css
/* Současně */
.card {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

/* Nově - více vrstev */
.card-floating {
  background: linear-gradient(
    135deg,
    hsl(var(--card) / 0.8) 0%,
    hsl(var(--card) / 0.6) 100%
  );
  backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--border) / 0.3);
  box-shadow: 
    0 4px 24px -8px hsl(0 0% 0% / 0.4),
    inset 0 1px 0 hsl(255 255 255 / 0.05);
}
```

**Soubory:**
- `src/index.css` - nové card utility třídy
- `src/components/ui/card.tsx` - variant `floating`

---

### 5. SCHEDULE PAGE - Timeline view

**Problém:** Grid-based schedule, chybí flow.

**Řešení:** Vertical timeline s time indicators:

```
┌─────────────────────────────────────┐
│  ○ 08:00 ─────────────────────────  │
│                                      │
│  ● 09:00  ┌──────────────────────┐  │
│           │ 🏋️ Jan Novák         │  │
│           │ Solo trénink • 60min │  │
│           └──────────────────────┘  │
│                                      │
│  ○ 10:00 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ ← volný slot (dashed)
│                                      │
│  ● 11:00  ┌──────────────────────┐  │
│           │ 🏃 Eva Svobodová     │  │
│           └──────────────────────┘  │
└─────────────────────────────────────┘
```

**Features:**
- Current time indicator (červená čára)
- Swipe left/right pro dny
- Tap na volný slot = rychle přidat

**Soubory:**
- `src/pages/SchedulePage.tsx` - nový timeline layout
- `src/components/calendar/VerticalTimeline.tsx` (nový)

---

### 6. ANIMACE - Jemnější, purposeful

**Problém:** Některé animace jsou příliš výrazné.

**Řešení:**

```tsx
// Současně - příliš dramatické
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// Nově - subtilní
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
```

**Nové efekty:**
- Pulse glow pro live data
- Stagger animations pro seznamy
- Scale feedback pro touch

**Soubory:**
- `src/lib/animations.ts` (nový) - centrální animation presets

---

### 7. BAREVNÁ PALETA - Signální, ne dekorativní

**Problém:** Barvy jsou použity pro estetiku, ne pro signalizaci.

**Řešení (Whoop approach):**
```
✅ Zelená = Dobrý stav (recovery, zisk)
⚠️ Žlutá = Pozor (nízký kredit, blížící se deadline)
🔴 Červená = Akce nutná (dluh, neuhrazeno)
⚪ Šedá = Neutrální data
🔵 Modrá = Informativní (aktivní, probíhající)
```

**Aplikace:**
- Credit badge: Zelená >1000 Kč, Žlutá 0-1000, Červená <0
- Training status: Šedá=scheduled, Modrá=in_progress, Zelená=completed
- Odstranit dekorativní gradienty z datových komponent

---

### 8. EMPTY STATES - Více engaging

**Problém:** Prázdné stavy jsou nudné.

**Řešení:**
```tsx
<EmptyState 
  illustration="workout" // animovaná SVG ilustrace
  title="Žádné tréninky dnes"
  description="Přidejte první trénink a začněte sledovat pokrok"
  action={<Button>Přidat trénink</Button>}
/>
```

**Soubory:**
- `src/components/ui/empty-state.tsx` - vylepšit
- `src/assets/illustrations/` - nové minimalistické ilustrace

---

### 9. LOADING STATES - Skeleton s glow

**Problém:** Skeleton je statický, působí jako chyba.

**Řešení:**
```css
.skeleton-glow {
  background: linear-gradient(
    90deg,
    hsl(var(--muted) / 0.3) 0%,
    hsl(var(--muted) / 0.5) 50%,
    hsl(var(--muted) / 0.3) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

---

### 10. MICRO-INTERACTIONS

**A) Button press feedback:**
```tsx
whileTap={{ scale: 0.97 }}
transition={{ duration: 0.1 }}
```

**B) Success celebration:**
```tsx
// Po dokončení tréninku
<ConfettiExplosion colors={['#00d9ff', '#22c55e']} />
```

**C) Pull-to-refresh (mobile):**
```tsx
<PullToRefresh onRefresh={refetch}>
  <ContentList />
</PullToRefresh>
```

---

## Implementační fáze

### Fáze 1 - Foundation (1-2 dny)
1. Nové typography utility třídy
2. Vylepšené card varianty (floating)
3. Animation presets library
4. Skeleton glow

### Fáze 2 - Components (2-3 dny)
1. Activity Ring component
2. Gauge Meter component
3. Vertical Timeline
4. Radial Action Menu

### Fáze 3 - Integration (2-3 dny)
1. Dashboard - nové metric displays
2. Schedule - timeline view
3. Client cards - instrument metrics
4. Navigation - collapsed default

### Fáze 4 - Polish (1-2 dny)
1. Micro-interactions všude
2. Empty states ilustrace
3. Loading states
4. A/B testování

---

## Vizuální ukázka změn

### Dashboard PŘED:
```
┌─────────────────────────────────────┐
│ Tréninky: 847                       │
│ Klienti: 52                         │
│ Příjem: 450,000 Kč                  │
└─────────────────────────────────────┘
```

### Dashboard PO (Whoop/Apple style):
```
┌─────────────────────────────────────┐
│                                     │
│    ╭────╮  ╭────╮  ╭────╮          │
│   ( ⬤75%)( ⬤92%)( ⬤68%)          │
│    ╰────╯  ╰────╯  ╰────╯          │
│   Kapacita Recovery  Streak        │
│                                     │
│   847        52      450k          │
│  TRÉNINKŮ   KLIENTŮ   PŘÍJEM       │
│   +12%      +3        +8%          │
│                                     │
└─────────────────────────────────────┘
```

---

## Soubory k úpravě/vytvoření

| Soubor | Akce | Priorita |
|--------|------|----------|
| `src/index.css` | Nové utility třídy | Vysoká |
| `src/components/ui/activity-ring.tsx` | Nový | Vysoká |
| `src/components/ui/gauge-meter.tsx` | Nový | Vysoká |
| `src/components/ui/card.tsx` | Přidat floating variant | Vysoká |
| `src/lib/animations.ts` | Nový - animation presets | Vysoká |
| `src/components/layout/Sidebar.tsx` | Collapsed default | Střední |
| `src/components/calendar/VerticalTimeline.tsx` | Nový | Střední |
| `src/components/ui/radial-action-menu.tsx` | Nový | Nízká |
| `src/components/ui/empty-state.tsx` | Vylepšit | Nízká |

---

## Technické poznámky

- Všechny nové komponenty budou mít Framer Motion animace
- Activity Ring použije SVG `stroke-dasharray` pro progress
- Gauge Meter použije SVG arc path
- Vertical Timeline bude virtualizovaný pro performance
- Animace budou respektovat `prefers-reduced-motion`
