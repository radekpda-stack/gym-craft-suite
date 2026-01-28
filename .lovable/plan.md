

# Plán: Redesign karty Výkonnost (Performance Hub)

## 1. Shrnutí současného stavu

### Struktura

```text
Výkonnost (PerformanceHub)
├── Tab: Cviky (ExercisesContent)
│   ├── Sub-tab: Seznam (ExerciseListView)
│   ├── Sub-tab: Klient (ClientExercisesView)
│   └── Sub-tab: Analytika (ExerciseAnalyticsView)
│       ├── Síla (StrengthAnalyticsView)
│       ├── Kardio (CardioAnalyticsView)
│       └── Skill (SkillAnalyticsView)
├── Tab: Testy (TestsContent)
└── Tab: Výzvy (ChallengesContent)
```

### Identifikované problémy

| Problém | Oblast | Dopad |
|---------|--------|-------|
| **Příliš mnoho vnořených tabů** | UX | Ztížená orientace (3 úrovně: Cviky → Seznam/Klient/Analytika → Síla/Kardio/Skill) |
| **Chybí rychlý přehled** | UX | Po vstupu na stránku není jasné, co je důležité |
| **Pomalé hledání cviků** | UX | Musí se procházet přes akordeon kategorií |
| **Žádná rychlá cesta k zápisu** | Workflow | FAB odstraněn, tlačítko přidat záznam není prominentní |
| **Srovnání klientů skryté** | UX | Leaderboard je až na detailu cviku, ne na hlavní stránce |
| **Kategorie nejsou vizuálně odlišené** | Design | Síla/Kardio/Plyometrie vypadají stejně |
| **Progres klientů těžko dostupný** | Data | ClientExercisesView vyžaduje nejdřív vybrat klienta |

---

## 2. Navrhované změny

### 2.1 Nová struktura - zjednodušení na 2 hlavní pohledy

```text
Výkonnost (PerformanceHub)
├── [Hlavní pohled - default]
│   ├── KPI Bar (rychlý přehled)
│   ├── Rychlé hledání cviku (cmd+K style)
│   ├── Kategorie cviku (filtrovatelné karty)
│   │   ├── 💪 Síla
│   │   ├── ❤️ Kardio
│   │   └── ⚡ Plyometrie
│   └── Top 5 nejlepších klientů (mini-leaderboard)
│
├── [Detail cviku - /exercises/:id]
│   └── (beze změny - už funguje dobře)
│
└── [Testy & Výzvy - volitelné moduly]
```

### 2.2 Nové UI komponenty

#### A) Performance Dashboard Header

Kompaktní KPI bar v hlavičce:

```text
┌─────────────────────────────────────────────────────────────┐
│  🏋️ Výkonnost                          [🔍 Hledat] [+ Log]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 217 cviků   │ │ 1,842 zázn. │ │ 47 PR       │            │
│  │ v knihovně  │ │ tento měsíc │ │ tento měsíc │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

#### B) Quick Search - Command Palette Style

Nová komponenta pro rychlé vyhledávání cviku:

```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 Hledej cvik nebo klienta...                         ⌘K  │
├─────────────────────────────────────────────────────────────┤
│  NEDÁVNÉ                                                    │
│  ├── Bench Press           [💪 Síla]    [⏱️ 2 dny]          │
│  ├── Rowing 500m           [❤️ Kardio]  [⏱️ včera]          │
│  └── Box Jump              [⚡ Plyo]    [⏱️ 5 dní]          │
├─────────────────────────────────────────────────────────────┤
│  OBLÍBENÉ ⭐                                                │
│  ├── Squat                                                  │
│  └── Deadlift                                               │
└─────────────────────────────────────────────────────────────┘
```

#### C) Category Cards - Vizuálně odlišené kategorie

```text
┌─────────────────────────────────────────────────────────────┐
│  KATEGORIE CVIKŮ                                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│  │ 💪               │ │ ❤️               │ │ ⚡           │ │
│  │ SÍLA             │ │ KARDIO           │ │ PLYOMETRIE   │ │
│  │ 156 cviků        │ │ 38 cviků         │ │ 23 cviků     │ │
│  │ ──────────       │ │ ──────────       │ │ ──────────   │ │
│  │ 1,204 záznamů    │ │ 428 záznamů      │ │ 210 záznamů  │ │
│  │ bg: primary/10   │ │ bg: success/10   │ │ bg: amber/10 │ │
│  └──────────────────┘ └──────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### D) Client Progress Leaderboard

Na hlavní stránce zobrazit "Top 5 aktivních klientů":

```text
┌─────────────────────────────────────────────────────────────┐
│  🏆 TOP AKTIVNÍ KLIENTI (30 dní)               [Více →]     │
├─────────────────────────────────────────────────────────────┤
│  1. Jan Novák         48 záznamů   5 PR  ████████░░  +15%   │
│  2. Marie Králová     42 záznamů   3 PR  ███████░░░  +8%    │
│  3. Petr Svoboda      36 záznamů   2 PR  ██████░░░░  +12%   │
│  4. Eva Malinová      28 záznamů   1 PR  █████░░░░░  -5%    │
│  5. Jan Nový          22 záznamů   4 PR  ████░░░░░░  +22%   │
└─────────────────────────────────────────────────────────────┘
```

#### E) Quick Log FAB (plovoucí tlačítko)

Vrátit plovoucí tlačítko na stránku Výkonnost (lokální FAB):

```text
┌────────────────────────────────────────────────────────────┐
│                                                             │
│                                              ┌────────────┐ │
│                                              │  + Zapsat  │ │
│                                              │   výkon    │ │
│                                              └────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Technická implementace

### Nové soubory

| Soubor | Účel |
|--------|------|
| `src/components/performance/PerformanceKPIBar.tsx` | KPI metriky v hlavičce |
| `src/components/performance/ExerciseSearchCommand.tsx` | Cmd+K style hledání |
| `src/components/performance/CategoryCards.tsx` | Vizuální kategorie cviků |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Top klienti + progres |
| `src/hooks/usePerformanceOverview.ts` | Agregovaná data pro dashboard |

### Úpravy existujících souborů

| Soubor | Změna |
|--------|-------|
| `src/pages/PerformanceHub.tsx` | Nový layout s dashboard komponentami |
| `src/components/performance/ExercisesContent.tsx` | Zjednodušit na 2 pohledy (Knihovna / Analytika) |
| `src/components/exercises/ExerciseListView.tsx` | Optimalizovat pro rychlé procházení |
| `src/components/exercises/ClientExercisesView.tsx` | Přidat multi-client comparison mode |

---

## 4. Data flow

### Nový hook `usePerformanceOverview`

```typescript
interface PerformanceOverview {
  // KPI
  totalExercises: number;
  totalEntriesThisMonth: number;
  totalPRsThisMonth: number;
  
  // Category breakdown
  categories: {
    strength: { count: number; entries: number };
    cardio: { count: number; entries: number };
    plyometric: { count: number; entries: number };
  };
  
  // Top clients
  topClients: {
    id: string;
    name: string;
    entriesCount: number;
    prCount: number;
    trend: number; // % change vs previous period
  }[];
  
  // Recent exercises
  recentExercises: {
    id: string;
    name: string;
    category: 'strength' | 'cardio' | 'plyometric';
    lastUsed: string;
  }[];
}
```

---

## 5. Srovnání před/po

### Před

- 3 úrovně navigace (taby v tabech v tabech)
- Hledání cviku vyžaduje projít filtry a akordeon
- Srovnání klientů pouze na detailu cviku
- Všechny kategorie vypadají stejně
- Žádný přehled "co se děje"

### Po

- 2 jasné pohledy: Dashboard + Detail
- Cmd+K style rychlé hledání odkudkoli
- Top klienti viditelní na hlavní stránce
- Vizuálně odlišené kategorie (Síla/Kardio/Plyo)
- KPI bar dává okamžitý přehled
- Plovoucí tlačítko pro rychlý zápis

---

## 6. Wireframe nového layoutu

```text
┌─────────────────────────────────────────────────────────────┐
│  [💪 Výkonnost]                                             │
│  Cviky, testy a výzvy na jednom místě                       │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔍 Rychle hledat cvik nebo klienta...              ⌘K │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 217      │ │ 1,842    │ │ 47       │                     │
│  │ cviků    │ │ záznamů  │ │ PR       │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
├─────────────────────────────────────────────────────────────┤
│  [Knihovna cviků] [Analytika] [Testy] [Výzvy]               │
├─────────────────────────────────────────────────────────────┤
│  KATEGORIE                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 💪 SÍLA    │ │ ❤️ KARDIO  │ │ ⚡ PLYO     │            │
│  │ 156 cviků  │ │ 38 cviků   │ │ 23 cviků   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  🏆 TOP KLIENTI (30 dní)                          [Více →]  │
│  ────────────────────────────────────────────────────────── │
│  1. Jan Novák       48 zázn.  5 PR  ████████░░  ↑15%        │
│  2. Marie K.        42 zázn.  3 PR  ███████░░░  ↑8%         │
│  3. Petr S.         36 zázn.  2 PR  ██████░░░░  ↑12%        │
├─────────────────────────────────────────────────────────────┤
│  📋 NEDÁVNO POUŽITÉ CVIKY                                   │
│  ────────────────────────────────────────────────────────── │
│  Bench Press  •  Rowing 500m  •  Box Jump  •  Squat         │
│                                                             │
│                                              ┌────────────┐ │
│                                              │  + Zapsat  │ │
│                                              └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Časový odhad

| Fáze | Čas |
|------|-----|
| PerformanceKPIBar + usePerformanceOverview | 30 min |
| ExerciseSearchCommand (Cmd+K) | 45 min |
| CategoryCards | 20 min |
| ClientProgressLeaderboard | 30 min |
| Refaktor PerformanceHub layout | 25 min |
| Plovoucí tlačítko + integrace | 10 min |
| Testování a ladění | 20 min |

**Celkem: ~3 hodiny**

---

## 8. Bonusová vylepšení (volitelná)

1. **Multi-client comparison mode** - vybrat 2-3 klienty a porovnat jejich progres na stejném cviku
2. **Keyboard shortcuts** - Ctrl+N pro nový záznam, Ctrl+K pro hledání
3. **Export leaderboardu** - PDF/XLSX s porovnáním klientů
4. **Trend sparklines** - mini grafy v leaderboardu ukazující 30denní trend

