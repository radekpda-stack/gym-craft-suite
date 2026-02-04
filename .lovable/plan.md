
# Vylepšení sekce Výkonnost - Zaměření na historii a pokrok klientů

## Přehled změn

Redesign sekce Výkonnost s důrazem na sledování pokroku klientů, vizualizaci historie a snadné porovnávání výsledků.

## Architektura změn

```text
PerformanceHub (redesigned)
├── Hero Header (zachováno)
├── Tabs
│   ├── Přehled (vylepšeno)
│   │   ├── PerformanceKPIBar (zachováno)
│   │   ├── ClientProgressDashboard     ← NOVÉ - hlavní sekce pokroku
│   │   │   ├── ClientSelector (prominentní)
│   │   │   ├── ProgressSparklineGrid   ← NOVÉ - mini grafy
│   │   │   └── RecentActivityTimeline  ← NOVÉ
│   │   ├── CategoryCards (zachováno)
│   │   └── TopClientsCompact
│   │
│   ├── Klienti (NOVÁ TAB)              ← NOVÁ ZÁLOŽKA
│   │   ├── ClientProgressView
│   │   │   ├── ClientSearchHeader
│   │   │   ├── ProgressHeroCard        ← NOVÉ - hero stats
│   │   │   ├── ExerciseProgressGrid    ← grafy pokroku
│   │   │   ├── PRHistoryTimeline       ← NOVÉ
│   │   │   └── ComparisonToggle        ← porovnání s baseline
│   │   └── MultiClientComparison       ← NOVÉ - porovnání více klientů
│   │
│   ├── Knihovna (zachováno)
│   ├── Analytika (zachováno)
│   ├── Testy (zachováno)
│   └── Výzvy (zachováno)
```

## Klíčové nové komponenty

### 1. ClientProgressDashboard (src/components/performance/ClientProgressDashboard.tsx)

Nový dashboard zaměřený na sledování pokroku jednotlivého klienta.

**Funkce:**
- Prominentní výběr klienta nahoře
- Quick stats: PR tento měsíc, tréninků, trend
- Grid mini-grafů (sparklines) pro top cviky
- Timeline nedávné aktivity

```typescript
interface ClientProgressDashboardProps {
  initialClientId?: string;
}

// Zobrazí:
// - Hero stats kartu s celkovým pokrokem
// - Grid sparkline grafů pro nejčastější cviky
// - Časovou osu posledních záznamů
```

### 2. ProgressSparklineGrid (src/components/performance/ProgressSparklineGrid.tsx)

Mřížka malých grafů pokroku pro jednotlivé cviky.

**Design:**
```text
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Bench Press     │ │ Squat           │ │ Deadlift        │
│ ▁▂▃▅▆▇         │ │ ▃▄▅▆▅▆▇         │ │ ▂▃▄▆▇▇          │
│ 80 kg → 95 kg   │ │ 100 kg → 120 kg │ │ 130 kg → 150 kg │
│ +18.7%    ↑     │ │ +20%      ↑     │ │ +15.4%    ↑     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Funkce:**
- Kompaktní sparkline graf
- Zobrazení prvního a posledního záznamu
- Procentuální změna s barevným indikátorem
- Klik otevře detail cviku s plným grafem

### 3. ClientProgressView (src/components/performance/ClientProgressView.tsx)

Dedikovaná stránka pro detailní sledování pokroku klienta.

**Sekce:**
```text
┌────────────────────────────────────────────────────────┐
│  [Vybrat klienta ▼]  Jan Novák                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ 12      │  │ 45      │  │ 3       │  │ +15%    │  │
│  │ PR      │  │ Tréninků│  │ Měsíce  │  │ Objem   │  │
│  │ celkem  │  │ za 90d  │  │ aktivní │  │ trend   │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│                                                        │
│  ══════════════════════════════════════════════════   │
│  SILOVÉ CVIKY                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Graf: Bench Press - progrese v čase]            │ │
│  │ 80kg ────────────●──────────●─────────●────95kg  │ │
│  │      Jan    Feb    Mar    Apr    May             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Graf: Squat - progrese v čase]                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ══════════════════════════════════════════════════   │
│  KARDIO CVIKY                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [Graf: 5km Run - čas]                            │ │
│  │ 28:30 ─────●────────●───────●────────────25:15   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ══════════════════════════════════════════════════   │
│  HISTORIE PR                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🏆 15.5. Bench Press   95 kg  (+5 kg)            │ │
│  │ 🏆 10.5. Squat        120 kg  (+10 kg)           │ │
│  │ 🏆 28.4. Deadlift     150 kg  (+10 kg)           │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 4. MultiClientComparison (src/components/performance/MultiClientComparison.tsx)

Porovnání více klientů vedle sebe.

**Funkce:**
- Vybrat 2-4 klienty pro porovnání
- Zobrazit stejný cvik side-by-side
- Bar chart pro max hodnoty
- Timeline overlay pro progres

```text
┌────────────────────────────────────────────────────────┐
│  Porovnat klienty                                      │
│  [Jan ×] [Petra ×] [+ Přidat klienta]                 │
├────────────────────────────────────────────────────────┤
│  Cvik: [Bench Press ▼]                                 │
├────────────────────────────────────────────────────────┤
│         Jan Novák          Petra Svobodová             │
│         ████████ 95kg      ██████ 65kg                │
│                                                        │
│  [Overlay graf: obě křivky v jednom]                  │
│  ───Jan───●─────●─────●                               │
│  ─Petra──●───●───●───●                                │
└────────────────────────────────────────────────────────┘
```

### 5. PRHistoryTimeline (src/components/performance/PRHistoryTimeline.tsx)

Chronologická timeline všech PR s vizuálním důrazem.

```text
┌─────────────────────────────────────────────┐
│ 🏆 Historie rekordů                         │
├─────────────────────────────────────────────┤
│ ● 15.5.2026                                 │
│   Bench Press    95 kg  (+5 kg)   🔥 +5.5%  │
│                                             │
│ ● 10.5.2026                                 │
│   Squat         120 kg  (+10 kg)  🔥 +9.0%  │
│                                             │
│ ● 28.4.2026                                 │
│   Deadlift      150 kg  (+10 kg)  🔥 +7.1%  │
└─────────────────────────────────────────────┘
```

## UI/UX vylepšení

### Prémiový design podle existujících standardů

Zachovám stávající vizuální identitu:
- **Glassmorphism**: `backdrop-blur-md`, `bg-card/80`, `border-border/50`
- **Instrumentální pojetí**: Activity Rings, Gauge Meters, sparklines
- **Signální barvy**: zelená=pokrok, žlutá=stagnace (bez hodnocení)
- **Animace**: Framer Motion s `cardInteraction` efekty

### Nová záložka "Klienti" v hlavní navigaci

```text
[Přehled] [Klienti] [Knihovna] [Analytika] [Testy] [Výzvy]
              ↑ NOVÁ
```

Tato záložka se stane primárním místem pro sledování pokroku:
- Rychlý přístup k detailu jakéhokoli klienta
- Porovnání více klientů
- Filtrování podle období, typu cviku

### Vylepšená navigace a vyhledávání

- Globální search (Cmd+K) již existuje - využít pro rychlý skok na klienta
- "Nedávno prohlížení" chips pro rychlý návrat

## Soubory k vytvoření

| Soubor | Popis |
|--------|-------|
| `src/components/performance/ClientProgressDashboard.tsx` | Dashboard pokroku klienta |
| `src/components/performance/ProgressSparklineGrid.tsx` | Mřížka mini-grafů |
| `src/components/performance/ClientProgressView.tsx` | Detailní view pokroku |
| `src/components/performance/MultiClientComparison.tsx` | Porovnání více klientů |
| `src/components/performance/PRHistoryTimeline.tsx` | Timeline PR |
| `src/components/performance/ProgressHeroCard.tsx` | Hero stats karta |
| `src/hooks/useClientProgressStats.ts` | Hook pro statistiky pokroku |

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/pages/PerformanceHub.tsx` | Přidat novou záložku "Klienti", reorganizovat přehled |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Kompaktnější verze pro přehled |

## Technické detaily

### Hook useClientProgressStats

```typescript
interface ClientProgressStats {
  totalPRs: number;
  prsThisMonth: number;
  trainingsCount: number;
  activeSince: Date;
  volumeTrend: number; // procentuální změna
  topExercises: {
    name: string;
    type: 'strength' | 'cardio' | 'skill';
    firstValue: number;
    lastValue: number;
    changePercent: number;
    sparklineData: number[];
  }[];
  recentPRs: {
    date: string;
    exerciseName: string;
    value: number;
    previousValue: number;
    unit: string;
  }[];
}
```

### Sparkline komponenta

Využije existující Recharts pro mini-grafy:
```typescript
<ResponsiveContainer width={120} height={40}>
  <AreaChart data={sparklineData}>
    <defs>
      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
      </linearGradient>
    </defs>
    <Area 
      type="monotone" 
      dataKey="value" 
      stroke="hsl(var(--primary))"
      fill="url(#sparkGradient)"
    />
  </AreaChart>
</ResponsiveContainer>
```

## Očekávaný výsledek

1. **Rychlý přehled** - Na první pohled vidím pokrok všech klientů
2. **Detailní analýza** - Jeden klik pro kompletní historii konkrétního klienta
3. **Snadné porovnání** - Vizuální porovnání více klientů side-by-side
4. **Prémiová estetika** - Konzistentní s existujícím designem (Whoop/Apple Fitness styl)
5. **Rychlá navigace** - Všechny informace dostupné na 1-2 kliky

## Priorita implementace

1. **Fáze 1**: ClientProgressView + useClientProgressStats (základní sledování jednoho klienta)
2. **Fáze 2**: ProgressSparklineGrid + ProgressHeroCard (vizuální vylepšení)
3. **Fáze 3**: Integrace do PerformanceHub (nová záložka Klienti)
4. **Fáze 4**: MultiClientComparison (porovnání více klientů)
5. **Fáze 5**: PRHistoryTimeline (detailní historie rekordů)
