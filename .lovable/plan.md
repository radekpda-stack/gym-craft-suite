
# Fáze 7: Grafické úpravy - Karta tréninku & Dialog dokončení

## Přehled prozkoumaných komponent

Analyzoval jsem kompletní "Training Cockpit" architekturu:
- **TrainingDetail.tsx** - hlavní stránka tréninku
- **TrainingHeroHeader.tsx** - hero header s klientem a meta údaji
- **TrainingDetailView.tsx** - orchestrátor 3-zónového layoutu
- **TrainingPrepSection.tsx** - příprava (upozornění, followups, předchozí trénink)
- **TrainingCloseSection.tsx** - uzavření (platba, poznámky, feedback)
- **CompleteTrainingDialog.tsx** - dialog pro dokončení tréninku
- **ParticipantPaymentCard.tsx** - karta účastníka s platbou
- **QuickActionsSection.tsx** - rychlé akce (dokončit, zrušit, přesunout)
- **CompactTagGridSelector.tsx** - klasifikace tréninku
- **TrainingSummaryOverlay.tsx** - oslavný overlay po dokončení

---

## Navržené změny

### 1. TRAINING HERO HEADER - Premium Floating Header

**Soubor:** `src/components/trainings/TrainingHeroHeader.tsx`

Současně: `training-section p-4` s basic styling
Nově: Premium floating header s glassmorphism

```text
┌─────────────────────────────────────────────────────────┐
│  ╭────────────────────────────────────────────────────╮ │
│  │   ╭───╮                                      ⋮     │ │
│  │   │ JN │  Jan Novák                                │ │
│  │   ╰───╯  📅 pondělí 3.2. • 09:00 • 60min • 🔁      │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │           ●  NAPLÁNOVÁNO                     │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  ╰────────────────────────────────────────────────────╯ │
└─────────────────────────────────────────────────────────┘
```

Změny:
- Header jako `.card-floating` s backdrop-blur
- Avatar s subtle ring/glow effect
- Status badge s pulse animace pro `in_progress`
- Meta ikonky menší (w-3.5) s jemnější barvou
- Hover efekt na celém headeru

---

### 2. TRAINING PREP SECTION - Premium Alerts

**Soubor:** `src/components/trainings/TrainingPrepSection.tsx`

Současně: `training-section` s basic alert backgrounds
Nově: Floating glass alerts s border glow

Změny:
- Container jako `.card-floating`
- Alert karty (upozornění, bolest) s `ring-1` border glow
- Followup items s subtle hover lift
- Previous training expandable s premium transition
- Ikony s colored glow backgrounds

---

### 3. TRAINING CLOSE SECTION - Instrument Panel

**Soubor:** `src/components/trainings/TrainingCloseSection.tsx`

Současně: `training-section p-4` s basic borders
Nově: Premium floating section s glass dividers

Změny:
- Section jako `.card-floating`
- Payment row s enhanced status badge
- Border dividers jako gradient lines místo solid
- Feedback section s subtle background gradient

---

### 4. COMPLETE TRAINING DIALOG - Premium Modal

**Soubor:** `src/components/trainings/CompleteTrainingDialog.tsx`

Současně: Standard DialogContent s `max-w-lg`
Nově: Premium floating dialog s enhanced visuals

```text
╭────────────────────────────────────────────────────────╮
│                                                         │
│  ✓ DOKONČIT TRÉNINK                                    │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ╭──╮  Jan Novák              ┌───────┐         │   │
│  │  │JN│  Kredit: 7,500→6,600    │ 900 Kč│         │   │
│  │  ╰──╯                         └───────┘         │   │
│  │  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐           │   │
│  │  │💳   ││💵   ││💳   ││🏦   ││⏰   │           │   │
│  │  │Kredit│Hotově│Kartou│Převo.│Později│           │   │
│  │  └─────┘└─────┘└─────┘└─────┘└─────┘           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💳 Z kreditu:           900 Kč (1 os.)        │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  CELKEM:                 ┌──────────┐          │   │
│  │                          │  900  Kč │          │   │
│  │                          └──────────┘          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📝 Poznámky (volitelné)                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Poznámky k tréninku...                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───────────┐  ┌───────────────────────────────────┐  │
│  │  Zrušit   │  │  ✓ DOKONČIT TRÉNINK               │  │
│  └───────────┘  └───────────────────────────────────┘  │
│                                                         │
╰────────────────────────────────────────────────────────╯
```

Změny:
- DialogContent jako `.card-floating` s enhanced shadow
- Header s success gradient background
- Participant cards s `.card-floating` style
- Payment method buttons jako pill design s animated selection
- Summary box s premium glass effect
- Complete button větší s success glow
- Loading state s enhanced spinner

---

### 5. PARTICIPANT PAYMENT CARD - Premium Tile

**Soubor:** `src/components/trainings/ParticipantPaymentCard.tsx`

Současně: `p-3 rounded-xl border bg-card`
Nově: Floating glass card s premium interactions

Změny:
- Card jako `.card-floating` s subtle shadow
- Avatar s ring na hover
- Credit line s color-coded gradient (success→warning→debt)
- Payment method buttons jako segmented pills s animated indicator
- Price input s premium styling
- Selected button s scale animation

---

### 6. QUICK ACTIONS SECTION - Premium Action Bar

**Soubor:** `src/components/trainings/QuickActionsSection.tsx`

Současně: `glass rounded-xl p-4`
Nově: Floating action panel s prominent CTA

Změny:
- Container jako `.card-floating`
- Primary button (DOKONČIT) s success glow effect
- Secondary buttons s refined hover states
- Loading states s enhanced animations
- Icon containers s subtle backgrounds

---

### 7. COMPACT TAG GRID SELECTOR - Instrument Style

**Soubor:** `src/components/trainings/CompactTagGridSelector.tsx`

Současně: Basic grid s dropdown selectors
Nově: Instrument-style tag panel

Změny:
- Container s subtle background
- Dropdowns s floating style
- Additional count badges s pulse effect
- RPE selector s enhanced visual feedback
- Validation warning s animated border

---

### 8. TRAINING SUMMARY OVERLAY - Enhanced Celebration

**Soubor:** `src/components/trainings/TrainingSummaryOverlay.tsx`

Současně: Already premium s motion animations
Nově: Enhanced glass effects a micro-animations

Změny:
- Modal container s deeper glass blur
- Stats grid cards jako `.card-floating`
- PR section s enhanced warning glow
- XP badge s subtle pulse animation
- Streak indicator s fire glow effect
- Enhanced confetti trigger timing

---

### 9. TRAINING DETAIL VIEW - Section Consistency

**Soubor:** `src/components/trainings/TrainingDetailView.tsx`

Současně: Multiple `training-section` elements
Nově: Consistent floating section styling

Změny:
- All sections s unified `.card-floating` base
- Edit mode form s premium border highlight
- Tags section s refined spacing
- Exercise manager container s enhanced shadow
- Consistent spacing mezi sekcemi (gap-4)

---

## CSS Aktualizace

**Soubor:** `src/index.css`

Přidat nové utility třídy:

```css
/* Training card specific */
.training-card-floating {
  @apply bg-card/80 backdrop-blur-md border border-border/50;
  @apply shadow-sm hover:shadow-md transition-all duration-200;
  @apply rounded-2xl;
}

/* Status badge with pulse */
.status-badge-pulse {
  @apply animate-pulse-subtle;
}

/* Payment button active state */
.payment-btn-active {
  @apply ring-2 ring-primary/50 ring-offset-1;
}

/* Credit gradient text */
.credit-positive { @apply text-success; }
.credit-warning { @apply text-warning; }
.credit-debt { @apply text-destructive; }
```

---

## Soubory k úpravě

| Soubor | Změna | Priorita |
|--------|-------|----------|
| `src/components/trainings/TrainingHeroHeader.tsx` | Premium floating header | Vysoká |
| `src/components/trainings/CompleteTrainingDialog.tsx` | Premium modal styling | Vysoká |
| `src/components/trainings/ParticipantPaymentCard.tsx` | Floating card + pill buttons | Vysoká |
| `src/components/trainings/QuickActionsSection.tsx` | Premium action bar | Vysoká |
| `src/components/trainings/TrainingPrepSection.tsx` | Floating glass alerts | Střední |
| `src/components/trainings/TrainingCloseSection.tsx` | Instrument panel | Střední |
| `src/components/trainings/CompactTagGridSelector.tsx` | Instrument style | Střední |
| `src/components/trainings/TrainingSummaryOverlay.tsx` | Enhanced celebration | Střední |
| `src/components/trainings/TrainingDetailView.tsx` | Section consistency | Nízká |
| `src/index.css` | Nové utility třídy | Nízká |

---

## Vizuální srovnání

### Complete Dialog PŘED:
```text
┌─────────────────────────────────────┐
│ Dokončit trénink                    │
│ ─────────────────────────────────── │
│ | JN | Jan Novák     | 900 Kč |    │
│ [Kredit][Hotově][Kartou][Bank][Pozd]│
└─────────────────────────────────────┘
```

### Complete Dialog PO:
```text
╭─────────────────────────────────────╮
│ ✓ DOKONČIT TRÉNINK                  │  ← success gradient
│ ═════════════════════════════════════│
│ ┌───────────────────────────────┐   │
│ │ ╭──╮ Jan Novák    ┌──────┐   │   │  ← floating card
│ │ │JN│ 7,500→6,600  │900 Kč│   │   │
│ │ ╰──╯              └──────┘   │   │
│ │ ╭─────╮╭─────╮╭─────╮╭─────╮│   │  ← pill buttons
│ │ │●Kred││Hotov││Karto││Přev ││   │
│ │ ╰─────╯╰─────╯╰─────╯╰─────╯│   │
│ └───────────────────────────────┘   │
╰─────────────────────────────────────╯
```

### Payment Card PŘED:
```text
| JN | Jan Novák | 900 Kč |
[Kredit][Hotově][Kartou][Bank][Později]
```

### Payment Card PO:
```text
╭─────────────────────────────────────╮
│ ╭──╮  Jan Novák           ┌──────┐ │
│ │JN│  Kredit: 7,500→6,600 │900 Kč│ │
│ ╰──╯                      └──────┘ │
│                                     │
│ ┌───────────────────────────────┐  │
│ │●Kredit│ Hotově│Kartou│Bank│Poz│  │  ← animated pill
│ └───────────────────────────────┘  │
╰─────────────────────────────────────╯
```

---

## Technické poznámky

1. **Payment Button Animation:**
   - Použít Framer Motion pro animated background indicator
   - Podobně jako PillTabs - background follows selection
   - WhileTap scale feedback

2. **Status Badge Pulse:**
   - `in_progress` status má subtle pulse animation
   - CSS animation s opacity 0.8 → 1.0 → 0.8

3. **Credit Balance Gradient:**
   - Pozitivní: text-success (zelená)
   - Nízký (< 1000): text-warning (žlutá)
   - Dluh: text-destructive (červená)

4. **Dialog Header Gradient:**
   - Success gradient: from-success/20 via-success/10 to-transparent
   - Ikona s glow effect

5. **Consistent Section Spacing:**
   - Gap mezi sekcemi: 16px (gap-4)
   - Vnitřní padding: 16px (p-4)
   - Border radius: 16px (rounded-2xl)
