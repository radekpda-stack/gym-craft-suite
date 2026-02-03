
# Fáze 8: Grafické úpravy - Prodej (Premium) & Karta tréninku (Scheduled → Complete flow)

## Přehled

Tato fáze se zaměřuje na dvě klíčové oblasti:
1. **Sekce Prodej** - Premium upgrade všech komponent (Pokladna, Historie, Sklad)
2. **Karta tréninku** - Optimalizace flow od naplánovaného tréninku k dokončení

---

## ČÁST 1: PRODEJ - Premium Upgrade

### 1.1 SalesRegister - ProductCard Premium

**Soubor:** `src/components/sales/SalesRegister.tsx`

Aktuální: `glass hover:bg-secondary/50` karty produktů
Nové: Premium floating karty s instrument indicators

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ 📦 PRODUKT   │  │ 🔧 SLUŽBA    │  │ 💳 DOBITÍ   │              │
│  │              │  │              │  │              │              │
│  │ Protein Bar  │  │ Masáž 30min  │  │ Kredit 5000 │              │
│  │ ━━━━━━━━━    │  │              │  │              │              │
│  │ 12/20 ks     │  │              │  │ +5500 Kč    │              │
│  │              │  │              │  │              │              │
│  │   65 Kč      │  │   450 Kč     │  │  5000 Kč    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

Změny:
- ProductCard jako `.card-floating` s `backdrop-blur-md`
- Stock gauge jako horizontální progress bar
- "V košíku" badge s pulse animace
- Hover → lift effect (`-translate-y-0.5`, `shadow-md`)
- Typ produktu jako barevný accent border (primary/accent/warning)

---

### 1.2 CartPanel - Premium Checkout

**Soubor:** `src/components/sales/CartPanel.tsx`

Aktuální: `glass rounded-xl p-4`
Nové: Premium floating panel s animated summary

Změny:
- Panel jako `.card-floating` s výraznějším shadow
- Payment method jako pill-style selector (animated background)
- Checkout button s success glow (`shadow-lg shadow-success/25`)
- Cart items s subtle separátory a hover states
- Validace errors s refined red glow border

---

### 1.3 FavoriteProducts - Quick Pills

**Soubor:** `src/components/sales/FavoriteProducts.tsx`

Aktuální: `glass rounded-xl p-4` s flat button pills
Nové: Floating glass container s premium pills

Změny:
- Container jako `.card-floating`
- Pills s hover lift + subtle shadow
- In-cart state s animated ring
- Star icon s gradient fill

---

### 1.4 RecentSales - Timeline Cards

**Soubor:** `src/components/sales/RecentSales.tsx`

Aktuální: `glass rounded-xl p-4` s basic row items
Nové: Floating container s premium timeline items

Změny:
- Container jako `.card-floating`
- Row items s glass background + hover lift
- Refresh icon s rotation animation on hover
- Subtle time connector line (optional visual)

---

### 1.5 SalesHistory - Premium List Items

**Soubor:** `src/components/sales/SalesHistory.tsx`

Aktuální: `glass hover:bg-secondary/50` rows
Nové: Floating glass rows s premium interactions

Změny:
- Order rows jako floating mini-cards
- Payment icon s colored glow background
- Amount badge s tabular-nums font
- Date headers jako sticky frosted glass
- Search input s floating glass style

---

### 1.6 StockManagement - Inventory Dashboard

**Soubor:** `src/components/sales/StockManagement.tsx`

Aktuální: `glass rounded-xl` product cards
Nové: Instrument-style inventory cards

Změny:
- Product cards jako `.card-floating`
- Stock level jako horizontal gauge s gradient fill
- Low stock warning s animated pulse border
- Margin percentage jako subtle badge
- Archive/Active state s opacity transition

---

### 1.7 ProductSearchAndFilters - Glass Upgrade

**Soubor:** `src/components/sales/ProductSearchAndFilters.tsx`

Aktuální: Standard Input a Button chips
Nové: Floating glass search s premium filter pills

Změny:
- Search input s glass background + subtle glow on focus
- Category chips jako pill-tabs style
- Active state s animated indicator
- In-stock switch s refined styling

---

### 1.8 CartSummary - Instrument Summary

**Soubor:** `src/components/sales/CartSummary.tsx`

Aktuální: Standard separators a text
Nové: Premium glass summary s enhanced typography

Změny:
- Section backgrounds s subtle glass effect
- Discount badge s destructive glow
- Total jako prominent display s tabular-nums
- Credit balance s conditional color glow

---

## ČÁST 2: KARTA TRÉNINKU - Scheduled → Complete Flow

### 2.1 TrainingHeroHeader - Enhanced Status

**Soubor:** `src/components/trainings/TrainingHeroHeader.tsx`

Již upgradováno v Fázi 7, drobné vylepšení:
- Přidat subtle gradient border pro `scheduled` status
- Zesílit pulse efekt pro `in_progress`
- Avatar hover s glow ring effect

---

### 2.2 TrainingPrepSection - Alert Cards Premium

**Soubor:** `src/components/trainings/TrainingPrepSection.tsx`

Již upgradováno, vylepšení:
- Alert karty s barevným glow border (warning/destructive)
- Followup items s hover lift
- Previous training collapsible s smooth spring animation
- Pain points s body diagram highlight accent

---

### 2.3 QuickActionsSection - CTA Enhancement

**Soubor:** `src/components/trainings/QuickActionsSection.tsx`

Již má success button, vylepšení:
- DOKONČIT button s výraznější pulsující glow
- Secondary buttons s refined hover states
- Icon containers s subtle backgrounds
- Loading spinner s success color

---

### 2.4 CompleteTrainingDialog - Payment Pills Animation

**Soubor:** `src/components/trainings/CompleteTrainingDialog.tsx`

Již upgradováno, vylepšení:
- Participant cards s hover micro-interaction
- Payment summary s subtle glass border
- Total input s prominent styling
- Success header gradient zesílení

---

### 2.5 ParticipantPaymentCard - Refined Interactions

**Soubor:** `src/components/trainings/ParticipantPaymentCard.tsx`

Již má animated pills, vylepšení:
- Avatar s hover ring animation
- Credit balance transition animace
- Price input focus state s primary ring
- Debt state s red glow background

---

### 2.6 TrainingSummaryOverlay - Celebration Polish

**Soubor:** `src/components/trainings/TrainingSummaryOverlay.tsx`

Již premium, drobné vylepšení:
- Stat cards s numbered entrance animations (stagger)
- PR section s fire emoji glow
- XP badge s scale-in animace
- Streak counter s pulse na high values

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita - Prodej
| Soubor | Změna |
|--------|-------|
| `src/components/sales/SalesRegister.tsx` | ProductCard floating + stock gauge |
| `src/components/sales/CartPanel.tsx` | Premium panel + pill payments |
| `src/components/sales/SalesHistory.tsx` | Floating list items |
| `src/components/sales/StockManagement.tsx` | Inventory instrument cards |

### Střední priorita - Prodej
| Soubor | Změna |
|--------|-------|
| `src/components/sales/FavoriteProducts.tsx` | Premium pills |
| `src/components/sales/RecentSales.tsx` | Timeline upgrade |
| `src/components/sales/ProductSearchAndFilters.tsx` | Glass search + pills |
| `src/components/sales/CartSummary.tsx` | Instrument summary |

### Drobné vylepšení - Trénink
| Soubor | Změna |
|--------|-------|
| `src/components/trainings/TrainingHeroHeader.tsx` | Status gradient border |
| `src/components/trainings/TrainingPrepSection.tsx` | Alert glow borders |
| `src/components/trainings/QuickActionsSection.tsx` | CTA pulse enhancement |
| `src/components/trainings/ParticipantPaymentCard.tsx` | Micro-interactions |

---

## TECHNICKÉ DETAILY

### ProductCard Premium Styling
```tsx
<button
  className={cn(
    "relative overflow-hidden rounded-xl text-left transition-all duration-200",
    "bg-card/80 backdrop-blur-md border border-border/50 shadow-sm",
    "hover:shadow-md hover:-translate-y-0.5",
    inCart && "ring-2 ring-primary bg-primary/10",
    lowStock && "border-warning/50"
  )}
>
  {/* Stock gauge */}
  <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
    <div 
      className="h-full bg-gradient-to-r from-success to-success/50"
      style={{ width: `${(stock / maxStock) * 100}%` }}
    />
  </div>
</button>
```

### Payment Pills Animation (Framer Motion)
```tsx
<motion.div
  className="absolute inset-y-1 bg-primary rounded-lg"
  animate={{
    left: `calc(${activeIndex * (100 / 4)}% + 4px)`,
    width: `calc(${100 / 4}% - 8px)`,
  }}
  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
/>
```

### Cart Checkout Button
```tsx
<Button 
  className="w-full h-12 gap-2 bg-success hover:bg-success/90 
             text-success-foreground font-bold text-base
             shadow-lg shadow-success/25 transition-all"
  size="lg"
>
  <Check className="w-5 h-5" />
  Dokončit prodej
</Button>
```

### Glass Search Input
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input
    className={cn(
      "pl-9 pr-9 bg-card/60 backdrop-blur-sm border-border/50",
      "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
      "transition-all duration-200"
    )}
  />
</div>
```

---

## VIZUÁLNÍ SROVNÁNÍ

### Product Card PŘED:
```text
┌─────────────────┐
│ 📦 Produkt      │
│ Protein Bar     │
│                 │
│ 12 ks • 65 Kč   │
└─────────────────┘
```

### Product Card PO:
```text
╭─────────────────╮
│ 📦 PRODUKT      │  ← uppercase label
│                 │
│ Protein Bar     │
│ ━━━━━━━━━░░░░  │  ← stock gauge
│ 12/20 ks        │
│                 │
│ 65 Kč           │  ← prominent price
╰─────────────────╯
      ↑ glass blur + lift on hover
```

### Cart Panel PŘED:
```text
[Košík (3)]           [Vyčistit]
────────────────────────────────
• Protein Bar (2×)       130 Kč
• Voda                    30 Kč
────────────────────────────────
[Hotově][Kredit][Kartou][Převod]
────────────────────────────────
Celkem:                  160 Kč
[    Dokončit prodej    ]
```

### Cart Panel PO:
```text
╭─────────────────────────────────╮
│ 🛒 Košík (3)        [Vyčistit] │
├─────────────────────────────────┤
│ Protein Bar (2×)       130 Kč  │
│ Voda                    30 Kč  │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐│
│ │●Hotově│ Kredit│Karta│Přev. ││  ← animated pill
│ └─────────────────────────────┘│
├─────────────────────────────────┤
│ CELKEM          160 Kč         │
│ ┌─────────────────────────────┐│
│ │ ✓ DOKONČIT PRODEJ          ││  ← success glow
│ └─────────────────────────────┘│
╰─────────────────────────────────╯
```

---

## ANIMACE A INTERAKCE

1. **Hover Effects:**
   - Cards: `hover:-translate-y-0.5 hover:shadow-md`
   - Pills: spring animation `stiffness: 350, damping: 30`
   - Buttons: `active:scale-[0.98]`

2. **In-Cart Badge:**
   - Scale-in animation
   - Subtle pulse on add

3. **Low Stock Warning:**
   - Border pulse `ring-1 ring-warning/50 animate-pulse`

4. **Checkout Success:**
   - Button glow `shadow-lg shadow-success/25`
   - Loading spinner with success color

5. **Training Complete Flow:**
   - Dialog entrance: scale + fade
   - Payment method: spring indicator
   - Summary overlay: staggered card entrance
