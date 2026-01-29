
# Vylepšení sekce "Žebříček" v klientském portálu

## Analýza současného stavu

### Co funguje dobře:
- Pozitivní rámování (positive framing) - nikdy nehodnotíme negativně
- Hierarchické filtry podle pohlaví a věku
- Přehledná vizualizace percentilů s animovaným gauže
- Gamifikační sekce s XP a levely
- Anonymita klientů ve výchozím nastavení

### Co chybí z pohledu klienta:

| Oblast | Problém | Dopad |
|--------|---------|-------|
| **Přehlednost** | Mnoho cviků najednou → přehlcení | Klient se ztratí |
| **Motivace k pokroku** | Nevidím historii svého zlepšení | Chybí pocit růstu |
| **Cíle** | Nemám co "honit" | Chybí směr |
| **Celebrace** | Jen statické zobrazení | Málo emocí |
| **Porovnání** | Vím kde jsem, ale ne kde bych měl být | Nejasný cíl |

---

## Návrh vylepšení

### 1. Nový "Hero" dashboard s rychlým přehledem

Nahradit stávající `OverallPositionHero` rozšířenou verzí:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────────┐   CELKOVÁ POZICE                                      │
│  │             │                                                        │
│  │   72%ile    │   🏆 Mezi nejlepšími!                                  │
│  │  ┌─────┐    │                                                        │
│  │  │ ⭐ │     │   Tvá síla: Dřep 💪                                    │
│  │  └─────┘    │   Příležitost: Bench Press 🌱                         │
│  │             │                                                        │
│  └─────────────┘   ┌───────┐ ┌───────┐ ┌───────┐                       │
│                    │ +12%  │ │  4    │ │  8    │                        │
│                    │za měsíc│ │ PRs   │ │tréninků│                      │
│                    └───────┘ └───────┘ └───────┘                        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  🎯 DALŠÍ CÍL: Dostaň se do TOP 25% v Bench Press                      │
│     Aktuálně 42% → Potřebuješ +8 kg na max                             │
│     [████████░░░░░░] 72% k cíli                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Klíčové prvky:**
- Trend změny percentilu (měsíc k měsíci)
- Počet PR za období
- Konkrétní cíl s progress barem
- Kalkulace kolik kg/sekund chybí do dalšího milestone

---

### 2. Kategorizace cviků s lepší navigací

Přidat "Quick Stats" karty pro každou kategorii před mřížkou:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏋️ SÍLA (12 cviků)                                                     │
│                                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                        │
│ │ Ø Percentil │ │ TOP cvik    │ │ Největší    │                        │
│ │             │ │             │ │   pokrok    │                        │
│ │   68%       │ │ Dřep        │ │ Mrtvý tah   │                        │
│ │  ▲+5%       │ │ 92%ile      │ │ +15% měsíc  │                        │
│ └─────────────┘ └─────────────┘ └─────────────┘                        │
│                                                                         │
│ [Zobrazit všechny cviky ▼]                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Přínosy:**
- Na první pohled vidím stav celé kategorie
- Nemusím procházet všechny cviky jednotlivě
- Motivace vidět "největší pokrok"

---

### 3. Vylepšené karty cviků s historií

Přidat do rozbalené karty cviku mini-graf historie:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏋️ DŘEP                                    ⭐ Mezi nejlepšími (78%)    │
│                                                                         │
│ Tvůj max: 120 kg                                                        │
│                                                                         │
│ ┌─ Tvůj vývoj za poslední 3 měsíce ─────────────────────────────────┐  │
│ │                                                         ●  120kg   │  │
│ │                                               ●                    │  │
│ │                                    ●                               │  │
│ │                          ●                                         │  │
│ │              ●                                                     │  │
│ │    ●                                                               │  │
│ │ říjen      listopad      prosinec      leden                       │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ 🎯 K dalšímu levelu potřebuješ: +7 kg (na 127 kg = TOP 10%)            │
│                                                                         │
│ ─── Žebříček ─────────────────────────────────────────────────────────  │
│ 1. 🥇 Silný Lev     145 kg                                             │
│ 2. 🥈 Rychlý Orel   138 kg                                             │
│ 3. 🥉 Fit Vlk       130 kg                                             │
│ ...                                                                     │
│ 5. ⭐ Ty            120 kg  ← jsi tady                                 │
│ ...                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Nové prvky:**
- Mini sparkline graf vývoje za 3 měsíce
- "K dalšímu levelu" s konkrétní hodnotou
- Zvýraznění pozice klienta v žebříčku

---

### 4. "Milestones" sekce - Cíle k dosažení

Nová motivační sekce ukazující blízké milníky:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎯 BLÍZKÉ CÍLE                                                          │
│                                                                         │
│ ┌──────────────────────────────────────────────────┐                   │
│ │ 🏋️ Dřep → TOP 10%                               │                   │
│ │ Aktuálně 78% | Potřebuješ +7 kg                  │                   │
│ │ [████████████████░░] 87% k cíli                  │                   │
│ └──────────────────────────────────────────────────┘                   │
│                                                                         │
│ ┌──────────────────────────────────────────────────┐                   │
│ │ 🏃 Běh 5km → Nad průměrem                        │                   │
│ │ Aktuálně 42% | Zlepši čas o 45s                  │                   │
│ │ [████████░░░░░░░░░░] 45% k cíli                  │                   │
│ └──────────────────────────────────────────────────┘                   │
│                                                                         │
│ ┌──────────────────────────────────────────────────┐                   │
│ │ ⚡ Celkově → TOP 25%                             │                   │
│ │ Aktuálně 68% | Zlepši 2 cviky                    │                   │
│ │ [██████████████░░░░] 72% k cíli                  │                   │
│ └──────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5. "Hype" celebrace při posunu v žebříčku

Přidat detekci a oslavu zlepšení:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        🎉 GRATULUJEME! 🎉                              │
│                                                                         │
│              Posunul ses v DŘEPU o 3 místa nahoru!                     │
│                                                                         │
│                    15. místo → 12. místo                               │
│                                                                         │
│               Jsi teď v TOP 24% (byl jsi 31%)                          │
│                                                                         │
│                      [🏆 Super! Pokračuji]                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Trigger události:**
- Posun o 2+ místa v žebříčku
- Překročení percentilové hranice (25%, 50%, 75%, 90%)
- Nové PR

---

### 6. Přehlednější gamifikační sekce

Vytvořit vizuálně atraktivnější sekci s XP a levely:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚡ GAMIFIKACE                                                           │
│                                                                         │
│ ┌─── TVŮ PROFIL ──────────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │  LEVEL 7: ŠAMPION                                                   ││
│ │  [████████████████░░░░░░░░] 2,450 / 3,000 XP                        ││
│ │  Do dalšího levelu: 550 XP                                          ││
│ │                                                                      ││
│ │  🔥 Streak: 6 týdnů   |   🏆 PRs: 14   |   ⭐ Odznaky: 8            ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─── TOP 5 XP ŽEBŘÍČEK ───────────────────────────────────────────────┐│
│ │ 🥇 Silný Lev      Lvl 9   4,250 XP                                  ││
│ │ 🥈 Rychlý Orel    Lvl 8   3,890 XP                                  ││
│ │ 🥉 Fit Vlk        Lvl 8   3,720 XP                                  ││
│ │ 4. Odhodlaný Tygr Lvl 7   2,890 XP                                  ││
│ │ ⭐ 5. Ty          Lvl 7   2,450 XP ← jsi tady                       ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ [Zobrazit všechny žebříčky ▼]                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technické změny

### Nové komponenty:

| Komponenta | Účel |
|------------|------|
| `LeaderboardHeroEnhanced.tsx` | Rozšířený hero s trendy a cílem |
| `CategoryQuickStats.tsx` | Rychlý přehled kategorie |
| `ExerciseProgressChart.tsx` | Mini sparkline graf vývoje |
| `MilestonesSection.tsx` | Sekce s blízkými cíli |
| `RankUpCelebration.tsx` | Celebrační overlay při posunu |
| `GamificationProfileCard.tsx` | Vylepšená gamifikační karta |

### Úpravy existujících komponent:

| Soubor | Změna |
|--------|-------|
| `ClientPortalLeaderboard.tsx` | Nový layout s milestones a quick stats |
| `ExerciseComparisonGrid.tsx` | Přidat sekci "Category Quick Stats" před grid |
| `ExerciseCard (v ExerciseComparisonGrid)` | Přidat sparkline a "k dalšímu levelu" |
| `OverallPositionHero.tsx` | Přidat trend a konkrétní cíl |
| `GamificationSection.tsx` | Vizuální redesign na "profile card" |

### Nové hooky:

| Hook | Účel |
|------|------|
| `useExerciseProgress` | Historie max hodnot cviku za období |
| `useMilestones` | Výpočet nejbližších dosažitelných cílů |
| `useRankChanges` | Detekce změn v pořadí pro celebrace |

### Databázové změny:

**Nová tabulka pro historii percentilů:**
```sql
CREATE TABLE client_percentile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  exercise_name TEXT NOT NULL,
  percentile INTEGER NOT NULL,
  best_value NUMERIC NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(client_id, exercise_name, recorded_at)
);
```

---

## Shrnutí vylepšení

| Oblast | Před | Po |
|--------|------|-----|
| **Přehlednost** | Všechny cviky najednou | Quick stats + rozbalovací sekce |
| **Motivace** | Statický percentil | Trend + historie + cíle |
| **Cíle** | Jen "kde jsem" | "Kam směřuji" s konkrétními čísly |
| **Celebrace** | Žádné | Animované overlay při posunu |
| **Gamifikace** | Skrytá v collapsible | Prominentní profil karta |

**Hlavní přínosy pro klienta:**
1. Na první pohled vidím svůj pokrok (trend)
2. Mám konkrétní cíle k dosažení (milestones)
3. Vidím historii svého zlepšení (sparkline grafy)
4. Dostávám emocionální feedback (celebrace)
5. Gamifikace je přehlednější a motivačnější
