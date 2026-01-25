

# Nahrazení "Týdny série" za "Váha" na dashboardu klientského portálu

## Shrnutí změn
Odstraníme statistiku "Týdny série" (streak) a nahradíme ji kartou "Váha", která zobrazuje aktuální váhu klienta se šipkou trendu. Po kliknutí se otevře Sheet s grafy váhy a tělesného tuku.

## Vizuální návrh

```text
┌─────────────────────────────────────────────────┐
│    [Tréninků]    [Moje PRs]    [Váha]           │
│       12            8          78.5 kg ↓        │
│    Tréninků      Moje PRs        Váha           │
└─────────────────────────────────────────────────┘
```

### Stavy karty Váha:

**S daty:**
```text
┌─────────┐
│   ⚖️    │
│ 78.5 kg │  ← Hodnota + šipka trendu (↓ zelená / ↑ červená)
│  Váha   │
└─────────┘
```

**Bez dat (kliknutelné):**
```text
┌─────────┐
│   ⚖️    │
│    –    │  ← Pomlčka místo hodnoty
│  Váha   │
└─────────┘
```

### Po kliknutí - Sheet s obsahem:

**Pokud nejsou data:**
```text
┌─────────────────────────────────────────┐
│  ⚖️ Váha                          [×]  │
├─────────────────────────────────────────┤
│                                         │
│   Zatím nemáš žádná měření.            │
│                                         │
│   🏋️ Požádej trenéra o zvážení na      │
│      segmentální váze                   │
│                                         │
│   ───── nebo ─────                      │
│                                         │
│   ✏️ Zadej váhu ručně:                  │
│   ┌─────────────────────────────────┐   │
│   │ [+ Přidat měření]               │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Pokud jsou data:**
```text
┌─────────────────────────────────────────┐
│  ⚖️ Váha a Tělesný tuk            [×]  │
├─────────────────────────────────────────┤
│                                         │
│   📉 Graf váhy (WeightChart)           │
│   ┌─────────────────────────────────┐   │
│   │  78 ━━━━━━━━━━━━━━━━━━━━━      │   │
│   │  76 ━━━━━━━━━━━━━━━━━          │   │
│   │     Jan  Feb  Mar  Apr         │   │
│   └─────────────────────────────────┘   │
│                                         │
│   📊 Graf tělesného tuku (BodyFatChart)│
│   ┌─────────────────────────────────┐   │
│   │  20% ━━━━━━━━━━━━━━━            │   │
│   │  18% ━━━━━━━━━━━━               │   │
│   │       Jan  Feb  Mar            │   │
│   └─────────────────────────────────┘   │
│                                         │
│   [+ Přidat měření]                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Detailní kroky implementace

### Krok 1: Vytvořit novou komponentu WeightStatCard
**Nový soubor:** `src/components/client-portal/dashboard/WeightStatCard.tsx`

Samostatná komponenta pro kartu váhy s:
- Zobrazením aktuální váhy + trend (šipka nahoru/dolů)
- Sheet overlay při kliknutí
- Podmíněným obsahem:
  - Bez dat: zpráva + možnost přidat ručně
  - S daty: grafy WeightChart + BodyFatChart

### Krok 2: Upravit ClientQuickStats
**Soubor:** `src/components/client-portal/dashboard/ClientQuickStats.tsx`

- Odstranit třetí kartu "Týdny série" (streak)
- Nahradit za komponentu `WeightStatCard`
- Odstranit nepoužívané importy (`useClientStreak`, `Flame`)

---

## Technické detaily

### WeightStatCard.tsx - Struktura

```typescript
import { useState } from 'react';
import { Scale, TrendingUp, TrendingDown, Plus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientWeightProgress, useClientBodyFatProgress } from '@/hooks/useClientProgressData';
import { WeightChart } from '@/components/client-portal/progress/WeightChart';
import { BodyFatChart } from '@/components/client-portal/progress/BodyFatChart';
import { AddMeasurementDialog } from '@/components/client-portal/progress/AddMeasurementDialog';

// Logika:
// 1. Načíst váhu přes useClientWeightProgress
// 2. Vypočítat trend (poslední - předposlední hodnota)
// 3. Zobrazit kartu s hodnotou + šipkou
// 4. Po kliknutí otevřít Sheet:
//    - Bez dat: info text + AddMeasurementDialog
//    - S daty: WeightChart + BodyFatChart + tlačítko přidat
```

### Upravený ClientQuickStats.tsx

```typescript
// Změny:
// 1. Odstranit: import { Flame } from 'lucide-react'
// 2. Odstranit: import { useClientStreak } from '@/hooks/useClientXPLevel'
// 3. Odstranit: streakData, streakLoading, currentStreak
// 4. Přidat: import { WeightStatCard } from './WeightStatCard'
// 5. Nahradit třetí QuickStat za <WeightStatCard />

// Grid zůstane 3 sloupce:
<motion.div className="grid grid-cols-3 gap-2">
  <QuickStat icon={Dumbbell} label="Tréninků" ... />
  <QuickStat icon={Trophy} label="Moje PRs" ... />
  <WeightStatCard />  // ← Nová komponenta místo streaku
</motion.div>
```

---

## Výpočet trendu váhy

```typescript
// Porovnání posledních dvou měření:
const latestWeight = weightData[weightData.length - 1];
const previousWeight = weightData[weightData.length - 2];

const weightTrend = latestWeight && previousWeight 
  ? latestWeight.value - previousWeight.value 
  : undefined;

// Barevné kódování:
// weightTrend < 0 → zelená (pokles = pozitivní)
// weightTrend > 0 → červená (nárůst = upozornění)
// weightTrend === 0 → šedá (stabilní)
```

---

## Ovlivněné soubory

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/dashboard/WeightStatCard.tsx` | **NOVÝ** - Karta váhy se Sheet overlay |
| `src/components/client-portal/dashboard/ClientQuickStats.tsx` | Nahrazení streaku za WeightStatCard |

## Výhody nového uspořádání

1. **Relevantnější metrika** - Váha je pro klienty důležitější než "týdny série"
2. **Přímý přístup k datům** - Kliknutím vidí historii a může přidat měření
3. **Motivace k zadávání** - Prázdná karta vyzývá k akci s jasným návodem
4. **Konzistence** - Využívá existující komponenty (WeightChart, BodyFatChart, AddMeasurementDialog)

