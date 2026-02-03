
# Fáze 12: Premium Upgrade - Stránka Prodej (Sales)

## Analýza aktuálního stavu

Po důkladné analýze jsem identifikoval tyto oblasti pro vylepšení:

### Aktuální struktura stránky Prodej
```text
┌─────────────────────────────────────────────────────────────┐
│ PRODEJ                                                      │
│ Pokladna, správa skladu a statistiky                       │
├─────────────────────────────────────────────────────────────┤
│ [Pokladna] [Historie] [Sklad] [Statistiky]                  │
├─────────────────────────────────────────────────────────────┤
│ POKLADNA:                                                   │
│  - Klient selection                                         │
│  - Recent Sales                                             │
│  - Favorite Products                                        │
│  - Product Search + Filters                                 │
│  - Product Grid (Services / Products / Credit Topups)       │
│  |                              |  Cart Panel (sticky)     │
├─────────────────────────────────────────────────────────────┤
│ HISTORIE:                                                   │
│  - Search bar                                               │
│  - Orders grouped by date                                   │
├─────────────────────────────────────────────────────────────┤
│ SKLAD:                                                      │
│  - Low stock banner                                         │
│  - Search + Filters bar                                     │
│  - Actions bar (margin toggle, import, add)                 │
│  - Products accordion                                       │
├─────────────────────────────────────────────────────────────┤
│ STATISTIKY:                                                 │
│  - Period selector                                          │
│  - KPI cards (4x)                                           │
│  - Revenue chart                                            │
│  - Top products bar chart                                   │
│  - Payment methods pie chart                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Identifikované problémy

### 1. Hlavní stránka (Sales.tsx)
- **Header** - příliš jednoduchý, chybí hero efekt s ikonou a statistikami
- **Tabs** - mají už glass styl, ale chybí animovaný indikátor

### 2. Pokladna (SalesRegister.tsx)
- **Client selection card** - standardní, mohla by mít výraznější credit display
- **Favorite Products** - kompaktní chips, mohly by být premium karty
- **Recent Sales** - dobré, ale chybí vizuální oddělení
- **Product Grid** - karty už mají glass styl, ale grid layout by mohl být hustší
- **Cart Panel** - už má premium styl, ale checkout button by mohl mít výraznější glow

### 3. Historie (SalesHistory.tsx)
- **Date headers** - jednoduché, mohly by mít výraznější sticky efekt
- **Order cards** - už mají glass styl, ale mohly by mít lepší vizuální hierarchii

### 4. Sklad (StockManagement.tsx)
- **Actions bar** - roztříštěné, mohlo by být v jednom premium panelu
- **Product cards** - uniformní, chybí vizuální hierarchie (low stock, most sold)
- **Filters** - fungují, ale mohly by být více integrované

### 5. Statistiky (SalesStatistics.tsx)
- **KPI cards** - už mají premium styl, ale mohly by mít lepší vizuální propojení
- **Charts** - standardní, mohly by mít premium tooltips a legend

---

## Navržené řešení

### ČÁST A: HLAVNÍ STRÁNKA - Hero Header

#### A1. Premium Hero Section
```text
╭───────────────────────────────────────────────────────────────────╮
│                                                                   │
│   ┌────────┐                                                      │
│   │  💰    │  PRODEJ                                              │
│   │  glow  │  Pokladna, sklad a statistiky na jednom místě       │
│   └────────┘                                                      │
│                                                                   │
│   [📊 Tržby dnes: 5,250 Kč]  [📦 Low stock: 3]  [🛒 Prodejů: 8]  │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `Sales.tsx`:
- Premium hero section s gradient background a icon glow
- Mini KPI chips zobrazující dnešní tržby, počet prodejů, low stock items
- Animovaný tab indikátor

---

### ČÁST B: POKLADNA - Enhanced Register

#### B1. Client Selection - Premium Card
```text
╭───────────────────────────────────────────────────────────────────╮
│ 👤 KLIENT                                     [Bez klienta]      │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Vyhledat klienta...                                      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ VYBRANÝ: Jan Novák                                               │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 💰 Kredit: 2,500 Kč                      ━━━━━━━━━━━━ 85%  │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Premium header s icon glow
- Credit balance jako progress bar (ukazuje % využití)
- Shared budget group name s ikonou
- Low credit warning glow

---

#### B2. Quick Actions Panel
```text
╭───────────────────────────────────────────────────────────────────╮
│ ⚡ RYCHLÉ AKCE                                                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 🕐 POSLEDNÍ PRODEJE                                              │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ Jan Novák • 450 Kč • Protein bar (2×), Ionto   🔄         │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ⭐ TOP PRODUKTY                                                   │
│ ╭──────────╮ ╭──────────╮ ╭──────────╮ ╭──────────╮             │
│ │ Protein  │ │ Ionto    │ │ BCAAs    │ │ Energy   │             │
│ │ 65 Kč    │ │ 45 Kč    │ │ 55 Kč    │ │ 35 Kč    │             │
│ ╰──────────╯ ╰──────────╯ ╰──────────╯ ╰──────────╯             │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Sloučit Recent Sales a Favorite Products do jednoho "Quick Actions" panelu
- Recent sales jako kompaktní karty s hover efektem
- Top products jako mini floating tiles

---

#### B3. Product Grid - Enhanced Cards
```text
╭───────────────────────────────────────────────────────────────────╮
│ 📦 PRODUKTY A SLUŽBY                              [🔧 Řazení]    │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Vyhledat produkt...                                      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ [Vše] [Doplňky] [Nápoje] [Svačiny] [Služby]    ○ Jen skladem    │
│                                                                   │
│ ─── 🔧 SLUŽBY (4) ────────────────────────────────────────────   │
│ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ │
│ │ 🔧 Služba   │ │ 🔧 Služba   │ │ 🔧 Služba   │ │ 🔧 Služba   │ │
│ │             │ │             │ │             │ │             │ │
│ │ Masáž      │ │ Měření      │ │ Konzultace │ │ Diagnostika │ │
│ │ 500 Kč     │ │ 300 Kč     │ │ 200 Kč     │ │ 400 Kč     │ │
│ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ │
│                                                                   │
│ ─── 📦 PRODUKTY (12) ─────────────────────────────────────────   │
│ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ ╭─────────────╮ │
│ │ ━━━━━━━━━━━ │ │ ━━━━━━━━    │ │ ━━━━━       │ │ ━━━ ⚠️      │ │
│ │ 📦 Produkt  │ │ 📦 Produkt  │ │ 📦 Produkt  │ │ 📦 Produkt  │ │
│ │             │ │             │ │             │ │             │ │
│ │ Protein    │ │ BCAA       │ │ Ionto      │ │ Energy bar │ │
│ │ 65 Kč      │ │ 55 Kč      │ │ 45 Kč      │ │ 35 Kč      │ │
│ │ 24 ks      │ │ 18 ks      │ │ 12 ks      │ │ 3 ks ⚠️    │ │
│ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ ╰─────────────╯ │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Section dividers s ikonou a počtem
- Product cards s stock gauge na vrcholu (barevný gradient)
- Low stock cards s warning border glow
- In-cart cards s primary ring + quantity badge

---

#### B4. Cart Panel - Premium Checkout
```text
╭───────────────────────────────────────────────────────────────────╮
│ 🛒 KOŠÍK (3)                                    [🗑️ Vyčistit]   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Protein bar          2×      65 Kč      130 Kč     [-][+]  │  │
│ │ ─────────────────────────────────────────────────────────── │  │
│ │ BCAA Shot            1×      55 Kč       55 Kč     [-][+]  │  │
│ │ ─────────────────────────────────────────────────────────── │  │
│ │ Masáž 30min          1×     500 Kč      500 Kč     [-][+]  │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ─────────────────────────────────────────────────────────────────│
│ ZPŮSOB PLATBY                                                    │
│ ╭────────────────────────────────────────────────────────────╮   │
│ │ [💵 Cash] [💰 Kredit] [💳 Karta] [🏦 Převod]              │   │
│ │  ▓▓▓▓▓▓▓                                                   │   │
│ │  animated pill                                             │   │
│ ╰────────────────────────────────────────────────────────────╯   │
│                                                                   │
│ ─────────────────────────────────────────────────────────────────│
│ Mezisoučet:                                         685 Kč      │
│ Sleva:                                              -50 Kč      │
│ ─────────────────────────────────────────────────────────────────│
│ CELKEM:                                             635 Kč      │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │            ✅ DOKONČIT PRODEJ                              │  │
│ │            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                           │  │
│ │            success glow effect                              │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Premium cart items s glass background
- Payment method pills s animated indicator (už existuje)
- Total s prominent styling
- Checkout button s výrazným success glow efektem

---

### ČÁST C: HISTORIE - Enhanced Timeline

#### C1. Premium Order Cards
```text
╭───────────────────────────────────────────────────────────────────╮
│ 🔍 Hledat dle klienta, data, částky...                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ═══════════════════════════════════════════════════════════════  │
│ ┃ 📅 PÁTEK 31. LEDNA 2025                            3 prodeje ┃ │
│ ═══════════════════════════════════════════════════════════════  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 💵  Jan Novák           [Cash]      14:32      685 Kč  →  │  │
│ │     Protein bar (2×), Masáž                                │  │
│ │     ─────────────────────────────────────────────────────  │  │
│ │     -50 Kč sleva  •  +25 XP                                │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 💰  Marie Nová          [Kredit]    12:15      120 Kč  →  │  │
│ │     Energy bar (2×), BCAA Shot                             │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Date headers jako premium glass dividers s počtem prodejů
- Order cards s výraznějším payment method icon
- Discount a XP info jako inline badges
- Items preview s lepším formátováním

---

### ČÁST D: SKLAD - Premium Management

#### D1. Enhanced Low Stock Banner
```text
╭───────────────────────────────────────────────────────────────────╮
│ ⚠️ NÍZKÝ STAV ZÁSOB                              [👁️ Zobrazit] ▼│
│ ─────────────────────────────────────────────────────────────────│
│ 3 položky pod minimální hranicí                                  │
├───────────────────────────────────────────────────────────────────┤
│ ╭───────────────────╮ ╭───────────────────╮ ╭───────────────────╮│
│ │ Energy bar        │ │ BCAA Shot         │ │ Protein mix       ││
│ │ 3 ks ← 5 min     │ │ 2 ks ← 5 min     │ │ 4 ks ← 10 min    ││
│ │ ━━━ ⚠️            │ │ ━━ ⚠️             │ │ ━━━━ ⚠️           ││
│ ╰───────────────────╯ ╰───────────────────╯ ╰───────────────────╯│
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Premium warning banner s glass background
- Collapsible detail s mini product cards
- Stock gauges s gradient fill
- "Objednat" quick action

---

#### D2. Premium Filters & Actions Bar
```text
╭───────────────────────────────────────────────────────────────────╮
│ 📦 42 POLOŽEK                                                     │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Hledat produkt...                                        │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ [Vše] [Nízký stav ⚠️] [Aktivní] [Archivované]                    │
│                                                                   │
│ Typ: [▼ Vše]   Řazení: [▼ Název A-Z]                            │
│                                                                   │
│ [👁️ Marže]   [📥 Příjem]   [📄 Import]   [+ Přidat]              │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Unified glass filter panel
- Filter chips s badge počty
- Actions jako floating buttons
- Responsive layout

---

#### D3. Premium Product Cards
```text
╭───────────────────────────────────────────────────────────────────╮
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 85% stock       │
├───────────────────────────────────────────────────────────────────┤
│ 📦 PRODUKT                                           [✏️ Edit]  │
│                                                                   │
│ Protein Bar - Chocolate                                          │
│ ───────────────────────────────────────────────────────────────  │
│                                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 💰 65 Kč    │ │ 📊 45 Kč   │ │ 📈 31%      │ │ 📦 24 ks    │ │
│ │ Prodejní   │ │ Nákupní    │ │ Marže       │ │ Skladem     │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                   │
│ Kategorie: Svačina  •  Min. cena: 55 Kč  •  XP: +5              │
│                                                           [👁️‍🗨️] │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Stock gauge jako horní bar (gradient dle stavu)
- 4-column mini KPI grid
- Margin visualization (ukázat jen pokud toggle zapnut)
- Archive toggle as eye icon

---

### ČÁST E: STATISTIKY - Enhanced Charts

#### E1. Premium KPI Dashboard
```text
╭───────────────────────────────────────────────────────────────────╮
│ 📅 Období: [▼ Tento měsíc]                                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ╭───────────────╮ ╭───────────────╮ ╭───────────────╮ ╭──────────╮
│ │ 📈 TRŽBY      │ │ 📊 NÁKLADY    │ │ 💰 ZISK       │ │ 🛒 PRODEJŮ│
│ │               │ │               │ │               │ │          │
│ │   45,250 Kč   │ │   12,800 Kč   │ │   32,450 Kč   │ │    87    │
│ │   ▲ +12%      │ │   ▼ -5%       │ │   ▲ +18%      │ │   ▲ +8%  │
│ │   vs minulý   │ │   vs minulý   │ │   vs minulý   │ │   vs min │
│ ╰───────────────╯ ╰───────────────╯ ╰───────────────╯ ╰──────────╯
│                                                                   │
│ ─────────────────────────────────────────────────────────────────│
│ 📊 INSIGHTS                                                      │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 💡 Nejprodávanější: Protein Bar (+23% vs minulý měsíc)     │  │
│ │ 📈 Peak: Pondělí 12:00-14:00 (32% všech prodejů)           │  │
│ │ ⚠️ Low margin: BCAA Shot (pouze 15% marže)                 │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- KPI cards spojené vizuálně (glass container)
- Comparison badges s trend arrows
- Insights sekce s actionable info

---

#### E2. Premium Charts
```text
╭───────────────────────────────────────────────────────────────────╮
│ 📊 VÝVOJ TRŽEB                                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│     ╭──────────────────────────────────────────────────────────╮ │
│  Kč │░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░│ │
│     │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│     │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│     ╰──────────────────────────────────────────────────────────╯ │
│       Po   Út   St   Čt   Pá   So   Ne                          │
│                                                                   │
│ ─────────────────────────────────────────────────────────────────│
│ 💰 Tržby: 45,250 Kč  📊 Náklady: 12,800 Kč  📈 Zisk: 32,450 Kč  │
╰───────────────────────────────────────────────────────────────────╯
```

Změny:
- Premium tooltips s glass background
- Enhanced gradient fills
- Summary row pod grafem
- Interactive legend

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita
| Soubor | Změny |
|--------|-------|
| `src/pages/Sales.tsx` | Hero header, mini KPI chips, animated tabs |
| `src/components/sales/SalesRegister.tsx` | Premium client card, product grid sections |
| `src/components/sales/CartPanel.tsx` | Enhanced checkout button glow, cart styling |

### Střední priorita
| Soubor | Změny |
|--------|-------|
| `src/components/sales/FavoriteProducts.tsx` | Merge into Quick Actions, enhanced tiles |
| `src/components/sales/RecentSales.tsx` | Merge into Quick Actions, compact cards |
| `src/components/sales/SalesHistory.tsx` | Premium date headers, order card styling |
| `src/components/sales/StockManagement.tsx` | Enhanced banner, unified filters, product cards |

### Nižší priorita
| Soubor | Změny |
|--------|-------|
| `src/components/sales/SalesStatistics.tsx` | KPI container styling, insights section |
| `src/components/sales/LowStockBanner.tsx` | Premium glass banner, mini product cards |
| `src/components/sales/ProductSearchAndFilters.tsx` | Glass input, enhanced category chips |

---

## TECHNICKÉ DETAILY

### Hero Header (Sales.tsx)
```tsx
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 mb-6">
  {/* Background glow */}
  <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
  
  <div className="relative flex items-start gap-4">
    {/* Icon with glow */}
    <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-sm shadow-lg shadow-primary/20">
      <ShoppingCart className="w-8 h-8 text-primary" />
    </div>
    
    <div className="flex-1">
      <h1 className="text-2xl font-bold">Prodej</h1>
      <p className="text-muted-foreground text-sm">
        Pokladna, sklad a statistiky na jednom místě
      </p>
      
      {/* Mini KPI chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        <Badge variant="outline" className="gap-1 bg-card/60 backdrop-blur-sm">
          <TrendingUp className="w-3 h-3 text-success" />
          Dnes: {formatCurrency(todayRevenue)}
        </Badge>
        <Badge variant="outline" className="gap-1 bg-card/60 backdrop-blur-sm">
          <ShoppingCart className="w-3 h-3" />
          {todaySales} prodejů
        </Badge>
        {lowStockCount > 0 && (
          <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30">
            <AlertTriangle className="w-3 h-3" />
            {lowStockCount} low stock
          </Badge>
        )}
      </div>
    </div>
  </div>
</div>
```

### Client Card Enhancement
```tsx
<div className="card-floating rounded-xl p-4">
  <div className="flex items-center justify-between mb-3">
    <Label className="flex items-center gap-2 text-sm font-semibold">
      <div className="p-1.5 rounded-lg bg-primary/10 shadow-sm shadow-primary/20">
        <User className="w-4 h-4 text-primary" />
      </div>
      Klient
    </Label>
    <Button variant={noClient ? "default" : "outline"} size="sm" onClick={handleNoClientToggle}>
      {noClient ? <Check className="w-4 h-4 mr-1" /> : null}
      Bez klienta
    </Button>
  </div>
  
  {selectedClientData && (
    <div className="mt-3 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{selectedClientData.name}</span>
        {sharedBudget?.isShared && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="w-3 h-3" />
            {sharedBudget.groupName}
          </Badge>
        )}
      </div>
      
      {/* Credit as progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Kredit</span>
          <span className={cn(
            "font-bold tabular-nums",
            effectiveBalance < 0 ? "text-destructive" : 
            effectiveBalance < 500 ? "text-warning" : "text-success"
          )}>
            {formatCurrency(effectiveBalance)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              effectiveBalance < 0 ? "bg-destructive" :
              effectiveBalance < 500 ? "bg-warning" : "bg-success"
            )}
            style={{ width: `${Math.min(100, Math.max(0, effectiveBalance / 50))}%` }}
          />
        </div>
      </div>
    </div>
  )}
</div>
```

### Checkout Button Enhancement
```tsx
<Button 
  onClick={onSale} 
  disabled={checkoutDisabled} 
  className={cn(
    "w-full h-12 text-sm gap-2 font-bold",
    "bg-success hover:bg-success/90 text-success-foreground",
    "shadow-lg shadow-success/30",
    "hover:shadow-xl hover:shadow-success/40",
    "active:scale-[0.98]",
    "transition-all duration-200",
    // Pulse animation when ready
    !checkoutDisabled && "animate-pulse-subtle"
  )}
  size="lg"
>
  {isProcessing ? (
    <Loader2 className="w-5 h-5 animate-spin" />
  ) : (
    <Check className="w-5 h-5" />
  )}
  {isProcessing ? 'Zpracovávám...' : 'Dokončit prodej'}
</Button>
```

### Product Section Divider
```tsx
<div className="flex items-center gap-3 mb-3">
  <div className="p-1.5 rounded-lg bg-primary/10">
    <Package className="w-4 h-4 text-primary" />
  </div>
  <span className="text-sm font-semibold">Produkty</span>
  <span className="text-xs text-muted-foreground">({count})</span>
  <div className="flex-1 h-px bg-border/50" />
</div>
```

### Stock Management Product Card
```tsx
<div className={cn(
  "relative overflow-hidden rounded-xl",
  "bg-card/80 backdrop-blur-md border shadow-sm",
  "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
  isLowStock && "border-warning/50",
  !product.is_active && "opacity-50"
)}>
  {/* Stock gauge bar */}
  <div className="h-1.5 bg-secondary/30">
    <div 
      className={cn(
        "h-full transition-all duration-500",
        stockPercent < 25 ? "bg-gradient-to-r from-destructive to-destructive/50" :
        stockPercent < 50 ? "bg-gradient-to-r from-warning to-warning/50" :
        "bg-gradient-to-r from-success to-success/50"
      )}
      style={{ width: `${stockPercent}%` }}
    />
  </div>
  
  <div className="p-4">
    {/* Product content */}
  </div>
</div>
```

---

## VIZUÁLNÍ SROVNÁNÍ

### PŘED (Pokladna):
```text
┌───────────────────────────────────────┐
│ Prodej                                │
│ Pokladna, správa skladu...           │
├───────────────────────────────────────┤
│ [Pokladna] [Historie] [Sklad] [Stats] │
├───────────────────────────────────────┤
│ Klient: [dropdown]       [Bez klient] │
│ Kredit: 2,500 Kč                      │
│ ─────────────────────────────────────│
│ Recent: [sale1] [sale2] [sale3]       │
│ Top: [prod1] [prod2] [prod3]          │
│ ─────────────────────────────────────│
│ Produkty: [search...]                 │
│ [grid of products]                    │
└───────────────────────────────────────┘
```

### PO (Pokladna):
```text
╭───────────────────────────────────────╮
│ ┌────┐  PRODEJ                        │
│ │ 💰 │  Pokladna, sklad a statistiky │
│ └────┘  [📈 5,250 Kč] [🛒 8] [⚠️ 3]  │
├───────────────────────────────────────┤
│ [Pokladna] [Historie] [Sklad] [Stats] │
│  ▓▓▓▓▓▓▓▓▓                            │
├───────────────────────────────────────┤
│ 👤 KLIENT                 [Bez klient]│
│ ╭─────────────────────────────────╮   │
│ │ Jan Novák          [👥 Rodina] │   │
│ │ Kredit: 2,500 Kč   ━━━━━━━━━━━ │   │
│ ╰─────────────────────────────────╯   │
├───────────────────────────────────────┤
│ ⚡ RYCHLÉ AKCE                        │
│ ╭─────────────────────────────────╮   │
│ │ 🕐 Jan • 450 Kč • Protein (2×)🔄│   │
│ ╰─────────────────────────────────╯   │
│ ╭──────╮ ╭──────╮ ╭──────╮ ╭──────╮  │
│ │Protein│ │Ionto │ │BCAA  │ │Energy│  │
│ │65 Kč │ │45 Kč │ │55 Kč │ │35 Kč │  │
│ ╰──────╯ ╰──────╯ ╰──────╯ ╰──────╯  │
├───────────────────────────────────────┤
│ 📦 PRODUKTY          🔍 [search...]   │
│ ─── 🔧 Služby (4) ─────────────────   │
│ ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮      │
│ │glass│ │glass│ │glass│ │glass│      │
│ ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯      │
│ ─── 📦 Produkty (12) ──────────────   │
│ ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮      │
│ │gauge│ │gauge│ │gauge│ │gauge│      │
│ ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯      │
╰───────────────────────────────────────╯
```

---

## ANIMACE A INTERAKCE

1. **Hero Header:**
   - Background glow s subtle pulse
   - KPI badges s fade-in animation

2. **Client Card:**
   - Credit bar smooth width transition
   - Low credit warning pulse

3. **Product Cards:**
   - Hover → lift + shadow
   - In-cart → ring animation + badge scale-in
   - Stock gauge → smooth fill on mount

4. **Cart Panel:**
   - Payment method pills s animated indicator
   - Checkout button s success glow

5. **History Cards:**
   - Hover → lift + chevron slide
   - Date headers → sticky with blur

6. **Stock Cards:**
   - Stock gauge → gradient animation
   - Low stock → warning border pulse

---

## KONZISTENCE

Všechny změny dodržují zavedený design systém:
- `.card-floating` / `bg-card/80 backdrop-blur-md`
- `shadow-sm` → `shadow-md/lg` on hover
- `tabular-nums` pro číselné hodnoty
- Category-specific glow colors
- Hover lift (`-translate-y-0.5` až `-translate-y-1`)
- Status-based color coding (success/warning/destructive)
- Premium typography (uppercase labels, bold values)
