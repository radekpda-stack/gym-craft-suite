
# Fáze 5: Pokračování grafických úprav - Prodej, Klienti, Rozvrh, Karta klienta

## Shrnutí prohlédnutých souborů

Prozkoumal jsem tyto klíčové stránky a komponenty:
- `Sales.tsx` + `SalesRegister.tsx` - Pokladna a prodej
- `Clients.tsx` + `CompactClientRow.tsx` - Seznam klientů
- `SchedulePage.tsx` + `AgendaItem.tsx` - Rozvrh
- `ClientDetail.tsx` + `ClientSummaryStrip.tsx` + `ClientHeaderCompact.tsx` - Karta klienta
- `Settings.tsx` - Nastavení
- `ClientHealthDashboard.tsx` - Zdraví klientely

---

## Navržené změny

### 1. SALES PAGE - Premium Pokladna

**Soubor:** `src/pages/Sales.tsx`

Současně: Standard TabsList s bg-secondary/30
Nově: Floating glass tabs s aktivním indikátorem

```text
┌─────────────────────────────────────────────────────────┐
│  PRODEJ                                                 │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │💳       │ │📜       │ │📦       │ │📊       │       │
│  │Pokladna │ │Historie │ │ Sklad   │ │Statistiky│      │
│  └────●────┘ └─────────┘ └─────────┘ └─────────┘       │
│       ▔▔▔▔                                              │
└─────────────────────────────────────────────────────────┘
```

Změny:
- TabsList jako `.card-floating` s backdrop-blur
- Aktivní tab s animated underline
- Ikony větší (w-5 h-5) s barevným bg na aktivní

---

### 2. SALES REGISTER - Product Cards jako Instrumenty

**Soubor:** `src/components/sales/SalesRegister.tsx`

Současně: Product karty s `.glass` a hover scale
Nově: Instrument-style cards s progress na stock

Změny:
- ProductCard dostane `Card variant="instrument"`
- Stock indicator jako LinearGauge (plný/prázdný)
- Badge "v košíku" s pulse animací
- Oddělení typů produktů vizuálněji (ikony větší, barvy výraznější)
- Cart panel jako `.card-floating` s premium shadow

---

### 3. CLIENTS PAGE - Modernizovaný seznam

**Soubor:** `src/pages/Clients.tsx`

Současně: ViewMode tlačítka jako outline buttons
Nově: Pill tabs jako v Apple Music

```text
┌─────────────────────────────────────────────────────────┐
│  KLIENTI                          52 z 58    [+] [⋯]   │
│                                                         │
│  ┌───────────────────────────────────────────┐          │
│  │ (Dnes) (Tento týden) (●Všichni) (Archiv)  │          │
│  └───────────────────────────────────────────┘          │
│                                                         │
│  🔍 ___________________________  [🏷️ Štítek ▼]          │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ JN │ Jan Novák           ★ │ 7,500 Kč  │ Dnes 9:00 │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ ES │ Eva Svobodová          │ 3,200 Kč  │ Zítra    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Změny:
- ViewMode jako `ToggleGroup` s pill design
- Search bar s floating glass effect
- Filter badges kompaktnější (chip design)

---

### 4. COMPACT CLIENT ROW - Premium list item

**Soubor:** `src/components/clients/CompactClientRow.tsx`

Současně: Flat card s hover bg-accent/50
Nově: Glass row s subtle lift on hover

Změny:
- Row jako `.card-floating` s menším padding
- Avatar s subtle ring na hover
- Credit badge integrovaný do row (ne jako overlay)
- Swipe hints s lepším vizuálem (gradient místo solid)
- Hover → subtle shadow + y:-1px lift

---

### 5. SCHEDULE PAGE - Timeline vylepšení

**Soubor:** `src/pages/SchedulePage.tsx`

Současně: Week grid s tečkami jako indikátory
Nově: Week jako horizontal scroll s premium day cards

```text
┌─────────────────────────────────────────────────────────┐
│  ROZVRH                         [+ Přidat] [🏋️ Režim]  │
│  ◀  3. - 9. února 2025  ▶       [Dnes] [📅]            │
│                                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │ Po │ │ Út │ │ St │ │●Čt│ │ Pá │ │ So │ │ Ne │     │
│  │ 3  │ │ 4  │ │ 5  │ │ 6 │ │ 7  │ │ 8  │ │ 9  │     │
│  │ 3× │ │ 5× │ │ 2× │ │ 4×│ │ — │ │ 1× │ │ — │     │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │
│         ▔▔▔▔                                            │
└─────────────────────────────────────────────────────────┘
```

Změny:
- Week days jako horizontální scroll s snap
- Selected day s premium ring + shadow
- Count badge integrovaný do karty (ne jako overlay)
- Current time indicator viditelný i v week view

---

### 6. AGENDA ITEM - Training Card Premium

**Soubor:** `src/components/calendar/AgendaItem.tsx`

Současně: glass-subtle rounded-xl s time column
Nově: Instrument card s jasným statusem

Změny:
- Card jako `variant="floating"` pro lepší depth
- Status badge větší a výraznější
- Time column s mono-space font pro alignment
- Action buttons s touchFeedback animací
- Swipe backgrounds s gradient (fade out)

---

### 7. CLIENT DETAIL - Summary Strip jako Instrumenty

**Soubor:** `src/components/clients/ClientSummaryStrip.tsx`

Současně: Grid 2x2/4 s rounded-xl kartami
Nově: Instrument cards s micro-gauges

Změny:
- Credit card s ActivityRing pro vizuální indikátor stavu
- Trainings card s mini-trend sparkline
- LTV card s LinearGauge
- Avg/month card s comparison bar

---

### 8. CLIENT HEADER - Glassmorphism upgrade

**Soubor:** `src/components/clients/ClientHeaderCompact.tsx`

Současně: `.glass rounded-2xl` s p-3
Nově: Premium floating header s depth

Změny:
- Header jako `.card-floating` s více vrstev
- Avatar s subtle glow ring
- Contact icons s hover lift effect
- Expand/collapse animace jemnější
- Badges (streak, days since) s premium styling

---

### 9. CLIENT HEALTH DASHBOARD - Visual upgrade

**Soubor:** `src/components/statistics/ClientHealthDashboard.tsx`

Současně: Grid 3x1 s StatCell
Nově: Instrument dashboard s rings

Změny:
- Aktivní klienti jako ActivityRing
- Retence jako GaugeMeter
- LTV jako MetricCard s progress bar
- At-risk klienti s pulse border effect

---

### 10. SETTINGS PAGE - Category Cards

**Soubor:** `src/pages/Settings.tsx`

Současně: SettingsLayout s category list
Nově: Category cards jako floating tiles

Změny:
- Category cards jako `.card-floating`
- Active category s primary ring
- Icons s colored background (matching iconColor)
- Hover → lift effect + shadow

---

## Nové utility komponenty

### A) PillTabs - Apple-style segmented control

```tsx
<PillTabs value={viewMode} onValueChange={setViewMode}>
  <PillTab value="today">Dnes</PillTab>
  <PillTab value="week">Týden</PillTab>
  <PillTab value="all">Vše</PillTab>
</PillTabs>
```

### B) StatInstrument - Kombinace stat + visual

```tsx
<StatInstrument
  label="Kredit"
  value={7500}
  format="currency"
  indicator="ring" // ring | gauge | bar | sparkline
  progress={75}
  variant="success"
/>
```

---

## Soubory k úpravě

| Soubor | Změna | Priorita |
|--------|-------|----------|
| `src/pages/Sales.tsx` | Premium tabs | Vysoká |
| `src/components/sales/SalesRegister.tsx` | Instrument product cards | Vysoká |
| `src/pages/Clients.tsx` | Pill tabs, glass search | Vysoká |
| `src/components/clients/CompactClientRow.tsx` | Premium row styling | Vysoká |
| `src/pages/SchedulePage.tsx` | Week cards upgrade | Střední |
| `src/components/calendar/AgendaItem.tsx` | Floating training card | Střední |
| `src/components/clients/ClientSummaryStrip.tsx` | Instrument cards | Střední |
| `src/components/clients/ClientHeaderCompact.tsx` | Glassmorphism upgrade | Střední |
| `src/components/statistics/ClientHealthDashboard.tsx` | Visual instruments | Nízká |
| `src/pages/Settings.tsx` | Category floating cards | Nízká |

---

## Nové soubory

| Soubor | Popis |
|--------|-------|
| `src/components/ui/pill-tabs.tsx` | Apple-style segmented control |
| `src/components/ui/stat-instrument.tsx` | Combined stat + visual indicator |

---

## Vizuální srovnání

### Sales PŘED:
```text
[Pokladna] [Historie] [Sklad] [Statistiky]
```

### Sales PO:
```text
┌───────────────────────────────────────────┐
│ 💳 Pokladna │ Historie │ Sklad │ Stats   │
│ ────●────                                 │
└───────────────────────────────────────────┘
```

### Client Row PŘED:
```text
| JN | Jan Novák          | 7,500 Kč | Dnes |
```

### Client Row PO:
```text
┌─────────────────────────────────────────────┐
│ ╭──╮  Jan Novák        ★    ┌──────┐ Dnes │
│ │JN│                        │7,500 │ 9:00 │
│ ╰──╯  🏷️ OCR               └──────┘      │
└─────────────────────────────────────────────┘
```

---

## Technické poznámky

1. **PillTabs komponenta:**
   - Použije Framer Motion pro animated indicator
   - Background slider follows active tab
   - Supports keyboard navigation

2. **StatInstrument:**
   - Kombinuje MetricCard logiku s ActivityRing/GaugeMeter
   - Automaticky vybere vhodný vizuál podle `indicator` prop
   - Responsive sizing (menší na mobile)

3. **Product Cards v SalesRegister:**
   - Stock indicator jako LinearGauge
   - Animovaná "přidáno do košíku" badge
   - Quick add (double tap) support

4. **ClientRow improvements:**
   - Swipe backgrounds s gradient fade
   - Touch feedback na celý row
   - Prefetch detail na hover (již funguje)
