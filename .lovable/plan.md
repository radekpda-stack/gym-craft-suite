
# Redesign karty tréninku - kompletní návrh

## 1. Analýza současného stavu

### Aktuální struktura (shora dolů)
```text
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                     │
│  Avatar + Jméno + Meta (datum, čas, délka) + Status badge   │
│  Dropdown menu (Edit, Delete)                               │
├─────────────────────────────────────────────────────────────┤
│  EDIT MODE FORM (podmíněně) - glass panel                   │
├─────────────────────────────────────────────────────────────┤
│  CLIENT PROFILE PANEL - omezení, bolest, cíl                │
├─────────────────────────────────────────────────────────────┤
│  PREVIOUS FOLLOWUP ALERT (scheduled only)                   │
├─────────────────────────────────────────────────────────────┤
│  PARTICIPANTS MANAGER (scheduled/in_progress)               │
├─────────────────────────────────────────────────────────────┤
│  PREVIOUS TRAINING PREVIEW (collapsible)                    │
├─────────────────────────────────────────────────────────────┤
│  PARTICIPANTS PRs SECTION                                   │
├─────────────────────────────────────────────────────────────┤
│  COMPACT TAG GRID SELECTOR (glass) ← Již redesignováno ✓    │
├─────────────────────────────────────────────────────────────┤
│  WORKOUT EXERCISE MANAGER (glass)                           │
├─────────────────────────────────────────────────────────────┤
│  PAYMENT INFO (completed only)                              │
├─────────────────────────────────────────────────────────────┤
│  NOTE TOGGLE + INLINE TEXTAREA (glass)                      │
├─────────────────────────────────────────────────────────────┤
│  FOLLOWUP INPUT (glass)                                     │
├─────────────────────────────────────────────────────────────┤
│  FEEDBACK SECTION (completed only)                          │
└─────────────────────────────────────────────────────────────┘
```

### Identifikované problémy

| Problém | Dopad | Řešení |
|---------|-------|--------|
| **10+ oddělených glass panelů** | Vizuální fragmentace, těžké scanování | Sloučit do logických sekcí |
| **Nekonzistentní padding/spacing** | Nesourodý vzhled | Jednotný spacing systém |
| **Header zabírá hodně místa** | Méně prostoru pro důležité info | Kompaktnější header |
| **Status badge oddělený od akce** | Neefektivní workflow | Spojit status s akcí |
| **Příliš mnoho toggleů/collapsibles** | Skryté informace, více kliknutí | Chytřejší zobrazení |
| **Cviky vizuálně nevynikají** | Hlavní obsah není dominantní | Větší prominence |
| **Různé styly karet** | Nekonzistence | Unified card system |
| **Edit mode jako overlay** | Kontextový switch | Inline editing kde možné |

---

## 2. Nový design - "Training Cockpit"

### Design filosofie

1. **3 zóny** - Příprava (před), Akce (během), Uzavření (po)
2. **Prominence hlavního obsahu** - Cviky jako "main stage"
3. **Context-aware** - Zobrazit relevantní sekce podle stavu tréninku
4. **Unified glass aesthetic** - Jeden konzistentní styl
5. **Inline actions** - Minimální modaly/dialogy

### Nová struktura podle stavu tréninku

#### Scheduled (Naplánováno)
```text
┌─────────────────────────────────────────────────────────────┐
│  HERO HEADER (kompaktní)                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Jméno       Středa 29.1. v 16:00  [60 min] [1👤] │    │
│  │ ───────────────────────────────────────────────────  │    │
│  │ [💪 Silový] [Hypertrofie] [Střední] [Horní]  [⚙️]   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  PŘÍPRAVA (collapsible, default open)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️ Alert: Pozor na levé rameno                       │    │
│  │ 📝 Followup z minula: Zkontrolovat techniku deadlift │    │
│  │ 📊 Minulý trénink: 5 cviků, 3500kg objem [Expand]    │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  CVIKY (hlavní sekce)                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🏋️ Cviky (3)                           [+ Přidat]  │    │
│  │ ─────────────────────────────────────────────────── │    │
│  │ Bench Press  3×10 @ 80kg                  [expand] │    │
│  │ Squat        4×8 @ 100kg              🏆  [expand] │    │
│  │ Deadlift     3×5 @ 120kg                  [expand] │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  AKCE (sticky bottom na mobilu)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Zrušit trénink]           [▶️ Zahájit trénink]     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### Completed (Dokončeno)
```text
┌─────────────────────────────────────────────────────────────┐
│  HERO HEADER + Summary                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Jméno       Středa 29.1.        ✓ Dokončeno      │    │
│  │ 60 min • 5 cviků • 4200kg objem • RPE 7             │    │
│  │ [💪 Silový] [Hypertrofie] [Střední] [Horní]         │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  CVIKY (readonly)                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Bench Press  3×10 @ 80kg                    🏆 PR   │    │
│  │ Squat        4×8 @ 100kg                            │    │
│  │ ...                                                 │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  UZAVŘENÍ                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 💳 Platba: Zaplaceno • 800 Kč            [Změnit]   │    │
│  │ ─────────────────────────────────────────────────── │    │
│  │ 📝 Poznámka: "Skvělý trénink..."         [Upravit]  │    │
│  │ ─────────────────────────────────────────────────── │    │
│  │ 🔔 Připomenout příště: Technika deadliftu          │    │
│  │ ─────────────────────────────────────────────────── │    │
│  │ 💬 Zpětná vazba: [Sdílet odkaz]                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Nové komponenty

### A) TrainingHeroHeader
Kompaktní hero s inline tagy a meta info:

```text
┌─────────────────────────────────────────────────────────────┐
│ ┌────┐  Jana Nováková                      [•••]           │
│ │ JN │  ─────────────────────────────────────────          │
│ └────┘  St 29.1. v 16:00 • 60 min • 1 osoba                │
│                                                             │
│  [💪 Silový] [Hypertrofie] [Střední]    RPE: ●●●●●○○○○○    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NAPLÁNOVÁNO                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### B) TrainingPrepSection
Sloučená sekce pro přípravu (pouze scheduled):

```text
┌─────────────────────────────────────────────────────────────┐
│  PŘÍPRAVA NA TRÉNINK                          [Skrýt ▲]    │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ UPOZORNĚNÍ                                             │
│  Pozor na levé rameno - klient hlásí bolest               │
│                                                             │
│  📋 Z MINULA                                               │
│  • Zkontrolovat techniku deadliftu (vysoká priorita)       │
│  • Přidat více core práce                                  │
│                                                             │
│  📊 PŘEDCHOZÍ TRÉNINK (15.1.)                    [Detail]  │
│  5 cviků • 3500kg objem • RPE 6                           │
└─────────────────────────────────────────────────────────────┘
```

### C) WorkoutExerciseSection
Prominence cvikům - větší, hezčí:

```text
┌─────────────────────────────────────────────────────────────┐
│  🏋️ CVIKY                                      [+ Přidat] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Bench Press                               3 série    │  │
│  │ 80kg × 10, 80kg × 10, 85kg × 8                      │  │
│  │                                    [Upravit] [🗑️]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Squat                               🏆  4 série      │  │
│  │ 100kg × 8, 100kg × 8, 105kg × 6, 110kg × 4 PR       │  │
│  │                                    [Upravit] [🗑️]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  SHRNUTÍ: 5 cviků • 18 sérií • 4200 kg objem               │
└─────────────────────────────────────────────────────────────┘
```

### D) TrainingCloseSection
Sloučená sekce pro uzavření (pouze completed):

```text
┌─────────────────────────────────────────────────────────────┐
│  UZAVŘENÍ TRÉNINKU                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💳 PLATBA                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Zaplaceno • 800 Kč               [Změnit způsob]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  📝 POZNÁMKA                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Skvělý trénink, klient měl energii. Příště zvýšit   │  │
│  │ zátěž na bench...                      [Upravit ✏️]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  🔔 PŘIPOMENOUT PŘÍŠTĚ                           [Přidat]  │
│  • Zkontrolovat techniku deadliftu                         │
│                                                             │
│  💬 ZPĚTNÁ VAZBA                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Čeká na vyplnění            [Sdílet odkaz] [Kopírovat]│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### E) TrainingActionBar
Sticky action bar pro mobil:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Zrušit]                      [▶️ Zahájit trénink]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Unifikovaný design systém

### Spacing
```text
• Sekce padding: p-4 (16px)
• Mezi sekcemi: gap-4 (16px) - místo space-y-4
• Vnitřní prvky: gap-3 (12px)
• Kompaktní prvky: gap-2 (8px)
```

### Barvy podle stavu
```text
Scheduled:  bg-primary/5, border-primary/20
In Progress: bg-warning/5, border-warning/20
Completed:  bg-success/5, border-success/20
Cancelled:  bg-destructive/5, border-destructive/20
```

### Card style (unified)
```text
.training-section {
  @apply rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm;
}

.training-section-header {
  @apply flex items-center justify-between pb-3 border-b border-border/30;
}

.training-section-title {
  @apply text-sm font-semibold text-foreground uppercase tracking-wide;
}
```

---

## 5. Technická implementace

### Nové komponenty

| Komponenta | Účel |
|------------|------|
| `TrainingHeroHeader.tsx` | Kompaktní header s inline tagy a meta |
| `TrainingPrepSection.tsx` | Sloučená příprava (alerts + followups + previous) |
| `TrainingCloseSection.tsx` | Sloučené uzavření (payment + notes + followups + feedback) |
| `TrainingActionBar.tsx` | Sticky akční lišta |
| `TrainingSummaryStats.tsx` | Mini statistiky (cviky, série, objem) |

### Refaktor existujících

| Soubor | Změna |
|--------|-------|
| `TrainingDetailView.tsx` | Kompletní refaktor - použít nové sekce |
| `WorkoutExerciseManager.tsx` | Modernizovaný design, větší prominence |
| `PreviousTrainingPreview.tsx` | Integrovat do TrainingPrepSection |
| `FollowupInput.tsx` | Zjednodušit, inline přidat |
| `ClientProfilePanel.tsx` | Integrovat do TrainingPrepSection |

### Odstranit/sloučit
- Samostatný glass panel pro poznámku → do CloseSection
- Samostatný panel pro followupy → do CloseSection
- Oddělený participants manager → inline v header/prep

---

## 6. Wireframe finálního designu

### Mobile view (scheduled)
```text
┌─────────────────────────────┐
│ ← Zpět        Jana Nováková │
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │ 👤 Jana Nováková      │  │
│  │ St 29.1. v 16:00      │  │
│  │ 60 min • 1 osoba      │  │
│  │                       │  │
│  │ [💪][Hypertrofie]     │  │
│  │ [Střední][Horní]      │  │
│  │                       │  │
│  │ ┌───────────────────┐ │  │
│  │ │   NAPLÁNOVÁNO     │ │  │
│  │ └───────────────────┘ │  │
│  └───────────────────────┘  │
│                             │
│  PŘÍPRAVA           [Hide]  │
│  ───────────────────────    │
│  ⚠️ Pozor na rameno         │
│  📋 Followup: technika DL   │
│  📊 Minule: 5 cv, 3500kg    │
│                             │
│  CVIKY              [+Add]  │
│  ───────────────────────    │
│  ┌───────────────────────┐  │
│  │ Bench Press    3×10   │  │
│  │ @ 80kg                │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Squat 🏆       4×8    │  │
│  │ @ 100kg               │  │
│  └───────────────────────┘  │
│                             │
│                             │
├─────────────────────────────┤
│ [Zrušit]    [▶️ Zahájit]   │
└─────────────────────────────┘
```

---

## 7. Implementační kroky

### Fáze 1: Nové komponenty (~2h)
1. `TrainingHeroHeader.tsx` - kompaktní header
2. `TrainingSummaryStats.tsx` - mini statistiky
3. `TrainingActionBar.tsx` - sticky actions

### Fáze 2: Sloučené sekce (~2h)
4. `TrainingPrepSection.tsx` - příprava
5. `TrainingCloseSection.tsx` - uzavření

### Fáze 3: Integrace (~1.5h)
6. Refaktor `TrainingDetailView.tsx`
7. Modernizovat `WorkoutExerciseManager.tsx`

### Fáze 4: Polish (~1h)
8. Animace a micro-interactions
9. Mobile optimalizace
10. Testování edge cases

---

## 8. Očekávané výsledky

| Metrika | Před | Po |
|---------|------|-----|
| Počet oddělených panelů | 10+ | 4 |
| Vertikální scroll | ~150vh | ~100vh |
| Kliknutí pro základní akce | 3-4 | 1-2 |
| Vizuální konzistence | Nízká | Vysoká |
| Prominence cviků | Střední | Vysoká |
| Mobile UX | Přijatelná | Skvělá |

---

## 9. Časový odhad

**Celkem: ~6.5 hodiny**

- TrainingHeroHeader: 45 min
- TrainingSummaryStats: 20 min  
- TrainingActionBar: 30 min
- TrainingPrepSection: 60 min
- TrainingCloseSection: 60 min
- Refaktor TrainingDetailView: 90 min
- WorkoutExerciseManager modernizace: 45 min
- Polish a testování: 60 min
