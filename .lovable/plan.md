

# Zjednodušení navigace v sekci Výkonnost

## Problém
Aktuálně je potřeba projít minimálně 3-4 kroky k zápisu výkonu pro konkrétního klienta (Výkonnost → Deník → najít klienta → vybrat → zapsat). Hledání historie cviku vyžaduje podobně zdlouhavý postup.

## Řešení: Univerzální Command Bar (hledej klienta i cvik na jednom místě)

Rozšířit stávající `ExerciseSearchCommand` na **univerzální vyhledávač**, který hledá **současně klienty i cviky**. Uživatel napíše jméno klienta nebo název cviku a dostane okamžité výsledky s kontextovými akcemi.

### Jak to bude fungovat

```text
┌─────────────────────────────────┐
│ 🔍 Hledej klienta nebo cvik... │
├─────────────────────────────────┤
│ 👤 KLIENTI                     │
│   Jan Novák        [Zapsat] [→]│
│   Jana Kolářová    [Zapsat] [→]│
├─────────────────────────────────┤
│ 🏋 CVIKY                       │
│   Bench Press       [Zapsat] [→]│
│   Deadlift          [Zapsat] [→]│
├─────────────────────────────────┤
│ ⚡ RYCHLÉ AKCE                  │
│   Jan + Bench Press (dnes 14:30)│
│   Jana + Squat (včera)          │
└─────────────────────────────────┘
```

### Konkrétní změny

#### 1. `ExerciseSearchCommand.tsx` → `UniversalSearchCommand.tsx`
- Přidat `useClients()` hook do vyhledávače
- Nová sekce **"Klienti"** v CommandList — filtruje klienty podle hledaného textu
- Akce u klienta: **"Zapsat výkon"** (otevře QuickLogDialog s předvyplněným klientem) a **"Otevřít deník"** (přejde do Deník tabu s vybraným klientem)
- Akce u cviku: zachovat stávající **"Zapsat výkon"** + **"Detail cviku"**
- Nová sekce **"Nedávné kombinace"** — posledních 5 unikátních párů klient+cvik z `exercise_entries` pro jeden-tap re-logging

#### 2. `PerformanceHub.tsx`
- Nahradit `<ExerciseSearchCommand>` za `<UniversalSearchCommand>`
- Předat callback `onSelectClient` pro navigaci do Deníku s vybraným klientem
- Předat callback `onQuickLog` pro otevření QuickLogDialogu

#### 3. Nový hook `useRecentClientExercisePairs.ts`
- Dotaz na posledních 5 unikátních kombinací (client_id, exercise_id) z `exercise_entries`
- Joinuje jména klientů a cviků
- Cache 5 min

### Soubory

| Soubor | Změna |
|--------|-------|
| `ExerciseSearchCommand.tsx` → rename na `UniversalSearchCommand.tsx` | Přidat hledání klientů, nedávné páry, kontextové akce |
| `PerformanceHub.tsx` | Použít nový UniversalSearchCommand, předat callbacky |
| `useRecentClientExercisePairs.ts` | Nový hook — nedávné kombinace klient+cvik |
| `RecentExercisesChips.tsx` | Volitelně přidat i klientské chipy (top 3 nejaktivnější) |

Žádné DB změny. Čistě frontend.

