
# Kompletní redesign Tréninkového deníku a Deníku na jídlo

## Shrnutí současného stavu

| Oblast | Současný stav | Problém |
|--------|---------------|---------|
| **Tréninkové karty** | Základní Card s rozbalením | Málo vizuálně přitažlivé, komentář trenéra skryt v rozbalení |
| **Jídelní záznamy** | Časová osa s malými kartami | Komentáře trenéra nejsou dostatečně prominentní |
| **Vizuální styl** | Funkční ale zastaralý | Chybí premium estetika, gradienty, animace |
| **Mobile UX** | Základní touch cíle | Malé prvky, chybí haptic feedback |

---

## Vizuální návrh - Nové karty

### 1. Vylepšená karta tréninku (EnhancedWorkoutCard)

```text
┌──────────────────────────────────────────────────────────────┐
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ 🏃 gradient-to-br from-success/10 via-background       │ │
│ │                                        to-success/5    │ │
│ │  ┌──────┐                                              │ │
│ │  │ 🏃‍♂️  │  Běh                           Včera 18:30  │ │
│ │  │ icon │  45 min • 5.2 km • 8:38/km           😊     │ │
│ │  └──────┘                                              │ │
│ │                                                        │ │
│ │  "Cítil jsem se skvěle, dal jsem si negative splits"  │ │
│ │                                                        │ │
│ │  ┌──────────────────────────────────────────────────┐ │ │
│ │  │ 💬 KOMENTÁŘ OD TRENÉRA                  před 2h  │ │ │
│ │  │ ──────────────────────────────────────────────── │ │ │
│ │  │ Super! Negative splits jsou přesně to, co        │ │ │
│ │  │ chceme. Příště zkus o trochu rychlejší start.    │ │ │
│ │  │                                                  │ │ │
│ │  │ [───── Odpovědět ─────]                         │ │ │
│ │  └──────────────────────────────────────────────────┘ │ │
│ ╰─────────────────────────────────────────────────────────╯ │
└──────────────────────────────────────────────────────────────┘
```

### 2. Vylepšená karta jídla (EnhancedFoodCard)

```text
┌──────────────────────────────────────────────────────────────┐
│ ╭─────────────────────────────────────────────────────────╮ │
│ │ bg-gradient-to-br from-warning/10 to-amber-500/5       │ │
│ │                                                        │ │
│ │  ┌──────┐  12:30 • 🍽️ Oběd                    💚     │ │
│ │  │ 🥗   │                                             │ │
│ │  │ foto │  Kuřecí prsa s rýží a zeleninou             │ │
│ │  └──────┘  📏 Střední • 😊 Akorát                     │ │
│ │                                                        │ │
│ │  ┌──────────────────────────────────────────────────┐ │ │
│ │  │ ⭐ 8/10 │ 💬 Skvělá volba! Přidej víc zeleniny.  │ │ │
│ │  │         │                              [Odpovědět]│ │ │
│ │  └──────────────────────────────────────────────────┘ │ │
│ ╰─────────────────────────────────────────────────────────╯ │
└──────────────────────────────────────────────────────────────┘
```

### 3. Vylepšený denní přehled (DaySummaryHeader)

```text
┌──────────────────────────────────────────────────────────────┐
│ DNEŠEK - Pátek 30. ledna                                    │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │ 🍽️  4      │ │ 💧 1.8L   │ │ ☕  2      │ │ ✓ Zkont.   │ │
│ │ jídla      │ │ ze 2.5L   │ │ kávy      │ │ trenérem   │ │
│ │ ───────────│ │ ═══════░░░│ │           │ │            │ │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 💬 Celkový komentář od trenéra k tomuto dni:            ││
│ │ "Dobrý den, více zeleniny a méně cukru odpoledne."      ││
│ │                                          [Odpovědět]    ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## Klíčové designové principy

### Premium estetika

| Prvek | Implementace |
|-------|-------------|
| **Gradienty** | `bg-gradient-to-br from-{color}/10 via-background to-{color}/5` |
| **Stíny** | `shadow-sm hover:shadow-md` s jemnými přechody |
| **Zaoblení** | `rounded-2xl` (16px) pro hlavní karty, `rounded-xl` (12px) pro vnitřní |
| **Backdrop blur** | `backdrop-blur-sm` pro plovoucí vrstvy |
| **Animace** | Framer Motion pro vstupy a interakce |

### Prominentní komentáře trenéra

```typescript
// Komentář trenéra VŽDY viditelný - nikdy neschovaný v rozbalení
{trainerComment && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/20"
  >
    <div className="flex items-center gap-2 mb-2">
      <MessageSquare className="w-4 h-4 text-primary" />
      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
        Komentář od trenéra
      </span>
      <span className="text-xs text-muted-foreground ml-auto">
        {formatRelative(commentDate)}
      </span>
    </div>
    <p className="text-sm">{trainerComment}</p>
    
    {!clientReply && (
      <Button variant="ghost" size="sm" className="mt-2 text-primary">
        <Reply className="w-3.5 h-3.5 mr-1.5" />
        Odpovědět
      </Button>
    )}
  </motion.div>
)}
```

---

## Nové komponenty

### Tréninkový deník

| Komponenta | Účel |
|------------|------|
| `EnhancedWorkoutCard.tsx` | NOVÁ - Prémiová karta tréninku s prominentním komentářem |
| `WorkoutDaySummary.tsx` | NOVÁ - Denní shrnutí s metrikami a poznámkou trenéra |
| `WorkoutTimelineGroup.tsx` | NOVÁ - Seskupení tréninků podle dne |

### Deník na jídlo

| Komponenta | Účel |
|------------|------|
| `EnhancedFoodCard.tsx` | NOVÁ - Prémiová karta jídla s hodnocením a komentářem |
| `EnhancedDrinkCard.tsx` | NOVÁ - Karta nápoje se stejným stylem |
| `DaySummaryHeader.tsx` | NOVÁ - Denní přehled s progress ring pro vodu |
| `TrainerDayFeedback.tsx` | NOVÁ - Prominentní denní komentář od trenéra |

---

## Technická implementace

### 1. EnhancedWorkoutCard.tsx

```typescript
// Hlavní struktura
interface EnhancedWorkoutCardProps {
  entry: UnifiedDiaryEntry;
  onDelete?: () => void;
  onReply?: (reply: string) => Promise<void>;
}

// Klíčové prvky:
// 1. Gradient pozadí podle typu aktivity
// 2. Větší ikona v kruhovém kontejneru
// 3. Metriky v kompaktních badges
// 4. Komentář trenéra VŽDY viditelný (ne v rozbalení)
// 5. Reply tlačítko přímo pod komentářem
// 6. Haptic feedback na interakce
```

### 2. EnhancedFoodCard.tsx

```typescript
// Hlavní struktura  
interface EnhancedFoodCardProps {
  entry: FoodEntry;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: (reply: string) => Promise<void>;
}

// Klíčové prvky:
// 1. Barevné kódování podle typu jídla (snídaně amber, oběd yellow, večeře indigo)
// 2. Quality indikátor jako výrazný badge
// 3. Hodnocení trenéra (hvězdičky) prominentně
// 4. Komentář s možností okamžité odpovědi
```

### 3. Barevné schéma podle typu jídla

```typescript
const MEAL_GRADIENTS = {
  breakfast: 'from-amber-500/10 to-orange-500/5',
  lunch: 'from-yellow-500/10 to-amber-500/5', 
  dinner: 'from-indigo-500/10 to-violet-500/5',
  snack: 'from-emerald-500/10 to-green-500/5',
};

const MEAL_ICONS = {
  breakfast: { emoji: '🌅', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  lunch: { emoji: '☀️', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  dinner: { emoji: '🌙', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  snack: { emoji: '🍎', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};
```

### 4. Integrace do stránek

```typescript
// ClientPortalWorkoutDiary.tsx
// Nahradit SimpleWorkoutCard za EnhancedWorkoutCard
{completedEntries.map((entry) => (
  <EnhancedWorkoutCard
    key={entry.id}
    entry={entry}
    onDelete={entry.is_coached ? undefined : () => handleDeleteWorkout(entry)}
    onReply={entry.trainer_comment ? handleReplyToComment : undefined}
  />
))}

// ClientPortalNutrition.tsx / TodayEntries.tsx
// Nahradit inline karty za EnhancedFoodCard
{timeline.map((item) => {
  if (item.type === 'food') {
    return (
      <EnhancedFoodCard 
        key={item.id}
        entry={item.data}
        onEdit={() => onEditFood(item.data)}
        onReply={handleReplyToFoodComment}
      />
    );
  }
  // ...
})}
```

---

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/components/client-portal/workout-diary/EnhancedWorkoutCard.tsx` | VYTVOŘIT | Prémiová karta tréninku |
| `src/components/client-portal/workout-diary/WorkoutDaySummary.tsx` | VYTVOŘIT | Denní shrnutí |
| `src/components/client-portal/nutrition/EnhancedFoodCard.tsx` | VYTVOŘIT | Prémiová karta jídla |
| `src/components/client-portal/nutrition/EnhancedDrinkCard.tsx` | VYTVOŘIT | Prémiová karta nápoje |
| `src/components/client-portal/nutrition/DaySummaryHeader.tsx` | VYTVOŘIT | Denní přehled s metrikami |
| `src/pages/client-portal/ClientPortalWorkoutDiary.tsx` | UPRAVIT | Použít nové komponenty |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | UPRAVIT | Použít nové komponenty |

---

## Shrnutí klíčových změn

| Změna | Před | Po |
|-------|------|-----|
| **Komentář trenéra** | Skrytý v rozbalení | Vždy viditelný, prominentní |
| **Vizuální styl** | Základní Card | Gradient pozadí, zaoblené rohy, stíny |
| **Barevné kódování** | Minimální | Typ aktivity/jídla určuje barvu |
| **Odpověď klientu** | Skryté tlačítko | Vždy viditelné pod komentářem |
| **Animace** | Žádné | Framer Motion vstupy a přechody |
| **Touch UX** | Malé cíle | Větší touch targets + haptic feedback |
| **Denní shrnutí** | Základní počty | Progress ringy, metriky, status |
