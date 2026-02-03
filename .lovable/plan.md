
# Fáze 13: Premium Dashboard Redesign - Příjemnější a akčnější pohled

## Analýza aktuálního stavu

### Aktuální struktura Dashboardu (Index.tsx)
```text
┌─────────────────────────────────────────────────────────────┐
│ HERO ZONE                                                   │
│  - DashboardHeader (pozdrav, datum, metriky)                │
├─────────────────────────────────────────────────────────────┤
│ TODAY TIMELINE                                              │
│  - TodayTimelineCompact (dnešní tréninky s timeline)       │
├─────────────────────────────────────────────────────────────┤
│ ALERT ZONE                                                  │
│  - AlertsSummaryCard (neuhrazené, dluhy)                   │
│  - UnassignedSessionsCard (nepřiřazené tréninky)           │
│  - FollowupsDashboardWidget (připomenutí)                  │
│  - PendingPerformancesCard (schválení výkonů)              │
├─────────────────────────────────────────────────────────────┤
│ INSIGHT ZONE                                                │
│  - BusinessYieldScoreCard (business health)                │
│  - DashboardInsightsRefactored (postřehy)                  │
│  - FinanceSummaryCard (finance týden/měsíc)                │
│  - CareerMilestoneCard (kariérní statistiky)               │
│  - CashflowForecastCard (předpověď cashflow)               │
├─────────────────────────────────────────────────────────────┤
│ DESKTOP BOTTOM BAR                                          │
│  - DashboardActions (+ nový, hledat, statistiky)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Identifikované problémy

### 1. Vizuální hierarchie
- **Header** - metriky jsou malé, status dot je příliš subtilní
- Příliš mnoho karet pod sebou bez vizuálního odlišení
- Chybí jasné sekční rozdělení

### 2. Akčnost a přehlednost
- **AlertsSummaryCard** - kliknutím se dostanu na kalendář, ale chybí přímá akce
- **Insights** - vizuálně splývají, chybí výraznější ikony
- **Timeline** - dobrá, ale "NOW" indikátor je příliš subtilní

### 3. Uspořádání informací
- Finance jsou až na konci, přitom denní příjem je důležitý
- BusinessYieldScore je komplexní, ale není nejdůležitější pro denní práci
- Chybí "Morning Briefing" - souhrn co mě čeká

### 4. Mobile experience
- Horizontální scroll metrik je skrytý
- Příliš mnoho vertikálního scrollování

---

## Navržené řešení

### ČÁST A: HERO SECTION REDESIGN

#### A1. Premium Morning Briefing Header
```text
╭───────────────────────────────────────────────────────────────────╮
│                                                                   │
│ ┌────────────────────────────────────────────────────────────────┐│
│ │ 🟢 DOBRÉ RÁNO                                                 ││
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓││
│ │ status gradient bar (zelená/oranžová/červená)                 ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                   │
│ 📅 Pondělí, 3. února 2026                      [🏋️ Trénink]      │
│                                                                   │
│ ─────────────────────────────────────────────────────────────────│
│                                                                   │
│ ╭─────────────────╮  ╭─────────────────╮  ╭─────────────────╮    │
│ │  ◐ 4/6         │  │  👥 3           │  │  💰 2,850 Kč    │    │
│ │  capacity ring │  │  klienti        │  │  dnešní příjem  │    │
│ │  tréninků dnes │  │                 │  │  ▲ +12%         │    │
│ ╰─────────────────╯  ╰─────────────────╯  ╰─────────────────╯    │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `DashboardHeader.tsx`:
- Status jako gradient bar pod pozdravem (ne jen tečka)
- Capacity jako výrazný activity ring s čísly uvnitř
- Dnešní příjem prominentní s trendem
- "Tréninkový režim" tlačítko stále viditelné

---

#### A2. Metric Instruments - Větší a výraznější
```text
╭──────────────────────╮  ╭──────────────────────╮  ╭──────────────────────╮
│       ┌───────┐      │  │                      │  │                      │
│       │  ◐   │      │  │     👥               │  │     💰              │
│       │ 4/6  │      │  │                      │  │                      │
│       └───────┘      │  │      3              │  │    2,850             │
│                      │  │    klienti           │  │      Kč              │
│   KAPACITA          │  │                      │  │    ▲ +12%            │
│   67% využito       │  │   dnes               │  │   vs. minulý den     │
│   ━━━━━━━━━━━━━━━━  │  │                      │  │                      │
╰──────────────────────╯  ╰──────────────────────╯  ╰──────────────────────╯
```

- Metriky jako "instrumenty" inspirované Whoop/Apple Watch
- Activity ring pro kapacitu
- Trend comparison pod hodnotami

---

### ČÁST B: TODAY TIMELINE - Vylepšení

#### B1. Enhanced Timeline s Quick Actions
```text
╭───────────────────────────────────────────────────────────────────╮
│ 📅 DNEŠNÍ TRÉNINKY                              [3/5] dokončeno  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┃  ✓ 08:00  Jan Novák           [Dokončeno]                     │
│ ┃  ─────────────────────────────────────────────────────────────│
│ ┃  ✓ 09:30  Marie Nová          [Dokončeno]                     │
│ ┃  ─────────────────────────────────────────────────────────────│
│ ┃🔴10:45  Petr Svoboda  ← NYNÍ  [▶ Dokončit]  [📝 Feedback]    │
│ ┃  ─────────────────────────────────────────────────────────────│
│ ┃  ○ 14:00  Lukáš Horák         Další →                        │
│ ┃  ─────────────────────────────────────────────────────────────│
│ ┃  ○ 16:30  Eva Malá            Za 5h 45min                    │
│                                                                   │
│                               [📅 Zobrazit kalendář →]           │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `TodayTimelineCompact.tsx`:
- NOW indikátor jako výrazný červený pulsující bod + label "NYNÍ"
- Quick actions přímo v řádku: "Dokončit", "Feedback"
- Relativní čas "Za Xh Xmin" u nadcházejících
- Progress bar v headeru (3/5 dokončeno)

---

### ČÁST C: ALERT ZONE - Konsolidace a akce

#### C1. Unified Action Center
```text
╭───────────────────────────────────────────────────────────────────╮
│ ⚡ VYŽADUJE AKCI                                              (5) │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 💰 2 neuhrazené tréninky             1,450 Kč   [UHRADIT]  │  │
│ │    warning glow                                             │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ ⚠️ 1 klient s nízkým kreditem        pod 500 Kč  [DOPLNIT] │  │
│ │    warning glow                                             │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 📋 2 tréninky k přiřazení                       [PŘIŘADIT] │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Nová komponenta `ActionCenterCard.tsx`:
- Sloučí AlertsSummaryCard, UnassignedSessionsCard, FollowupsDashboardWidget
- Každý alert má PŘÍMOU akci (dialog/sheet)
- Click → okamžité řešení, ne navigace jinam
- Collapsed stav pokud 0 položek

---

### ČÁST D: INSIGHT ZONE - Zjednodušení

#### D1. Quick Stats Bar (místo BusinessYieldScore)
```text
╭───────────────────────────────────────────────────────────────────╮
│  TENTO TÝDEN                           vs. minulý týden          │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │ 📊 8 tréninků  │  │ 💰 12,450 Kč   │  │ 📈 Trend       │      │
│  │    ▲ +2        │  │    ▲ +18%      │  │    ⬆ Rostoucí  │      │
│  │    vs. 6       │  │    vs. 10,550  │  │                │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Nová komponenta `WeeklyQuickStats.tsx`:
- Nahradí komplexní BusinessYieldScoreCard v daily view
- 3 klíčové metriky: tréninky, příjem, trend
- BusinessYieldScore přesunout do Statistiky

---

#### D2. Smart Insights - Výraznější a akčnější
```text
╭───────────────────────────────────────────────────────────────────╮
│ 💡 POSTŘEHY                                        [🔄 Další]    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ ✅ Retence 94%                                   →         │  │
│ │    Skvělá retence, pouze 1 klient odešel                   │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ 📈 Duo tréninky                                  →         │  │
│ │    +23% příjem z duo tréninků tento měsíc                  │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
│ ╭─────────────────────────────────────────────────────────────╮  │
│ │ ⚡ Peak hodina                                   →         │  │
│ │    Nejvíce tréninků v 10:00-12:00                          │  │
│ ╰─────────────────────────────────────────────────────────────╯  │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `DashboardInsightsRefactored.tsx`:
- Větší ikony (emoji → icons)
- Více prostoru mezi položkami
- Detail jako subtitle (ne jen text)
- Výraznější barevné kódování

---

#### D3. Finance Summary - Čistší layout
```text
╭───────────────────────────────────────────────────────────────────╮
│ 💰 FINANCE                                                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                TENTO TÝDEN              TENTO MĚSÍC         │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │       12,450 Kč                         45,800 Kč          │ │
│  │       ▲ +18% vs minulý                  ▲ +12%             │ │
│  │                                                             │ │
│  │       8 tréninků                        32 tréninků        │ │
│  │       ⌀ 1,556 Kč/trénink                ⌀ 1,431 Kč         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ⚠️ 2 neuhrazených (1,450 Kč)   [ŘEŠIT →]                        │
│                                                                   │
╰───────────────────────────────────────────────────────────────────╯
```

Změny v `FinanceSummaryCard.tsx`:
- Čistší tabulkový layout
- Alert row pouze pokud jsou problémy
- Kliknutelná navigace přímo na řešení

---

### ČÁST E: MOBILNÍ OPTIMALIZACE

#### E1. Swipeable Metric Cards
```text
Na mobilu:
╭───────────────────────────────────────╮
│   [← swipe →]                         │
│                                       │
│   ┌─────────────────────────────────┐ │
│   │      ◐ 4/6                      │ │
│   │    KAPACITA                     │ │
│   │    67% využito                  │ │
│   └─────────────────────────────────┘ │
│                                       │
│   ● ○ ○                              │
╰───────────────────────────────────────╯
```

- Metriky jako horizontal carousel s pagination dots
- Swipe pro další metriku
- Více prostoru pro každou metriku

---

#### E2. Collapsible Sections
```text
╭───────────────────────────────────────╮
│ ▼ DNEŠNÍ TRÉNINKY                (5) │ ← tap to collapse
├───────────────────────────────────────┤
│   ... obsah ...                       │
╰───────────────────────────────────────╯

╭───────────────────────────────────────╮
│ ▶ FINANCE                  12,450 Kč │ ← collapsed, shows summary
╰───────────────────────────────────────╯
```

- Sekce jako collapsible
- Collapsed stav zobrazuje key metric
- Pamatuje si stav (localStorage)

---

### ČÁST F: QUICK ACTIONS REDESIGN

#### F1. Floating Action Button (FAB) na mobilu
```text
                                    ╭───────╮
                                    │  ➕   │
                                    │       │ ← FAB pro nový trénink
                                    ╰───────╯
```

- Primární akce jako floating button
- Tap → menu s akcemi (Trénink, Poznámka, Hledat)

---

## SOUBORY K ÚPRAVĚ

### Vysoká priorita
| Soubor | Změny |
|--------|-------|
| `src/pages/Index.tsx` | Restrukturalizace sekcí, zjednodušení |
| `src/components/dashboard/DashboardHeader.tsx` | Premium header, status bar, větší metriky |
| `src/components/dashboard/TodayTimelineCompact.tsx` | Quick actions, výraznější NOW, relativní čas |
| `src/components/dashboard/AlertsSummaryCard.tsx` → `ActionCenterCard.tsx` | Konsolidace alertů s přímými akcemi |

### Střední priorita
| Soubor | Změny |
|--------|-------|
| `src/components/dashboard/DashboardInsightsRefactored.tsx` | Větší ikony, lepší spacing |
| `src/components/dashboard/FinanceSummaryCard.tsx` | Čistší layout, alert row |
| `src/components/dashboard/WeeklyQuickStats.tsx` | NOVÁ komponenta - týdenní přehled |
| `src/components/dashboard/DashboardActions.tsx` | FAB pattern pro mobil |

### Nižší priorita
| Soubor | Změny |
|--------|-------|
| `src/components/dashboard/CashflowForecastCard.tsx` | Vizuální polish |
| `src/components/dashboard/UnassignedSessionsCard.tsx` | Sloučit do ActionCenter |
| `src/components/dashboard/FollowupsDashboardWidget.tsx` | Sloučit do ActionCenter |

---

## TECHNICKÉ DETAILY

### Premium Status Bar
```tsx
<div className="relative h-1.5 rounded-full overflow-hidden bg-muted/30">
  <div 
    className={cn(
      "h-full rounded-full transition-all duration-500",
      dayStatus === 'ok' ? "bg-gradient-to-r from-success to-success/70" :
      dayStatus === 'warning' ? "bg-gradient-to-r from-warning to-warning/70" :
      "bg-gradient-to-r from-destructive to-destructive/70"
    )}
    style={{ width: '100%' }}
  />
  <div 
    className={cn(
      "absolute inset-0 opacity-50",
      dayStatus === 'ok' && "animate-pulse bg-success/20"
    )}
  />
</div>
```

### Capacity Instrument Card
```tsx
<motion.div 
  className="relative p-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border/30"
  whileHover={{ scale: 1.02 }}
>
  <div className="flex flex-col items-center gap-2">
    {/* Large Activity Ring */}
    <div className="relative">
      <ActivityRing 
        progress={capacityPercent} 
        size="lg" 
        color={dayStatus === 'ok' ? 'success' : 'warning'}
        strokeWidth={8}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">
          {capacity.completed}/{capacity.total}
        </span>
      </div>
    </div>
    
    <div className="text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Kapacita</p>
      <p className="text-sm font-medium">{capacityPercent}% využito</p>
    </div>
  </div>
</motion.div>
```

### Timeline Quick Action Buttons
```tsx
{isCurrentSlot && !isCompleted && (
  <div className="flex items-center gap-1 ml-auto">
    <Button
      size="sm"
      variant="default"
      className="h-7 px-2 text-xs bg-success hover:bg-success/90"
      onClick={(e) => {
        e.stopPropagation();
        handleCompleteTraining(training.id);
      }}
    >
      <Check className="w-3 h-3 mr-1" />
      Dokončit
    </Button>
  </div>
)}
```

### Action Center Item with Direct Action
```tsx
<motion.div
  whileHover={{ x: 4 }}
  className={cn(
    'flex items-center gap-3 p-3 rounded-xl transition-all',
    'bg-card/60 backdrop-blur-sm border',
    'border-warning/30 hover:border-warning/50'
  )}
>
  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
    <CreditCard className="w-5 h-5 text-warning" />
  </div>
  
  <div className="flex-1 min-w-0">
    <p className="font-medium text-sm">2 neuhrazené tréninky</p>
    <p className="text-xs text-muted-foreground">1,450 Kč</p>
  </div>
  
  <Button
    size="sm"
    variant="outline"
    className="shrink-0 border-warning/50 text-warning hover:bg-warning/10"
    onClick={(e) => {
      e.stopPropagation();
      setShowUnpaidDialog(true);
    }}
  >
    Uhradit
  </Button>
</motion.div>
```

---

## VIZUÁLNÍ SROVNÁNÍ

### PŘED:
```text
┌───────────────────────────────────────┐
│ 🟢 Dobré ráno                         │
│ Pondělí, 3. února                     │
│ [metric] [metric] [metric] [metric]   │ ← malé, scroll
├───────────────────────────────────────┤
│ Timeline (standard card)              │
├───────────────────────────────────────┤
│ Alerts card                           │
│ Unassigned card                       │ ← 3 oddělené karty
│ Followups card                        │
├───────────────────────────────────────┤
│ BusinessYieldScore (complex)          │
│ Insights                              │
│ Finance                               │ ← hodně scrollování
│ Career                                │
│ Cashflow                              │
└───────────────────────────────────────┘
```

### PO:
```text
╭───────────────────────────────────────╮
│ ┌─ 🟢 DOBRÉ RÁNO ─────────────────┐   │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ status bar ▓▓ │   │ ← výrazný status
│ └─────────────────────────────────┘   │
│ Pondělí, 3. února         [🏋️ Trénink]│
├───────────────────────────────────────┤
│ ╭───────╮  ╭───────╮  ╭───────╮       │
│ │ ◐ 4/6 │  │ 👥 3  │  │ 💰2.8k│       │ ← velké instrumenty
│ ╰───────╯  ╰───────╯  ╰───────╯       │
├───────────────────────────────────────┤
│ 📅 DNEŠNÍ TRÉNINKY              [3/5] │
│ ┃ ✓ 08:00 Jan                         │
│ ┃🔴10:45 Petr ← NYNÍ  [Dokončit]      │ ← quick actions
│ ┃ ○ 14:00 Lukáš                       │
├───────────────────────────────────────┤
│ ⚡ VYŽADUJE AKCI                  (3)  │
│ ╭ 💰 2 neuhrazené    1,450 Kč [UHRADIT]│ ← přímé akce
│ ╭ 📋 1 k přiřazení           [PŘIŘADIT]│
├───────────────────────────────────────┤
│ 📊 TENTO TÝDEN                        │
│ 8 tréninků ▲+2  |  12,450 Kč ▲+18%   │ ← simple weekly stats
├───────────────────────────────────────┤
│ 💡 POSTŘEHY                     [Další]│
│ ✅ Retence 94% - skvělá                │ ← čitelné insights
│ 📈 Duo +23%                            │
╰───────────────────────────────────────╯
```

---

## ANIMACE A INTERAKCE

1. **Status Bar:**
   - Gradient fill animation on load
   - Subtle pulse pokud status = ok

2. **Metric Instruments:**
   - Activity ring animation on mount
   - Hover → scale(1.02) + shadow
   - Swipe na mobilu

3. **Timeline Items:**
   - NOW indicator: pulsing red dot + glow
   - Quick action buttons: scale on hover
   - Completed items: slide-in checkmark

4. **Action Center:**
   - Alert items: hover → slide-x
   - Action buttons: success glow on complete
   - Count badge: animate on change

5. **Insights:**
   - Staggered fade-in
   - Hover → lift + shadow
   - Click → sheet open animation

---

## KONZISTENCE

Změny dodržují zavedený design systém:
- `.card-floating` / `bg-card/80 backdrop-blur-md`
- `shadow-sm` → `shadow-md` on hover
- `tabular-nums` pro číselné hodnoty
- Status colors: success/warning/destructive
- Hover lift (`-translate-y-0.5`)
- Premium typography (uppercase labels, bold values)
- Activity rings pro progress
- Framer Motion pro animations
