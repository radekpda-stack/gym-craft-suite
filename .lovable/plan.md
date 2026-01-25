
# Kompletní UX Audit: Klientský Portál

## Executive Summary

Klientský portál ("Zóna") je funkčně bohatá aplikace s kvalitním základem, ale trpí několika UX problémy typickými pro organicky rostlé produkty:
- **Rozptýlená navigace** - 9 položek v bottom baru je příliš mnoho
- **Vizuální nekonzistence** - různé styly karet, spacing, typography
- **Kognitivní přetížení** - příliš mnoho informací na dashboardu
- **Nejasná hierarchie** - klient neví, co je důležité vs. nice-to-have

---

## A) KRITICKÉ PROBLÉMY (High Priority)

### A1. Navigace: 9 položek je příliš mnoho

**Současný stav:**
Přehled | Deník | Pokrok | Chat | Žebříček | Výzvy | Odznaky | Nákupy | Nastavení

**Problém:**
- Na mobilu se musí scrollovat horizontálně
- Uživatel netuší, co je kde
- Gamifikace zabírá 3/9 = 33% navigace (Žebříček, Výzvy, Odznaky)

**Návrh:**
```
Primární (4 položky):
  Přehled | Deník | Pokrok | Chat

Sekundární (v "Více" menu nebo v Settings):
  Žebříček + Výzvy + Odznaky → sloučit do "Soutěže"
  Nákupy → přesunout do Settings tab
  Nastavení → zůstává
```

**Výsledek:** 5 položek - Přehled | Deník | Pokrok | Chat | Více

---

### A2. Dashboard: Příliš mnoho widgetů bez jasné priority

**Současný stav:**
1. Header (Ahoj, Tomáši!)
2. Period Chips (7/30/90 dní)
3. ClientActionRequired
4. HeroStatsRow (Kredit + Další trénink)
5. ClientQuickActions (3-5 tlačítek)
6. TrainingCalendar
7. ActiveChallengeWidget

**Problém:**
- 7 sekcí na jedné stránce
- Period Chips většina klientů nepoužívá
- Kalendář zabírá prostor, ale málo přidává hodnotu

**Návrh - "Rychlý Přehled":**
```
Zone 1: Hero (vždy viditelná)
  - Credit card + Next Training (stávající HeroStatsRow - OK)
  - Případně streak badge

Zone 2: Action Required (podmíněně)
  - Pouze pokud existují úkoly (feedback, prediagnostic)
  - Jinak schovat

Zone 3: Quick Stats (3 čísla)
  - Tréninků tento měsíc | PRs celkem | Série

Zone 4: Smart Shortcuts
  - "+ Trénink" a "+ Strava" pouze pokud klient používá
  - Jinak schovat

Odstranit:
  - Period Chips (přesunout pouze na Progress stránku)
  - Calendar (přesunout do Deníku jako horní widget)
  - ActiveChallengeWidget (přesunout do Soutěže)
```

---

### A3. Deník: Nejasná struktura Tréninky vs. Strava

**Současný stav:**
- Tabs "Tréninky" | "Strava"
- Dlouhý empty state s animací
- "Tréninky od trenéra" collapsible

**Problémy:**
- 2 různé CTA: "Přidat svůj trénink" vs. nápis v empty state
- Collapsible sekce je matoucí
- Empty state příliš roztáhlý

**Návrh:**
```
Header: "Můj deník" + Tabs zůstávají

Workout Tab:
  - Jednoduchý CTA: "📝 Přidat aktivitu"
  - Pokud existují trenérské tréninky:
      Inline banner: "💡 Máš X naplánovaných tréninků od trenéra"
      (ne collapsible, rovnou seznam)
  - Seznam dokončených aktivit (stávající)

Empty state:
  - Zjednodušit: icon + 2 řádky textu + 1 tlačítko
  - Bez animovaného pulze, bez badge gridu
```

---

## B) STŘEDNÍ PRIORITY (Medium)

### B1. Progress stránka: Přetížená informacemi

**Současný stav:**
9 sekcí na jedné stránce:
1. Header + Period Filter
2. ClientPortalPRsCard
3. ClientExerciseBenchmarks
4. ClientPortalPaceTrendCard
5. Info tip
6. ProgressSummaryCards
7. MeasurementsHistoryCard
8. WeightChart + BodyFatChart
9. AllExercisesChart
10. Cardio section

**Návrh:**
```
Reorganizovat do tabů:
  [Přehled] | [Měření] | [Cviky] | [Cardio]

Tab "Přehled":
  - Quick summary: PRs count, Weight change, Best lifts
  - Top 3 PRs

Tab "Měření":
  - Weight + BodyFat charts
  - MeasurementsHistoryCard

Tab "Cviky":
  - AllExercisesChart
  - ClientExerciseBenchmarks

Tab "Cardio":
  - Pace Trend
  - Rowing + Running charts
```

---

### B2. Settings: Dobře strukturované, ale příliš textové

**Současný stav:**
3 taby: Profil | Soukromí | Účet

**Návrh:**
- OK struktura
- Zmenšit font v popisech switchů
- Přidat ikony k switch labels pro rychlejší sken
- Odstranit info banner v Privacy (je zjevné z UI)

---

### B3. Chat: Chybí indikátor "píše..."

**Návrh:**
- Přidat typing indicator
- Přidat "Doručeno" / "Přečteno" stavy viditelněji

---

## C) NÍZKÉ PRIORITY (Nice-to-have)

### C1. Vizuální konzistence

**Problémy:**
- Různé border-radius (rounded-lg, rounded-xl, rounded-2xl)
- Různé paddingy (p-2, p-3, p-4, p-6)
- Gradient cards vs. solid cards

**Návrh - Design Tokens:**
```css
/* Standardizovat */
--card-radius: 16px;       /* rounded-2xl */
--card-padding: 16px;      /* p-4 */
--section-gap: 24px;       /* space-y-6 */
--widget-gap: 12px;        /* gap-3 */
```

---

### C2. Empty States

**Současný stav:** Každá stránka má jiný styl empty state

**Návrh:** Unifikovat do komponenty `EmptyState`:
```tsx
<EmptyState
  icon={<Dumbbell />}
  title="Zatím žádné záznamy"
  description="Přidej svůj první trénink"
  action={{ label: "Přidat", onClick: ... }}
/>
```

---

### C3. Micro-interakce

**Chybí:**
- Haptic feedback na důležité akce (submit, complete)
- Success animations při dokončení výzvy
- Skeleton loading konzistence

---

## D) IMPLEMENTAČNÍ PLÁN

### Fáze 1: Navigace a Dashboard (1-2 dny)

| Úkol | Soubor | Popis |
|------|--------|-------|
| 1.1 | ClientPortalLayout.tsx | Sloučit Žebříček+Výzvy+Odznaky do "Soutěže" |
| 1.2 | ClientPortalLayout.tsx | Přidat "Více" dropdown pro Nákupy + Settings |
| 1.3 | ClientPortalOverview.tsx | Odstranit Period Chips |
| 1.4 | ClientPortalOverview.tsx | Odstranit Calendar (přesunout do Diary) |
| 1.5 | HeroStatsRow.tsx | Přidat streak badge inline |
| 1.6 | Vytvořit | ClientQuickStats.tsx - 3 metriky v řadě |

### Fáze 2: Deník a Empty States (1 den)

| Úkol | Soubor | Popis |
|------|--------|-------|
| 2.1 | ClientPortalWorkoutDiary.tsx | Zjednodušit empty state |
| 2.2 | ClientPortalWorkoutDiary.tsx | Přidat kalendář jako horní widget |
| 2.3 | Vytvořit | EmptyState.tsx - sdílená komponenta |
| 2.4 | Aplikovat | EmptyState všude |

### Fáze 3: Progress Reorganizace (1 den)

| Úkol | Soubor | Popis |
|------|--------|-------|
| 3.1 | ClientPortalProgress.tsx | Přidat Tabs strukturu |
| 3.2 | Přesunout | Komponenty do správných tabů |
| 3.3 | Vytvořit | ProgressOverviewTab.tsx - top 3 PR summary |

### Fáze 4: Vizuální Polish (1 den)

| Úkol | Soubor | Popis |
|------|--------|-------|
| 4.1 | Všechny karty | Sjednotit border-radius na rounded-2xl |
| 4.2 | Všechny karty | Sjednotit padding na p-4 |
| 4.3 | Settings | Zmenšit font popisů, přidat ikony |
| 4.4 | Chat | Přidat typing indicator |

---

## E) WIREFRAMES

### Dashboard - Nová struktura:

```text
┌─────────────────────────────────────┐
│  Ahoj, Tomáši!                      │
│  Tvůj tréninkový přehled     🔥 4w  │
└─────────────────────────────────────┘

┌─────────────────┐ ┌─────────────────┐
│ 💳 Kredit       │ │ 📅 Další trénink│
│ 2 500 Kč        │ │ Zítra 10:00     │
└─────────────────┘ └─────────────────┘

┌─────────────────────────────────────┐
│ ⚡ Quick Stats                      │
│  12 tréninků  │  8 PRs  │  4w série │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ + Přidat trénink    + Přidat váhu   │
└─────────────────────────────────────┘
```

### Navigace - Nová struktura:

```text
Mobile Bottom Bar (5 items):
┌───────────────────────────────────────┐
│ 🏠 │ 📖 │ 📈 │ 💬 │ ••• │
│Přeh│Dení│Pokr│Chat│Více │
└───────────────────────────────────────┘

"Více" dropdown:
┌──────────────────┐
│ 🏆 Soutěže       │
│ 🛒 Nákupy        │
│ ⚙️ Nastavení     │
└──────────────────┘
```

---

## F) METRIKY ÚSPĚCHU

Po implementaci sledovat:
1. **Time to task** - jak rychle klient najde co hledá
2. **Bounce rate** - kolik klientů odejde bez akce
3. **Feature discovery** - kolik % klientů použije Soutěže/Odznaky
4. **Session depth** - kolik stránek navštíví za session

---

## G) TECHNICKÉ POZNÁMKY

### Zachovat:
- Framer Motion animace (dobře implementované)
- Sheet pro Credit detail (dobrý pattern)
- Glassmorphism estetika

### Refaktorovat:
- Sjednotit Card styling do utility třídy
- Vytvořit `client-portal-tokens.css` pro konzistenci
- Přidat `useClientPortalNavigation` hook pro centrální routing
