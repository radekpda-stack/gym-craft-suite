
# Fáze 9: Grafické úpravy - Karta klienta (Premium Upgrade)

## Přehled prozkoumaných komponent

Analyzoval jsem kompletní architekturu karty klienta:

**Hlavní stránka:** `ClientDetail.tsx`
- **ClientHeaderCompact** - sticky header s avatarem, kontakty, badges
- **ClientHealthAlert** - varování o zdravotních omezeních
- **ClientSummaryStrip** - 4 KPI karty (kredit, tréninky měsíc, LTV, průměr)
- **ClientDetailTabs** - 8 záložek (Profil, Média, Tréninky, Finance, Výkon, Zdraví, Zprávy, Nastavení)

**Komponenty v záložkách:**
- **ClientProfileTab** - základní info, lifestyle, zdraví, cíle
- **ClientFinanceLedger** - finanční timeline s auditem
- **ClientPRsCard** - osobní rekordy
- **ClientTrainingLoadCard** - zátěž a RPE grafy
- **ClientFeedbackAnalysisSection** - analýza feedbacků
- **ClientAdminBlock** - nastavení a archivace
- **ClientNotesSection** - poznámky trenéra
- **ClientActionsSheet** - mobilní FAB s akcemi

---

## Navržené změny

### 1. CLIENT HEADER COMPACT - Premium Floating Header

**Soubor:** `src/components/clients/ClientHeaderCompact.tsx`

Aktuální: `glass rounded-2xl p-3 sm:p-4 sticky top-0`
Nové: Premium floating header s enhanced visuals

Změny:
- Header jako `.card-floating` s `backdrop-blur-lg`
- Avatar s hover ring/glow effect
- Contact icons s glass background containers
- Badge indicators (red flags, portal) s glow effects
- Expandable profile section s smooth spring animation
- Edit mode s premium input styling

```text
╭─────────────────────────────────────────────────────────────╮
│ ◀  ╭──╮  Jan Novák              🔴 ⚡ 📞 💬 ✉️  ⋮          │
│    │JN│  1985 (39 let) • Feedback ◉                        │
│    ╰──╯                                                     │
│    ──────────────────────────────────────────────────────── │
│    [ 🗓 Od 3.5.2023 ] [ ⏱ 18 měsíců ] [ 🔥 5d streak ]     │
╰─────────────────────────────────────────────────────────────╯
```

---

### 2. CLIENT SUMMARY STRIP - Instrument Dashboard

**Soubor:** `src/components/clients/ClientSummaryStrip.tsx`

Aktuální: `rounded-2xl p-3.5 border` základní karty
Nové: Premium floating instrument cards s gauges

Změny:
- Karty jako `.card-floating` s backdrop-blur
- Credit card s progress ring (% z běžné částky)
- Training count s mini sparkline trend
- LTV karta s gradient fill background
- Buttons s hover lift effects
- Color-coded borders podle stavu

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────┐│
│ │ 💳 KREDIT     │ │ 📅 TENTO MĚS. │ │ 📈 CELK.HODN. │ │ 📊 PRŮMĚR ││
│ │   ╭────╮      │ │               │ │               │ │           ││
│ │  ( 7500 )     │ │     12        │ │   125 450     │ │  8 750 Kč ││
│ │   ╰────╯      │ │   tréninků    │ │      Kč       │ │   /měsíc  ││
│ │ [+ Dobít]     │ │ [+ Trénink]   │ │ 48 tréninků   │ │ 14.3/měs  ││
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3. CLIENT HEALTH ALERT - Enhanced Warning Banner

**Soubor:** `src/components/clients/ClientHealthAlert.tsx`

Aktuální: `rounded-xl p-3 border` s flat colors
Nové: Premium alert s glow border a pulse

Změny:
- Card s animated glow border (warning/destructive)
- Icon container s colored background glow
- Pain area badges s hover tooltips
- Pulse animation pro high severity
- Gradient background subtle

---

### 4. CLIENT DETAIL TABS - Premium Tab Navigation

**Soubor:** `src/components/clients/ClientDetailTabs.tsx`

Aktuální: Standard TabsList s basic styling
Nové: Floating glass tabs s animated indicator

Změny:
- TabsList jako glass container s backdrop-blur
- Active tab s animated background pill (Framer Motion)
- Badge indicators s pulse pro urgent items
- Consistent icon sizing a spacing
- Smooth tab transition animations

---

### 5. CLIENT PROFILE TAB - Card Grid Upgrade

**Soubor:** `src/components/clients/ClientProfileTab.tsx`

Aktuální: `bg-card border border-border rounded-2xl`
Nové: Floating glass cards s instrument styling

Změny:
- All section cards jako `.card-floating`
- Field groups s subtle glass dividers
- Edit mode s premium input focus states
- Pre-diagnostic sync button s glow effect
- Training goals jako premium pill badges
- Consistent typography hierarchy

---

### 6. CLIENT FINANCE LEDGER - Premium Financial Dashboard

**Soubor:** `src/components/clients/ClientFinanceLedger.tsx`

Aktuální: Standard Card s basic rows
Nové: Floating instrument cards s enhanced timeline

Změny:
- Main card jako `.card-floating`
- Stats row jako mini instrument cards
- Audit banner s enhanced glow (success/error)
- Filter pills s animated selection
- Timeline rows s hover lift
- Month headers jako sticky frosted glass
- Export buttons s refined styling

---

### 7. CLIENT PRS CARD - Trophy Cabinet Style

**Soubor:** `src/components/clients/ClientPRsCard.tsx`

Aktuální: Standard Card s `bg-secondary/50` items
Nové: Premium trophy display s glow effects

Změny:
- Card jako `.card-floating`
- PR items jako mini floating cards
- Metric icons s colored glow backgrounds
- Trophy icon s warning glow
- Hover → sheet animation smooth
- Value badges s tabular-nums

---

### 8. CLIENT TRAINING LOAD CARD - Instrument Panel

**Soubor:** `src/components/clients/ClientTrainingLoadCard.tsx`

Aktuální: Standard Card s colored metric boxes
Nové: Premium instrument dashboard

Změny:
- Card jako `.card-floating`
- Metric boxes jako floating mini-cards
- RPE discrepancy alert s glow border
- Chart s premium tooltip styling
- Training type badges s refined styling

---

### 9. CLIENT FEEDBACK ANALYSIS SECTION - Premium Tabs

**Soubor:** `src/components/clients/ClientFeedbackAnalysisSection.tsx`

Aktuální: Card s Collapsible a standard Tabs
Nové: Floating card s premium tab navigation

Změny:
- Card jako `.card-floating`
- Collapsible header s enhanced hover state
- TabsList jako glass pills
- Stats badges (red flags, warnings) s glow
- Spring animation pro expand/collapse

---

### 10. CLIENT ADMIN BLOCK - Settings Panel

**Soubor:** `src/components/clients/ClientAdminBlock.tsx`

Aktuální: `glass rounded-xl` s basic collapsible
Nové: Floating settings panel s sections

Změny:
- Container jako `.card-floating`
- Section dividers jako gradient lines
- Action buttons s refined hover states
- Archive button s danger styling na hover

---

### 11. CLIENT NOTES SECTION - Timeline Cards

**Soubor:** `src/components/clients/ClientNotesSection.tsx`

Aktuální: `glass rounded-2xl` s flat note cards
Nové: Premium floating notes s timeline

Změny:
- Container jako `.card-floating`
- Note items s hover lift effect
- Add note input s glass styling
- Send button s success glow on focus
- Empty state s refined illustration

---

### 12. CLIENT ACTIONS SHEET - Premium Mobile FAB

**Soubor:** `src/components/clients/ClientActionsSheet.tsx`

Aktuální: Basic FAB s grid buttons
Nové: Premium floating action system

Změny:
- FAB s pulsing glow ring
- Action buttons jako floating tiles s hover lift
- Generated link display s success glass background
- Sheet content s rounded-t-3xl enhanced
- Primary action (Trénink) s prominent glow

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita
| Soubor | Změna |
|--------|-------|
| `src/components/clients/ClientHeaderCompact.tsx` | Premium floating header |
| `src/components/clients/ClientSummaryStrip.tsx` | Instrument KPI cards |
| `src/components/clients/ClientDetailTabs.tsx` | Animated tab navigation |
| `src/components/clients/ClientHealthAlert.tsx` | Glow alert banner |

### Střední priorita
| Soubor | Změna |
|--------|-------|
| `src/components/clients/ClientProfileTab.tsx` | Floating section cards |
| `src/components/clients/ClientFinanceLedger.tsx` | Premium ledger |
| `src/components/clients/ClientPRsCard.tsx` | Trophy cabinet style |
| `src/components/clients/ClientTrainingLoadCard.tsx` | Instrument panel |

### Nižší priorita
| Soubor | Změna |
|--------|-------|
| `src/components/clients/ClientFeedbackAnalysisSection.tsx` | Premium tabs |
| `src/components/clients/ClientAdminBlock.tsx` | Settings panel |
| `src/components/clients/ClientNotesSection.tsx` | Timeline cards |
| `src/components/clients/ClientActionsSheet.tsx` | Premium mobile FAB |

---

## TECHNICKÉ DETAILY

### Header Premium Styling
```tsx
<div className={cn(
  "rounded-2xl p-3 sm:p-4 sticky top-0 z-30",
  "bg-card/80 backdrop-blur-lg border border-border/50",
  "shadow-sm transition-all duration-200"
)}>
```

### Summary Card Floating
```tsx
<div className={cn(
  'rounded-2xl p-3.5 border backdrop-blur-sm transition-all duration-200',
  'bg-card/80 shadow-sm hover:shadow-md hover:-translate-y-0.5',
  getCreditBg() // color-coded border
)}>
```

### Tab Navigation Animation
```tsx
<TabsList className="relative bg-secondary/50 backdrop-blur-sm rounded-lg p-1">
  <motion.div
    className="absolute inset-y-1 bg-primary rounded-md"
    layoutId="activeTab"
    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
  />
  {tabs.map(tab => (
    <TabsTrigger className="relative z-10" ... />
  ))}
</TabsList>
```

### Health Alert Glow
```tsx
<div className={cn(
  'rounded-xl p-3 border transition-all',
  hasActivePain 
    ? 'bg-destructive/10 border-destructive/30 ring-1 ring-destructive/20 animate-pulse-subtle' 
    : 'bg-warning/10 border-warning/30'
)}>
```

### Finance Ledger Row
```tsx
<div className={cn(
  "flex items-center gap-3 p-3 rounded-xl transition-all",
  "bg-card/60 backdrop-blur-sm border border-border/30",
  "hover:bg-secondary/50 hover:-translate-y-0.5 hover:shadow-sm"
)}>
```

---

## VIZUÁLNÍ SROVNÁNÍ

### Client Header PŘED:
```text
┌──────────────────────────────────────┐
│ ◀ [JN] Jan Novák          📞 💬 ✉️  │
│      1985 (39 let)                   │
└──────────────────────────────────────┘
```

### Client Header PO:
```text
╭──────────────────────────────────────╮
│ ◀ ╭──╮ Jan Novák    🔴 ⚡ 📞💬✉️ ⋮ │  ← floating glass
│   │JN│ 1985 (39) • Feedback ◉       │
│   ╰──╯ ────────────────────────────  │
│  [🗓 Od 3.5.23][⏱ 18m][🔥 5d]       │  ← badge row
╰──────────────────────────────────────╯
      ↑ backdrop-blur + shadow
```

### Summary Strip PŘED:
```text
[Kredit: 7,500] [Měsíc: 12] [LTV: 125k] [Průměr: 8.7k]
```

### Summary Strip PO:
```text
╭───────────────────────────────────────────────────────────╮
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────┐│
│ │💳 KREDIT    │ │📅 MĚSÍC     │ │📈 CELKEM    │ │📊 AVG ││
│ │  ╭────╮     │ │    12       │ │  125 450    │ │ 8,750 ││
│ │ ( 7500 )    │ │  tréninků   │ │    Kč       │ │ Kč/m  ││
│ │  ╰────╯     │ │ [+Trénink]  │ │ 48× • 18m   │ │14.3/m ││
│ │ [+ Dobít]   │ │             │ │             │ │       ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └───────┘│
╰───────────────────────────────────────────────────────────╯
      ↑ each card floats with hover lift
```

---

## ANIMACE A INTERAKCE

1. **Header Interactions:**
   - Avatar: hover ring glow
   - Contact icons: scale + background on hover
   - Expand section: spring animation

2. **Summary Cards:**
   - Hover: `-translate-y-0.5`, `shadow-md`
   - Buttons: `active:scale-[0.98]`
   - Credit ring: subtle pulse při nízkém stavu

3. **Tab Navigation:**
   - Active indicator: spring `stiffness: 350, damping: 30`
   - Badge pulse pro unread/urgent
   - Tab content: fade-in transition

4. **Health Alert:**
   - High severity: `animate-pulse-subtle`
   - Icon: colored glow background
   - Pain badges: hover tooltip

5. **Mobile FAB:**
   - Idle: subtle shadow pulse
   - Press: `scale-[0.95]`
   - Sheet: spring slide-up

---

## KONZISTENCE S PŘEDCHOZÍMI FÁZEMI

Všechny změny následují zavedený design systém:
- `.card-floating` class pro glassmorphism cards
- `backdrop-blur-md/lg` pro depth
- `tabular-nums` pro číselné hodnoty
- Spring animations pro pill selektory
- Status-based color coding (success/warning/destructive)
- Hover lift effects (`-translate-y-0.5`, `shadow-md`)
- Premium typography hierarchy (uppercase labels, bold values)
