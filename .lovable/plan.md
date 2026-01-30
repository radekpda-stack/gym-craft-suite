
# Makronutrienty a kalorie v trenérském rozhraní

## Přehled změn

Rozšíříme trenérský pohled o zobrazení kalorií a makroživin z AI analýzy, a to jak pro jídla, tak pro tréninky. Tyto údaje se také propíší do PDF exportu.

---

## Současný stav vs. cílový

| Oblast | Současný stav | Cílový stav |
|--------|---------------|-------------|
| **Jídla v trenér view** | Zobrazuje popis, porci, kvalitu | + kalorie, bílkoviny, sacharidy, tuky |
| **Denní souhrn** | Počty jídel, vody, kávy | + celkové kalorie, makra za den |
| **Tréninky klienta** | Typ, délka, cviky | + spálené kalorie (z AI) |
| **PDF export** | Základní tabulky jídel | + nutriční hodnoty, denní souhrny |

---

## Architektura změn

```text
┌──────────────────────────────────────────────────────────────────┐
│                     TRENÉRSKÝ POHLED                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ DENÍK NÁVYKŮ - Klient XY                                   │ │
│  │                                                             │ │
│  │ 📊 DENNÍ SOUHRN (25.1.2026)                                │ │
│  │ ───────────────────────────────────────────────────────────│ │
│  │ 🍽️ Příjem:  ~1850 kcal                                     │ │
│  │    Bílkoviny: 125g • Sacharidy: 180g • Tuky: 65g          │ │
│  │ 🏋️ Výdej:    ~420 kcal (trénink)                          │ │
│  │ ⚖️ Bilance:  ~1430 kcal                                    │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ JÍDLA                                                      │ │
│  │                                                             │ │
│  │ ┌───────────────────────────────────────────────────────┐  │ │
│  │ │ 08:30 | 🌅 Snídaně                                    │  │ │
│  │ │ Ovesná kaše s ovocem                                  │  │ │
│  │ │ ~420 kcal • 12g B • 65g S • 8g T                     │  │ │
│  │ └───────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │ ┌───────────────────────────────────────────────────────┐  │ │
│  │ │ 12:30 | ☀️ Oběd                                       │  │ │
│  │ │ Kuřecí prsa s rýží                                    │  │ │
│  │ │ ~520 kcal • 45g B • 55g S • 12g T                    │  │ │
│  │ └───────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ VLASTNÍ TRÉNINKY KLIENTA                                   │ │
│  │                                                             │ │
│  │ ┌───────────────────────────────────────────────────────┐  │ │
│  │ │ 💪 Silový trénink                    25.1.2026        │  │ │
│  │ │ 45 min • 🔥 ~320 kcal                                 │  │ │
│  │ └───────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Databázové změny

### 1. Rozšíření `nutrition_food_entries` o makronutrienty

Aby AI mohla uložit konkrétní hodnoty k jednotlivým záznamům (ne jen k šablonám):

```sql
ALTER TABLE public.nutrition_food_entries
ADD COLUMN IF NOT EXISTS calories integer,
ADD COLUMN IF NOT EXISTS protein_g numeric(5,1),
ADD COLUMN IF NOT EXISTS carbs_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fat_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fiber_g numeric(5,1),
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz;
```

Tím zajistíme, že každý záznam jídla bude mít vlastní nutriční hodnoty.

---

## Technická implementace

### 1. Update AI Edge Function

Rozšíříme `ai-nutrition-enrichment` aby kromě šablony aktualizoval i konkrétní entry:

```typescript
// Přidat entryId do inputu a aktualizovat i jednotlivý záznam
if (entryId) {
  await supabase
    .from('nutrition_food_entries')
    .update({
      calories: avgCalories,
      protein_g: nutritionData.protein_g,
      carbs_g: nutritionData.carbs_g,
      fat_g: nutritionData.fat_g,
      ai_enriched: true,
      ai_enriched_at: new Date().toISOString(),
    })
    .eq('id', entryId);
}
```

### 2. Rozšíření NutritionFoodCard

Přidáme props pro nutriční hodnoty a zobrazíme je pod popisem:

```typescript
interface NutritionFoodCardProps {
  // ... stávající props
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ai_enriched?: boolean;
}

// V renderování přidat:
{calories && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
    <span className="font-medium text-foreground">~{calories} kcal</span>
    {protein_g && <span>{protein_g}g B</span>}
    {carbs_g && <span>{carbs_g}g S</span>}
    {fat_g && <span>{fat_g}g T</span>}
    {ai_enriched && <Sparkles className="w-3 h-3 text-primary" />}
  </div>
)}
```

### 3. Komponenta denního souhrnu kalorií

Nová komponenta `NutritionDaySummary.tsx` pro trenérský pohled:

```typescript
interface DayNutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesBurned: number;  // Z workout_logs
  entriesWithData: number;
  totalEntries: number;
}

function NutritionDaySummary({ 
  foodEntries, 
  workoutLogs,
  date 
}: Props) {
  const summary = useMemo(() => {
    // Sečíst všechny nutrienty z jídel daného dne
    // + spálené kalorie z tréninků
  }, [foodEntries, workoutLogs]);
  
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">🍽️ Příjem: ~{summary.totalCalories} kcal</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalProtein}g B • {summary.totalCarbs}g S • {summary.totalFat}g T
            </p>
          </div>
          {summary.caloriesBurned > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium">🔥 Výdej: ~{summary.caloriesBurned} kcal</p>
              <p className="text-xs text-muted-foreground">
                Bilance: ~{summary.totalCalories - summary.caloriesBurned} kcal
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. Zobrazení kalorií u tréninků

Rozšířit `ClientSelfWorkoutsCard.tsx` a `WorkoutLogItem`:

```typescript
// V WorkoutLogItem přidat zobrazení spálených kalorií
{log.calories_burned && (
  <span className="flex items-center gap-1">
    <Flame className="w-3 h-3 text-orange-500" />
    {log.calories_burned} kcal
  </span>
)}
```

### 5. Rozšíření PDF exportu

Upravit `exportToPDF` v `NutritionClientDetail.tsx`:

```typescript
// V summary sekci přidat celkové nutrienty za období
const periodNutrition = calculatePeriodNutrition(entries.food);
const summaryData = [
  // ... stávající položky
  ['Celkem kalorií (odhad)', `~${periodNutrition.totalCalories} kcal`],
  ['Celkem bílkovin', `${periodNutrition.totalProtein}g`],
  ['Celkem sacharidů', `${periodNutrition.totalCarbs}g`],
  ['Celkem tuků', `${periodNutrition.totalFat}g`],
];

// V denní tabulce jídel přidat sloupec "Kcal"
const foodData = dayFood.map(e => [
  e.entry_time?.slice(0, 5) || '-',
  mealTypeLabels[e.meal_type],
  e.description,
  e.calories ? `~${e.calories}` : '-',  // Nový sloupec
  portionLabels[e.portion_size] || '-',
]);

autoTable(doc, {
  head: [['Čas', 'Typ', 'Popis', 'Kcal', 'Porce']],
  body: foodData,
  // ...
});
```

---

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `supabase/migrations/...` | VYTVOŘIT | Přidat sloupce do `nutrition_food_entries` |
| `supabase/functions/ai-nutrition-enrichment/index.ts` | UPRAVIT | Aktualizovat i jednotlivé entry |
| `src/components/nutrition/NutritionFoodCard.tsx` | UPRAVIT | Přidat zobrazení nutrientů |
| `src/components/nutrition/NutritionDaySummary.tsx` | VYTVOŘIT | Denní souhrn kalorií |
| `src/pages/NutritionClientDetail.tsx` | UPRAVIT | Integrovat souhrn, upravit PDF export |
| `src/components/clients/ClientSelfWorkoutsCard.tsx` | UPRAVIT | Zobrazit spálené kalorie |
| `src/hooks/useClientWorkoutLogs.ts` | UPRAVIT | Přidat `calories_burned` do interface |

---

## Vizuální návrh PDF exportu

```text
┌──────────────────────────────────────────────────────────────┐
│                  DENÍK NÁVYKŮ - Jan Novák                   │
│         Období: 20.1. - 30.1.2026                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ SOUHRN (10 dní)                                             │
│ ─────────────────────────────────────────────────────────── │
│ Celkem jídel:              42                               │
│ Celkem kalorií (odhad):    ~18,500 kcal                     │
│ Celkem bílkovin:           ~950g                            │
│ Celkem sacharidů:          ~1,800g                          │
│ Celkem tuků:               ~620g                            │
│ Průměr kalorií/den:        ~1,850 kcal                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ PONDĚLÍ 20.1.2026                                           │
│ Denní příjem: ~1,920 kcal • 130g B • 195g S • 68g T        │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Čas   │ Typ     │ Popis              │ Kcal  │ Porce  │  │
│ ├───────┼─────────┼────────────────────┼───────┼────────┤  │
│ │ 08:30 │ Snídaně │ Ovesná kaše        │ ~420  │ Střední│  │
│ │ 12:15 │ Oběd    │ Kuřecí s rýží      │ ~580  │ Velká  │  │
│ │ 18:45 │ Večeře  │ Salát s tuňákem    │ ~450  │ Střední│  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Trénink: 45 min silový • 🔥 ~320 kcal spáleno              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Logika výpočtu denních nutrientů

```typescript
function calculateDayNutrition(foodEntries: FoodEntry[]): DayNutrition {
  const entriesWithData = foodEntries.filter(e => e.calories && e.ai_enriched);
  
  return {
    totalCalories: foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
    totalProtein: foodEntries.reduce((sum, e) => sum + (e.protein_g || 0), 0),
    totalCarbs: foodEntries.reduce((sum, e) => sum + (e.carbs_g || 0), 0),
    totalFat: foodEntries.reduce((sum, e) => sum + (e.fat_g || 0), 0),
    coverage: entriesWithData.length / foodEntries.length, // Procento pokrytí AI daty
    isEstimate: entriesWithData.length < foodEntries.length,
  };
}
```

---

## Důležité poznámky

1. **Postupné obohacování**: Starší záznamy nebudou mít nutriční data. UI bude zobrazovat "~" a "(odhad)" pro jasnost.

2. **Fallback na šablony**: Pokud entry nemá vlastní data, pokusíme se je načíst z odpovídající šablony v `nutrition_meal_templates`.

3. **AI indikátor**: Záznamy obohacené AI budou mít ikonu ✨ (Sparkles) pro transparentnost.

4. **Workout kalorie**: Sloupec `calories_burned` již existuje v DB, jen ho zobrazíme v UI.

---

## Shrnutí workflow

1. **Klient zadá jídlo** → AI na pozadí doplní nutrienty
2. **Trenér otevře deník klienta** → vidí kalorie a makra u každého jídla
3. **Trenér vidí denní souhrn** → příjem vs. výdej (pokud klient trénoval)
4. **Trenér exportuje PDF** → obsahuje nutriční data za celé období
5. **Trenér vidí tréninky klienta** → včetně spálených kalorií
