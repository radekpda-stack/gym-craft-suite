
# Plán: Zjednodušení zadávání jídla pro klienty

## Shrnutí

Cílem je učinit zadávání jídla **rychlejší a přirozenější** - klient by měl zvládnout zapsat většinu jídel do 5 sekund. Aktuálně systém funguje na volném textu bez napovídání, což vede k nekonzistentním záznamům a pomalému zadávání.

---

## Navrhované změny

### 1. Inteligentní napovídání (Autocomplete)

Při psaní do pole "Co jsi jedl/a?" se budou **zobrazovat návrhy** z:
- Předchozích záznamů klienta
- Běžných českých jídel (základní preset)

| Příklad | Jak to funguje |
|---------|---------------|
| Klient píše "kur" | Nabídne se: "Kuřecí prsa", "Kuřecí řízek", "Kuřecí polévka" |
| Klient píše "ova" | Nabídne se: "Ovesná kaše", "Ovocný salát" |

### 2. Rozšíření "Nedávná jídla" na "Oblíbená jídla"

**Aktuální stav:**
- 5 posledních jedinečných jídel
- Nelze přidat do oblíbených

**Nový stav:**
- Sekce "Oblíbená" + "Nedávná"
- Možnost označit jídlo srdíčkem jako oblíbené
- Oblíbená se zobrazí jako první

### 3. Rychlé předvolby snídaně

Většina klientů má **opakující se snídaně**. Nabídnout 4-6 běžných předvoleb:

```
┌─────────────────────────────────────────┐
│  Rychlá snídaně                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🥣     │ │ 🍳     │ │ 🥐     │      │
│  │ Ovesná │ │Vajíčka │ │ Pečivo │      │
│  │ kaše   │ │        │ │        │      │
│  └────────┘ └────────┘ └────────┘      │
└─────────────────────────────────────────┘
```

### 4. Lepší specifikace množství

Přidat možnost zadat **přesnější množství** (volitelné):

| Aktuální | Nové (volitelné) |
|----------|------------------|
| Malá/Střední/Velká | + Gramáž (např. "150g") |
| | + Kusy (např. "2 vajíčka") |

### 5. Foto jídla (budoucí rozšíření)

Databáze již má sloupec `photo_url` - možnost vyfotit jídlo pro lepší přehled trenéra.

---

## Technické detaily

### Nové soubory

**1. `src/components/client-portal/nutrition/FoodAutocomplete.tsx`**
Komponenta s napovídáním:
```typescript
interface FoodAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  clientId: string;
  onSelectSuggestion: (food: { description: string; portion_size?: string }) => void;
}
```
- Použije `cmdk` (již nainstalován) pro command palette UI
- Hledá v historii klienta + základním presetu

**2. `src/components/client-portal/nutrition/QuickFoodPresets.tsx`**
Rychlé předvolby pro běžná jídla:
```typescript
const BREAKFAST_PRESETS = [
  { description: 'Ovesná kaše s ovocem', icon: '🥣', portion_size: 'medium' },
  { description: 'Míchaná vajíčka', icon: '🍳', portion_size: 'medium' },
  { description: 'Jogurt s müsli', icon: '🥛', portion_size: 'medium' },
  { description: 'Pečivo s máslem', icon: '🥐', portion_size: 'medium' },
  { description: 'Cottage cheese', icon: '🧀', portion_size: 'medium' },
];
```

### Úpravy existujících souborů

**1. `src/components/client-portal/nutrition/FoodLogForm.tsx`**

Nahradit `Textarea` za `FoodAutocomplete`:
```typescript
// Místo:
<Textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="např. kuřecí prsa, rýže, zelenina"
/>

// Nově:
<FoodAutocomplete
  value={description}
  onChange={setDescription}
  clientId={clientId}
  onSelectSuggestion={(food) => {
    setDescription(food.description);
    if (food.portion_size) setPortionSize(food.portion_size);
  }}
/>
```

Přidat volitelný vstup pro gramáž:
```typescript
// Po výběru porce - collapsible sekce
<div className="space-y-2">
  <Label className="text-xs text-muted-foreground">Přesnější množství (volitelné)</Label>
  <div className="flex gap-2">
    <Input
      type="number"
      value={grams}
      onChange={(e) => setGrams(e.target.value)}
      placeholder="gramů"
      className="w-24"
    />
    <span className="text-sm text-muted-foreground self-center">nebo</span>
    <Input
      value={unitsCount}
      onChange={(e) => setUnitsCount(e.target.value)}
      placeholder="počet"
      className="w-20"
    />
    <Input
      value={unitsLabel}
      onChange={(e) => setUnitsLabel(e.target.value)}
      placeholder="kusů/vajec/..."
      className="flex-1"
    />
  </div>
</div>
```

**2. `src/pages/client-portal/ClientPortalNutrition.tsx`**

Rozšířit sekci "Nedávná jídla":
```typescript
// Přidat hook pro oblíbená jídla
function useFavoriteFoods(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-favorite-foods', clientId],
    queryFn: async () => {
      // Načíst nejčastěji zadávaná jídla
      const { data } = await supabase
        .from('nutrition_food_entries')
        .select('description, meal_type, portion_size')
        .eq('client_id', clientId)
        .limit(100);
      
      // Spočítat frekvenci a vrátit top 5
      const counts = new Map<string, number>();
      // ...grouping logic
      return topFoods;
    },
  });
}
```

Přidat rychlé předvolby:
```typescript
// Pod quick meal buttons
{mealType === 'breakfast' && (
  <QuickFoodPresets 
    presets={BREAKFAST_PRESETS}
    onSelect={(preset) => handleQuickPresetFood(preset)}
  />
)}
```

**3. `src/hooks/useClientPortalNutrition.ts`**

Přidat hook pro historii jídel (pro autocomplete):
```typescript
export function useFoodHistory(clientId: string | undefined, search: string) {
  return useQuery({
    queryKey: ['food-history', clientId, search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
      const { data } = await supabase
        .from('nutrition_food_entries')
        .select('description, portion_size')
        .eq('client_id', clientId)
        .ilike('description', `%${search}%`)
        .limit(10);
      
      return data || [];
    },
    enabled: !!clientId && search.length >= 2,
  });
}
```

**4. `src/components/client-portal/nutrition/constants.ts`**

Přidat běžná česká jídla jako preset:
```typescript
export const COMMON_FOODS = [
  // Snídaně
  { description: 'Ovesná kaše', category: 'breakfast' },
  { description: 'Míchaná vajíčka', category: 'breakfast' },
  { description: 'Jogurt s müsli', category: 'breakfast' },
  { description: 'Pečivo s máslem', category: 'breakfast' },
  { description: 'Cottage cheese s ovocem', category: 'breakfast' },
  
  // Oběd/Večeře
  { description: 'Kuřecí prsa s rýží', category: 'main' },
  { description: 'Těstoviny s omáčkou', category: 'main' },
  { description: 'Salát s tuňákem', category: 'main' },
  { description: 'Řízek s bramborovým salátem', category: 'main' },
  { description: 'Polévka', category: 'main' },
  
  // Svačiny
  { description: 'Jablko', category: 'snack' },
  { description: 'Banán', category: 'snack' },
  { description: 'Ořechy', category: 'snack' },
  { description: 'Proteinová tyčinka', category: 'snack' },
] as const;
```

---

## Očekávaný výsledek

Po implementaci:

| Metrika | Před | Po |
|---------|------|-----|
| Čas na zadání běžného jídla | 15-20 sekund | 3-5 sekund |
| Konzistence záznamů | Nízká (duplicity) | Vysoká (napovídání) |
| Opakované zadávání | Ruční psaní | 1 klik (oblíbené) |
| Zadání snídaně | 4 kroky | 1 klik (preset) |

---

## Priorita implementace

| Priorita | Funkce | Důvod |
|----------|--------|-------|
| 🔴 Vysoká | Autocomplete z historie klienta | Největší úspora času |
| 🔴 Vysoká | Rozšíření "Nedávná jídla" (více položek) | Rychlé znovupřidání |
| 🟡 Střední | Preset běžných jídel | Pomáhá novým klientům |
| 🟡 Střední | Rychlé předvolby snídaně | Opakující se vzorec |
| 🟢 Nízká | Gramáž/kusy | Pokročilí uživatelé |
| 🟢 Nízká | Foto jídla | Budoucí rozšíření |

---

## Databázové změny

**Není potřeba měnit schéma** - sloupce `grams`, `units_count`, `units_label` již existují v tabulce `nutrition_food_entries`, jen se nepoužívají.
