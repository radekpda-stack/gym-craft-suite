
# Oprava chybějícího srovnávání na dashboardu klientského portálu

## Identifikovaný problém

Během refaktoru Fáze 1 byla z dashboardu **odstraněna komponenta `OverallPerformanceCard`**, která zobrazovala:
- Celkové percentilové umístění klienta
- Nejsilnější cvik (např. "Bench Press - Top 15%")
- PR rank
- Nejslabší cvik

Klient tak nyní nemá na hlavní obrazovce způsob, jak se dostat ke srovnání s ostatními.

## Navrhované řešení

### 1. Vrátit `OverallPerformanceCard` na dashboard

Přidáme zpět komponentu `OverallPerformanceCard` do `ClientPortalOverview.tsx`. Tato karta:
- Zobrazuje percentilové srovnání (např. "Lepší než 65% ostatních klientů")
- Ukazuje konkrétní cviky (bench press 50kg - Top 20%)
- Po kliknutí naviguje na `/zona/competitions?tab=leaderboard`

### 2. Udělat `ClientQuickStats` klikatelnou

Karty v `ClientQuickStats` (Tréninků | Moje PRs | Série) budou nově klikatelné:
- **Moje PRs** → naviguje na `/zona/progress` (sekce s PRs)
- **Tréninků** → naviguje na `/zona/diary`
- **Série** → naviguje na `/zona/competitions?tab=leaderboard`

---

## Technická implementace

### Krok 1: Upravit `ClientPortalOverview.tsx`

```tsx
// Přidat import
import { OverallPerformanceCard } from '@/components/client-portal/dashboard/OverallPerformanceCard';

// V renderovací části přidat mezi ClientQuickStats a ClientQuickActions:
{clientId && <OverallPerformanceCard clientId={clientId} />}
```

### Krok 2: Upravit `ClientQuickStats.tsx`

```tsx
// Přidat navigaci
import { useNavigate } from 'react-router-dom';

// V komponentě
const navigate = useNavigate();

// Upravit QuickStat aby byla klikatelná
<Card 
  className="bg-card/50 border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
  onClick={onClick}
>
```

Každá statistika bude mít svůj `onClick`:
- Tréninků → `navigate('/zona/diary')`
- Moje PRs → `navigate('/zona/progress')`
- Série → `navigate('/zona/competitions?tab=leaderboard')`

### Krok 3: Opravit navigační cíl v `OverallPerformanceCard`

Aktuálně naviguje na `/zona/leaderboard`, ale správný cíl je `/zona/competitions?tab=leaderboard` (kam jsme sloučili žebříčky).

---

## Výsledná struktura dashboardu

```text
┌─────────────────────────────────────┐
│  Ahoj, Tomáši!                      │
│  Tvůj tréninkový přehled            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠️ Action Required (pokud existuje) │
└─────────────────────────────────────┘

┌─────────────────┐ ┌─────────────────┐
│ 💳 Kredit       │ │ 📅 Další trénink│
│ 2 500 Kč        │ │ Zítra 10:00     │
└─────────────────┘ └─────────────────┘

┌───────┬───────┬───────┐
│ 12    │  8    │  4w   │ ← klikatelné
│Trénin │ PRs   │Série  │
└───────┴───────┴───────┘

┌─────────────────────────────────────┐  ← VRÁCENO
│ 📊 Můj celkový výkon                │
│ ━━━━━━━━━━━━━━━━━━━━━━ 65%         │
│ Lepší než 65% ostatních            │
│                                     │
│ 💪 Nejsilnější: Bench Press        │
│ 📈 Prostor: Deadlift               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ + Přidat trénink    + Přidat váhu   │
└─────────────────────────────────────┘
```

---

## Změny v souborech

| Soubor | Změna |
|--------|-------|
| `src/pages/client-portal/ClientPortalOverview.tsx` | Import a render `OverallPerformanceCard` |
| `src/components/client-portal/dashboard/ClientQuickStats.tsx` | Přidat `onClick` navigaci pro každou statistiku |
| `src/components/client-portal/dashboard/OverallPerformanceCard.tsx` | Opravit navigaci z `/zona/leaderboard` na `/zona/competitions?tab=leaderboard` |

---

## Zachováno z původního designu

- Karta se skryje, pokud klient nemá žádná data (`benchmarks.overallPercentile === null`)
- Zobrazí konkrétní cviky s hodnotami (bench press, deadlift)
- Po kliknutí přechod na detailní žebříček
- Glassmorphism styl a Framer Motion animace
