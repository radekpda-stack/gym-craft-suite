
# Dashboard Audit a Redesign

## 1. Shrnutí současného stavu

Dashboard je implementován v `src/pages/Index.tsx` a je rozdělen do tří zón:
- **Hero Zone** - Hlavička s pozdravem a rychlými metrikami
- **Alert Zone** - Kritické položky vyžadující pozornost
- **Insight Zone** - Analytika a business health

---

## 2. Audit - Identifikované problémy

### A) Problémy s daty a grafy

| Problém | Komponenta | Popis |
|---------|-----------|-------|
| **Duplicitní query** | `useDashboardTrends` | Načítá data, která jsou již v `useDashboardCore`, zbytečné API volání |
| **Chybějící validace dat** | `DashboardInsights` | Nezobrazuje prázdný stav, když `trends` obsahuje `null/undefined` hodnoty |
| **Nesprávný výpočet retence** | `useDashboardTrends` | Retence porovnává minulý měsíc vs posledních 30 dní - nekonzistentní časové rámce |
| **Chybějící trend data** | `UnifiedFinancialChart` | Není používán na dashboardu, ale existuje funkční komponenta |
| **Capacity % nesprávně** | `useDashboardCapacity` | `percentUsed` počítá completed/total, ale total zahrnuje i scheduled - semanticky nesprávné |

### B) Problémy s UX/designem

| Problém | Komponenta | Popis |
|---------|-----------|-------|
| **Přetížený header** | `DashboardHeader` | Příliš mnoho informací v jednom řádku |
| **Chybí "Today Timeline"** | Index.tsx | Neexistuje vizuální přehled dnešních tréninků |
| **Business Yield komplex** | `BusinessYieldScoreCard` | 4 pilíře jsou příliš abstraktní pro rychlé pochopení |
| **DashboardInsights** | `DashboardInsights` | 842 řádků kódu - příliš komplexní, těžko udržovatelné |
| **Chybí vizuální hierarchie** | Index.tsx | Všechny karty vypadají stejně důležitě |
| **Nekonzistentní empty states** | Různé komponenty | Některé skrývají obsah, některé zobrazují zprávu |

### C) Problémy s výkonem

| Problém | Komponenta | Popis |
|---------|-----------|-------|
| **Samostatné queries** | `PendingPaymentsCard`, `ClientsInDebtCard` | Každá karta má vlastní query místo využití `useDashboardCore` |
| **Zbytečné re-rendery** | `DashboardInsights` | `useMemo` na 800 řádků logiky při každém render |
| **Animace vždy aktivní** | `BusinessYieldScoreCard` | Framer Motion animace i při návratu na stránku |

---

## 3. Plán redesignu

### Fáze 1: Oprava datových problémů

**1.1 Konsolidace hooks**

Rozšíříme `useDashboardCore` o chybějící data:

```text
useDashboardCore
├── clients
├── todayTrainings
├── weekTrainings
├── thisMonthTrainings
├── lastMonthTrainings
├── feedbackRequests
├── recentFeedback
├── unpaidTrainings
└── NEW: pendingPaymentSessions (přesunout z PendingPaymentsCard)
└── NEW: clientsInDebt (přesunout z ClientsInDebtCard)
```

**1.2 Oprava výpočtu kapacity**

```typescript
// Současný (nesprávný):
percentUsed: total > 0 ? Math.round((completed / total) * 100) : 0

// Nový (správný - progress k dokončení všech):
progress: total > 0 ? Math.round((completed / total) * 100) : 0,
label: `${completed}/${total}` // explicitnější
```

**1.3 Oprava retence**

Sjednotíme časové rámce:
- Aktivní klienti: posledních 30 dní
- Baseline: předchozích 30 dní (ne minulý měsíc)

### Fáze 2: Zjednodušení struktury

**2.1 Nová struktura Index.tsx**

```text
┌─────────────────────────────────────────────────────────────┐
│  HERO ZONE - Kompaktní hlavička                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Dnes středa, 28. ledna        [🏋️ Trénink] [📊 Stats] │  │
│  │ ● 3/5 tréninků  👥 4 klienti  💰 3 600 Kč              │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  TODAY TIMELINE - Nová sekce!                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 09:00 ● Jan Novák     [Dokončeno] [💬]                │  │
│  │ 10:30 ● Marie K.      [Probíhá...]                    │  │
│  │ 14:00 ○ Petr S.       [Naplánováno]                   │  │
│  │ 16:00 ○ Eva M.        [Naplánováno]                   │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ALERT ZONE - Pouze pokud jsou problémy                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⚠️ 2 tréninky čekají na přiřazení                     │  │
│  │ ⚠️ 3 neuhrazené tréninky (5 400 Kč)                   │  │
│  │ 🔴 1 klient s dluhem (-2 100 Kč)                      │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  INSIGHT ZONE - Klíčové metriky                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Tento týden  │ │ Tento měsíc  │ │ Aktivní      │         │
│  │ 12 500 Kč    │ │ 48 000 Kč    │ │ 18 klientů   │         │
│  │ ↑ +15%       │ │ ↓ -5%        │ │ 85% retence  │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│  [Kariérní statistiky - volitelně]                          │
│  [Cashflow - volitelně]                                     │
└─────────────────────────────────────────────────────────────┘
```

**2.2 Odstranění/zjednodušení komponent**

| Komponenta | Akce | Důvod |
|------------|------|-------|
| `DashboardInsights` | Přepsat | 842 řádků -> max 200 řádků, extrahovat utility |
| `BusinessYieldScoreCard` | Zjednodušit | Zobrazit pouze hlavní skóre, detail v modalu |
| `ClientProgressCard` | Přesunout | Do sekce Statistiky, není denně relevantní |

**2.3 Nová komponenta: TodayTimelineCompact**

Kompaktní timeline dnešních tréninků s quick actions:

```typescript
interface TodayTimelineProps {
  trainings: ScheduleItem[];
  onComplete: (id: string) => void;
  onOpenFeedback: (id: string) => void;
}
```

### Fáze 3: Vizuální vylepšení

**3.1 Sjednocení designového jazyka**

Všechny karty budou používat:
- `glass` třídu pro konzistentní vzhled
- Jednotnou padding strukturu (`p-4`)
- Konzistentní velikosti ikon (`w-5 h-5` pro titulky, `w-4 h-4` pro inline)
- Jednotné badge styling

**3.2 Barevný systém pro stavy**

```text
OK/Success:     hsl(var(--success))    - zelená
Warning:        hsl(var(--warning))    - oranžová  
Error/Critical: hsl(var(--destructive)) - červená
Info/Neutral:   hsl(var(--muted))      - šedá
```

**3.3 Responzivita**

- Mobile: Stack všech karet vertikálně
- Tablet: 2-column grid pro metriky
- Desktop: Zachovat max-w-3xl layout

### Fáze 4: Oprava specifických grafů

**4.1 FinanceSummaryCard**

Aktuální stav je funkční, pouze:
- Přidat loading skeleton pro trend indikátory
- Vylepšit kontrast textu pro warning stavy

**4.2 BusinessYieldScoreCard**

Zjednodušit na:
```text
┌────────────────────────────────────┐
│  Business Health    [i] [→]        │
│                                    │
│      ████████░░  78/100            │
│      Stabilní                      │
│                                    │
│  ⚠️ Vysoká míra zrušení            │
└────────────────────────────────────┘
```

**4.3 CashflowForecastCard**

Zachovat, ale:
- Přidat mikro-sparkline pro trend
- Zlepšit čitelnost na mobilu

---

## 4. Technická implementace

### Soubory k úpravě

| Soubor | Akce |
|--------|------|
| `src/pages/Index.tsx` | Přepsat layout, přidat TodayTimeline |
| `src/hooks/dashboard/useDashboardCore.ts` | Rozšířit o pending/debt data |
| `src/components/dashboard/DashboardHeader.tsx` | Zjednodušit, odstranit duplicitní metriky |
| `src/components/dashboard/DashboardInsights.tsx` | Refaktor na menší utility funkce |
| `src/components/dashboard/TodayTimelineCompact.tsx` | **Nový** - kompaktní timeline |
| `src/components/dashboard/BusinessYieldScoreCard.tsx` | Zjednodušit vizuál |
| `src/components/dashboard/PendingPaymentsCard.tsx` | Použít data z useDashboardCore |
| `src/components/dashboard/ClientsInDebtCard.tsx` | Použít data z useDashboardCore |

### Nové soubory

```text
src/components/dashboard/
├── TodayTimelineCompact.tsx     # Nová komponenta
├── AlertsSummaryCard.tsx        # Sloučené alerty do jedné karty
└── insights/                    # Extrahované utility
    ├── insightGenerators.ts     # Logika generování insights
    └── insightTypes.ts          # Typy pro insights
```

---

## 5. Shrnutí změn

### Hlavní vylepšení

1. **Přehlednější struktura** - 4 jasně oddělené zóny
2. **Today Timeline** - Okamžitý přehled dnešních tréninků
3. **Konsolidované alerty** - Všechny problémy na jednom místě
4. **Optimalizované queries** - Méně API volání, rychlejší načítání
5. **Čistší kód** - Menší komponenty, snadnější údržba

### Očekávaný výsledek

- **-40% API volání** díky konsolidaci hooks
- **-50% kódu** v DashboardInsights díky refaktoru
- **Rychlejší orientace** díky Today Timeline
- **Konzistentní UX** díky sjednocenému designu

### Časový odhad

- Fáze 1 (Data fixes): 45 minut
- Fáze 2 (Struktura): 60 minut
- Fáze 3 (Design): 30 minut
- Fáze 4 (Grafy): 20 minut
- Testování: 15 minut

**Celkem: ~2.5 hodiny**
