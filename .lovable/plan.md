
# Redesign klientského portálu - Deník tréninků a Strava

## 1. Analýza současného stavu

### Struktura deníku (Workout Diary)
```text
ClientPortalWorkoutDiary.tsx
├── Header (ikona + text)
├── Tabs: Tréninky | Strava
│
├── Tab: Tréninky
│   ├── TrainingCalendar (kompaktní)
│   ├── Button "Přidat svůj trénink" (full-width)
│   ├── Plánované tréninky od trenéra (list)
│   └── Moje záznamy (SimpleWorkoutCard list)
│
└── Tab: Strava (lazy load → ClientPortalNutrition)
    ├── WeekStrip (7 dní)
    ├── WaterGoalWidget + CaffeineWindowWidget
    ├── DayNoteInput
    ├── Quick Stats (3 boxy: jídla/voda/kávy)
    ├── Quick Actions (4×2 grid)
    │   ├── Snídaně/Oběd/Večeře/Svačina
    │   ├── Rychlé vody (3 tlačítka)
    │   ├── Káva/Čaj
    │   └── Nedávná jídla (chips)
    └── TodayEntries (timeline)
```

### Identifikované problémy

| Problém | Oblast | Dopad |
|---------|--------|-------|
| **Přetížené UI** | Strava | Příliš mnoho tlačítek a sekcí na jedné obrazovce |
| **Nekonzistentní design** | Celkově | Různé styly karet, badgů a tlačítek |
| **Malé touch targety** | Mobile | Některá tlačítka jsou těžko kliknutelná |
| **Chybí vizuální hierarchie** | Oba taby | Není jasné, co je primární akce |
| **Monotónní barvy** | Strava | Všechny meal typy vypadají podobně |
| **Komplikovaný flow přidání** | Tréninky | 3 kroky v dialogu jsou příliš |
| **Chybí gamifikace** | Celkově | Žádné vizuální odměny za aktivitu |
| **WeekStrip příliš malý** | Strava | Těžko čitelný na mobilu |
| **Timeline nepřehledná** | Strava | Dlouhý seznam bez vizuálního členění |

---

## 2. Nový design - principy

### Design philosophy

1. **"Swipe & Tap" first** - Primární akce jedním tapem
2. **Visual delight** - Barvy, animace, micro-rewards
3. **Progressive disclosure** - Nejdříve jednoduché, detail na vyžádání
4. **Gamifikace** - Streak, progress rings, celebrace

### Barevný systém pro typy jídel

```text
🌅 Snídaně  → Warm gradient (amber-50 to orange-100)
☀️ Oběd    → Bright gradient (yellow-50 to amber-100)  
🌙 Večeře  → Cool gradient (indigo-50 to purple-100)
🍎 Svačina → Fresh gradient (green-50 to emerald-100)
💧 Voda    → Blue gradient (sky-50 to blue-100)
☕ Káva    → Brown gradient (stone-50 to amber-100)
```

---

## 3. Nové komponenty

### A) Diary Hero Header

Kompaktní hero s denním přehledem:

```text
┌─────────────────────────────────────────────────────────────┐
│  📔 Dnešní den              Středa 29. ledna                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Progress ring: 3/5 aktivit ████████░░ 60%            │   │
│  │ "Zbývají 2 aktivity"                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  🔥 5 dní v řadě                     💪 12 tréninků celkem  │
└─────────────────────────────────────────────────────────────┘
```

### B) Quick Action Floating Buttons

Plovoucí tlačítka pro rychlé přidání:

```text
                                    ┌─────────────────┐
                                    │ 🍽️ + Jídlo     │
                                    │ 💧 + Voda      │
                                    │ 💪 + Trénink   │
                                    └─────────────────┘
                                         ┌───┐
                                         │ + │ ← FAB
                                         └───┘
```

### C) Modernized WeekStrip

Větší, čitelnější s vizuálním feedbackem:

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ Po  │ │ Út  │ │ St  │ │ Čt  │ │ Pá  │ │ So  │ │ Ne  │   │
│  │ 27  │ │ 28  │ │ 29  │ │ 30  │ │ 31  │ │  1  │ │  2  │   │
│  │ ●●● │ │ ●●  │ │ ◌   │ │     │ │     │ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                  ▲ DNES                                     │
└─────────────────────────────────────────────────────────────┘

● = dokončené jídlo/aktivita, počet teček = počet záznamů
```

### D) Meal Quick Cards

Velké, tapnutelné karty s gradientem:

```text
┌─────────────────────────────────────────────────────────────┐
│  PŘIDAT ZÁZNAM                                              │
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ 🌅                     │ │ ☀️                     │      │
│  │ Snídaně                │ │ Oběd                   │      │
│  │ (gradient amber)       │ │ (gradient yellow)      │      │
│  │ 7:00 - 10:00          │ │ 11:00 - 14:00         │      │
│  └────────────────────────┘ └────────────────────────┘      │
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ 🌙                     │ │ 🍎                     │      │
│  │ Večeře                 │ │ Svačina                │      │
│  │ (gradient indigo)      │ │ (gradient green)       │      │
│  │ 17:00 - 21:00         │ │ kdykoli                │      │
│  └────────────────────────┘ └────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### E) Hydration Ring Widget

Kruhový progress místo progress baru:

```text
┌───────────────────────────────────┐
│          💧                       │
│       ╭──────╮                    │
│      /   72%  \                   │
│     |  1.5L   |    Quick add:     │
│      \       /     [+200] [+300]  │
│       ╰──────╯     [+500]         │
│                                   │
│   Cíl: 2.0L  |  Zbývá: 0.5L      │
└───────────────────────────────────┘
```

### F) Timeline Cards (Food Log)

Modernizované karty s gradientem:

```text
┌─────────────────────────────────────────────────────────────┐
│  DNEŠNÍ ZÁZNAMY                                             │
│                                                             │
│  07:32  ┌──────────────────────────────────────────────┐   │
│         │ 🌅 Snídaně                  [střední porce]  │   │
│         │ Ovesná kaše s banánem                        │   │
│         │ ┌─────────────────────────────────────┐      │   │
│         │ │ 💬 Trenér: "Skvělá volba!" ⭐⭐⭐⭐⭐ │      │   │
│         │ └─────────────────────────────────────┘      │   │
│         └──────────────────────────────────────────────┘   │
│                                                             │
│  10:15  ┌──────────────────────────────────────────────┐   │
│         │ 💧 Voda                            300ml     │   │
│         └──────────────────────────────────────────────┘   │
│                                                             │
│  12:45  ┌──────────────────────────────────────────────┐   │
│         │ ☀️ Oběd                     [velká porce]    │   │
│         │ Kuřecí prsa s rýží                           │   │
│         └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### G) Workout Quick Add (zjednodušený)

Místo 3-krokového dialogu - 1 obrazovka:

```text
┌─────────────────────────────────────────────────────────────┐
│  💪 Přidat trénink                                    [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Typ aktivity:                                              │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                   │
│  │🏋️    │ │🏃    │ │🚴    │ │🏊    │                   │
│  │Síla  │ │Běh   │ │Kolo  │ │Plavba│                   │
│  └───────┘ └───────┘ └───────┘ └───────┘                   │
│                                                             │
│  Délka:  [15] [30] [45] [60] [90] min                      │
│                                                             │
│  Jak to šlo?  😩 😕 😐 😊 🔥                               │
│                                                             │
│  Poznámka (volitelné):                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ✓ Uložit trénink                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Implementační plán

### Fáze 1: Základní komponenty (nové soubory)

| Soubor | Účel |
|--------|------|
| `src/components/client-portal/common/DiaryHeroHeader.tsx` | Denní hero s progress ring |
| `src/components/client-portal/common/FloatingQuickAdd.tsx` | FAB menu pro rychlé přidání |
| `src/components/client-portal/nutrition/ModernWeekStrip.tsx` | Větší, čitelnější týdenní strip |
| `src/components/client-portal/nutrition/MealQuickCards.tsx` | Gradient karty pro typy jídel |
| `src/components/client-portal/nutrition/HydrationRingWidget.tsx` | Kruhový progress pro vodu |
| `src/components/client-portal/nutrition/ModernFoodCard.tsx` | Modernizovaná karta jídla |
| `src/components/client-portal/workout-diary/QuickWorkoutSheet.tsx` | Zjednodušený formulář |

### Fáze 2: Refaktor hlavních stránek

| Soubor | Změna |
|--------|-------|
| `ClientPortalWorkoutDiary.tsx` | Integrace nových komponent, zjednodušení layoutu |
| `ClientPortalNutrition.tsx` | Modernizace UI, FloatingQuickAdd |
| `TodayEntries.tsx` | Použití ModernFoodCard místo starých karet |
| `SimpleFoodForm.tsx` | Modernizace s gradientem a lepším UX |

### Fáze 3: Animace a micro-interactions

- Framer Motion animace při přidání záznamu
- Confetti při dosažení denního cíle vody
- Streak celebration při konzistentní aktivitě
- Haptic feedback (vibrace) na mobilech

---

## 5. Wireframe nového layoutu

### Deník - Tab Tréninky

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📔 Středa 29. ledna              🔥 5 dní streak     │  │
│  │ ████████░░ 3/5 aktivit                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Tento týden                                           │  │
│  │ [Po●●] [Út●] [St◌] [Čt] [Pá] [So] [Ne]               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  OD TRENÉRA                                     Zobrazit → │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🏋️ Silový trénink              Dnes 16:00           │  │
│  │ Bench, Squat, Deadlift            [Splnit ✓]         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  MOJE ZÁZNAMY                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🏃 Běh           dnes 07:15           45 min  🔥     │  │
│  │ 5.2 km @ 5:30/km                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                                        ┌────────────────┐   │
│                                        │  + Trénink    │   │
│                                        └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Deník - Tab Strava

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🍽️ Středa 29. ledna              ✓ 3/4 jídla        │  │
│  │ Zbývá večeře                                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ Po  │ │ Út  │ │ St  │ │ Čt  │ │ Pá  │ │ So  │ │ Ne  │  │
│  │ ●●● │ │ ●●  │ │ ●   │ │     │ │     │ │     │ │     │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                                             │
│  ┌──────────────────┐ ┌─────────────────────────────────┐  │
│  │    ╭────╮        │ │  PŘIDAT JÍDLO                   │  │
│  │   /      \       │ │  ┌───────┐ ┌───────┐            │  │
│  │  │  72%   │      │ │  │🌅     │ │☀️     │            │  │
│  │  │ 1.5L   │      │ │  │Snídaně│ │Oběd   │            │  │
│  │   \      /       │ │  └───────┘ └───────┘            │  │
│  │    ╰────╯        │ │  ┌───────┐ ┌───────┐            │  │
│  │   [+💧]          │ │  │🌙     │ │🍎     │            │  │
│  └──────────────────┘ │  │Večeře │ │Svačina│            │  │
│                       │  └───────┘ └───────┘            │  │
│                       └─────────────────────────────────┘  │
│                                                             │
│  DNEŠNÍ ZÁZNAMY                                             │
│  ────────────────────────────────────────────────────────── │
│  07:32  🌅 Ovesná kaše s banánem          střední porce    │
│         💬 "Skvělá volba!" ⭐⭐⭐⭐⭐                       │
│  ────────────────────────────────────────────────────────── │
│  10:15  💧 Voda                                    300ml   │
│  ────────────────────────────────────────────────────────── │
│  12:45  ☀️ Kuřecí prsa s rýží              velká porce    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technické detaily

### Nové CSS utility třídy

```css
/* Gradient backgrounds for meal types */
.meal-gradient-breakfast { @apply bg-gradient-to-br from-amber-50 to-orange-100; }
.meal-gradient-lunch { @apply bg-gradient-to-br from-yellow-50 to-amber-100; }
.meal-gradient-dinner { @apply bg-gradient-to-br from-indigo-50 to-purple-100; }
.meal-gradient-snack { @apply bg-gradient-to-br from-green-50 to-emerald-100; }

/* Touch-friendly targets */
.touch-target-lg { @apply min-h-[56px] min-w-[56px]; }

/* Progress ring */
.progress-ring { ... } /* SVG-based circular progress */
```

### Framer Motion animace

```typescript
// Vstupní animace pro karty
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

// Celebrace při dokončení
const celebrationVariants = {
  initial: { scale: 0 },
  animate: { scale: [0, 1.2, 1], transition: { type: 'spring' } },
};
```

---

## 7. Očekávané výsledky

### Před vs Po

| Metrika | Před | Po |
|---------|------|-----|
| Tap-y pro přidání jídla | 4-5 | 2 |
| Vizuální hierarchie | Slabá | Jasná |
| Touch target size | 40px | 56px+ |
| Barevná diferenciace | Minimální | Výrazná |
| Gamifikace | Žádná | Streak + progress |
| Animace | Základní | Micro-interactions |

### UX vylepšení

1. **Rychlejší logging** - Floating Action Button pro okamžité přidání
2. **Vizuální odměny** - Streak badge, progress ring, celebrace
3. **Lepší čitelnost** - Větší fonty, kontrastní barvy
4. **Konzistentní design** - Unified card system s gradienty
5. **Mobile-first** - Větší touch targety, gesture support

---

## 8. Časový odhad

| Fáze | Čas |
|------|-----|
| DiaryHeroHeader + ModernWeekStrip | 40 min |
| MealQuickCards + HydrationRingWidget | 45 min |
| ModernFoodCard (timeline) | 30 min |
| FloatingQuickAdd (FAB) | 25 min |
| QuickWorkoutSheet (zjednodušený) | 35 min |
| Integrace do hlavních stránek | 45 min |
| Animace a micro-interactions | 30 min |
| Testování a ladění | 30 min |

**Celkem: ~4.5 hodiny**
