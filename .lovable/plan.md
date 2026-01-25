
# Přesun Žebříčku na Přehled klientského portálu

## Shrnutí změn
Přesuneme kompletní Žebříček (srovnání cviků - síla, kardio, plyometrika) ze záložky "Soutěže" na hlavní dashboard "Přehled". Stránka "Soutěže" bude obsahovat pouze Výzvy.

## Vizuální návrh

```text
┌─────────────────────────────────────┐
│  Ahoj, Jano!                        │
│  Tvůj tréninkový přehled            │
├─────────────────────────────────────┤
│  [Action Required] (pokud existuje) │
├─────────────────────────────────────┤
│  [HeroStats - Kredit + Trénink]     │
├─────────────────────────────────────┤
│  [Quick Stats - 3 metriky]          │
├─────────────────────────────────────┤
│  [Overall Performance Card]         │
├─────────────────────────────────────┤
│  [Quick Actions]                    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🏆 Žebříček            [Zobrazit]│ │  ← NOVÁ KARTA
│ │ Srovnej se s ostatními          │ │
│ │                                 │ │
│ │ 💪 Síla (12)    ⚡ Plyo (5)     │ │
│ │ ❤️ Kardio (8)                   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  [Active Challenges] (pokud existují)│
└─────────────────────────────────────┘
```

## Detailní kroky implementace

### Krok 1: Vytvořit novou komponentu LeaderboardPreviewCard
**Nový soubor:** `src/components/client-portal/dashboard/LeaderboardPreviewCard.tsx`

Kompaktní karta s:
- Ikonou žebříčku a nadpisem
- Souhrnem kategorií (síla, plyometrika, kardio) s počtem cviků
- Tlačítkem "Zobrazit vše" které otevře modální okno s kompletním žebříčkem
- Využije existující komponenty z `/leaderboard/`

### Krok 2: Upravit ClientPortalOverview
**Soubor:** `src/pages/client-portal/ClientPortalOverview.tsx`

Přidat `LeaderboardPreviewCard` pod Quick Actions:
```javascript
// Existující importy...
import { LeaderboardPreviewCard } from '@/components/client-portal/dashboard/LeaderboardPreviewCard';

// V JSX - před ActiveChallengeWidget
{clientId && <LeaderboardPreviewCard />}
```

### Krok 3: Zjednodušit stránku Soutěže
**Soubor:** `src/pages/client-portal/ClientPortalCompetitions.tsx`

Odstranit záložky a přímo zobrazit pouze Výzvy:
- Odstranit Tabs komponentu
- Odstranit import LeaderboardContent
- Zachovat pouze ChallengesContent

### Krok 4: Aktualizovat navigační odkazy
**Soubor:** `src/components/client-portal/dashboard/OverallPerformanceCard.tsx`

Změnit odkaz z `/zona/competitions?tab=leaderboard` na otevření modálního okna nebo přechod na dedikovanou stránku žebříčku.

### Krok 5: Případně přejmenovat "Soutěže" na "Výzvy"
**Soubor:** `src/components/client-portal/ClientPortalLayout.tsx`

Zvážit přejmenování navigačního bodu:
```javascript
// Před
{ to: `${base}/competitions`, icon: Trophy, label: 'Soutěže' }
// Po  
{ to: `${base}/competitions`, icon: Trophy, label: 'Výzvy' }
```

---

## Technické detaily

### LeaderboardPreviewCard.tsx - Struktura

```typescript
import { useState } from 'react';
import { Trophy, Dumbbell, Heart, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useExercisesWithPercentiles } from '@/hooks/useExercisePercentiles';
import ClientPortalLeaderboard from '@/pages/client-portal/ClientPortalLeaderboard';

// Kompaktní karta s přehledem kategorií
// Po kliknutí otevře Sheet s kompletním žebříčkem
// Použije existující ExerciseComparisonGrid komponenty
```

### Upravený ClientPortalCompetitions.tsx

```typescript
// Zjednodušená verze - pouze Výzvy
import { lazy, Suspense } from 'react';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';

const ChallengesContent = lazy(() => import('./ClientPortalChallenges'));

export default function ClientPortalCompetitions() {
  useClientPortalPageTracking('client_portal_competitions');
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Výzvy</h1>
          <p className="text-sm text-muted-foreground">
            Plň výzvy a získávej body
          </p>
        </div>
      </div>
      
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ChallengesContent />
      </Suspense>
    </div>
  );
}
```

---

## Ovlivněné soubory

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/dashboard/LeaderboardPreviewCard.tsx` | **NOVÝ** - Kompaktní karta žebříčku s Sheet pro detail |
| `src/pages/client-portal/ClientPortalOverview.tsx` | Přidat LeaderboardPreviewCard |
| `src/pages/client-portal/ClientPortalCompetitions.tsx` | Odstranit záložku Žebříček, ponechat pouze Výzvy |
| `src/components/client-portal/ClientPortalLayout.tsx` | Přejmenovat "Soutěže" → "Výzvy" v navigaci |
| `src/components/client-portal/dashboard/OverallPerformanceCard.tsx` | Aktualizovat odkaz na žebříček |

## Výhody nového uspořádání

1. **Lepší přístupnost** - Žebříček přímo na dashboardu, klient nemusí hledat v submenu
2. **Čistší navigace** - "Výzvy" jako samostatný bod je jasnější než "Soutěže" se dvěma záložkami
3. **Konzistence** - Dashboard soustřeďuje všechny klíčové metriky a porovnání
