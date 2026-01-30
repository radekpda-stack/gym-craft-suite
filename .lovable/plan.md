
# Databáze jídel - Inteligentní našeptávač a úspora času

## Shrnutí současného stavu

| Komponenta | Status | Využití |
|------------|--------|---------|
| `nutrition_food_entries` | Aktivní | Ukládá záznamy jídel klientů |
| `nutrition_meal_templates` | Existuje, ale PRÁZDNÁ | Nikde se nepoužívá v UI |
| `FoodAutocomplete` | Aktivní | Našeptává z historie klienta + statický seznam |
| `useRecentFoodEntries` | Aktivní | Zobrazuje 8 nejčastějších jídel klienta |

## Navrhované řešení

Využijeme **již existující** tabulku `nutrition_meal_templates` jako databázi oblíbených/častých jídel klienta. Jídla se budou automaticky ukládat při prvním zadání a při opětovném použití se zvýší jejich `use_count`.

```text
┌──────────────────────────────────────────────────────────────┐
│ Workflow klienta při zadávání jídla                         │
│ ════════════════════════════════════════════════════════════│
│                                                              │
│  1. Klient začne psát "Oves..."                             │
│     ↓                                                       │
│  2. Autocomplete zobrazí návrhy:                            │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ ⭐ Ovesná kaše s ovocem (tvoje oblíbené - 8x)      │ │
│     │ ⏰ Ovesná kaše (nedávno zadané)                    │ │
│     │ 📖 Ovesná kaše                                     │ │
│     └─────────────────────────────────────────────────────┘ │
│     ↓                                                       │
│  3. Klient vybere nebo napíše nové jídlo                    │
│     ↓                                                       │
│  4. Při uložení:                                            │
│     • Pokud jídlo existuje v templates → zvýší use_count    │
│     • Pokud neexistuje → vytvoří nový template              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Klíčové změny

### 1. Vylepšený FoodAutocomplete

Rozšíříme autocomplete o 3 zdroje dat:

| Zdroj | Ikona | Priorita | Popis |
|-------|-------|----------|-------|
| **Oblíbená** | ⭐ | 1 (nejvyšší) | Z `nutrition_meal_templates` podle `use_count` |
| **Historie** | ⏰ | 2 | Nedávno zadaná jídla z `nutrition_food_entries` |
| **Běžná** | 📖 | 3 | Statický seznam českých jídel |

### 2. Automatické ukládání do databáze jídel

Při každém uložení jídla:
- Zkontrolujeme, zda podobné jídlo existuje v `nutrition_meal_templates`
- Pokud ANO → inkrementujeme `use_count`
- Pokud NE → vytvoříme nový záznam

### 3. Integrace do FrequentItemsSection

Sekce "Tvoje častá jídla" bude načítat data primárně z `nutrition_meal_templates` místo z `nutrition_food_entries`.

---

## Technická implementace

### Úprava FoodAutocomplete.tsx

```typescript
// Přidáme query na meal templates
const { data: templates = [] } = useQuery({
  queryKey: ['meal-templates-search', clientId, inputValue],
  queryFn: async () => {
    if (!clientId || inputValue.length < 2) return [];
    
    const { data } = await supabase
      .from('nutrition_meal_templates')
      .select('id, name, description, meal_type, portion_size, use_count')
      .eq('client_id', clientId)
      .or(`name.ilike.%${inputValue}%,description.ilike.%${inputValue}%`)
      .order('use_count', { ascending: false })
      .limit(5);
    
    return data;
  },
});

// Kombinace výsledků s prioritou:
// 1. Templates (oblíbená ⭐)
// 2. Historie (⏰)
// 3. Běžná (📖)
```

### Nový hook useAutoSaveMealTemplate

```typescript
// Volá se po úspěšném uložení food entry
async function autoSaveMealTemplate(clientId: string, entry: FoodEntry) {
  const normalizedName = entry.description.toLowerCase().trim();
  
  // Zkontroluj, zda template existuje
  const { data: existing } = await supabase
    .from('nutrition_meal_templates')
    .select('id, use_count')
    .eq('client_id', clientId)
    .ilike('description', normalizedName)
    .maybeSingle();
  
  if (existing) {
    // Inkrementuj use_count
    await supabase
      .from('nutrition_meal_templates')
      .update({ 
        use_count: existing.use_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Vytvoř nový template
    await supabase
      .from('nutrition_meal_templates')
      .insert({
        client_id: clientId,
        name: entry.description,
        description: entry.description,
        meal_type: entry.meal_type,
        portion_size: entry.portion_size,
        use_count: 1,
      });
  }
}
```

### Úprava useAddFoodEntry

```typescript
// Po úspěšném uložení entry automaticky uložit/aktualizovat template
onSuccess: async (data, { clientId, entry }) => {
  // ... existující invalidace cache ...
  
  // Automaticky uložit do databáze jídel
  await autoSaveMealTemplate(clientId, {
    description: entry.description,
    meal_type: entry.meal_type,
    portion_size: entry.portion_size,
  });
  
  // Invalidovat templates cache
  queryClient.invalidateQueries({ queryKey: ['meal-templates', clientId] });
}
```

### Úprava FrequentItemsSection

```typescript
// Načítat častá jídla primárně z templates
const { data: frequentFoods = [] } = useMealTemplates(clientId);

// Fallback na historii pokud templates prázdné
const displayFoods = frequentFoods.length > 0 
  ? frequentFoods.slice(0, 6).map(t => ({
      description: t.description,
      meal_type: t.meal_type || 'lunch',
      portion_size: t.portion_size || 'medium',
    }))
  : recentFoods;
```

---

## Vizuální změny v Autocomplete

```text
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Ovesná ka...                                             │
├──────────────────────────────────────────────────────────────┤
│ ⭐ Ovesná kaše s ovocem                                     │
│    Snídaně • Střední • použito 8×                           │
├──────────────────────────────────────────────────────────────┤
│ ⏰ Ovesná kaše                                    nedávné   │
├──────────────────────────────────────────────────────────────┤
│ 📖 Ovesná kaše s ovocem                          běžné      │
└──────────────────────────────────────────────────────────────┘
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/nutrition/FoodAutocomplete.tsx` | Přidat query na templates, zobrazit 3 typy zdrojů |
| `src/hooks/useClientPortalNutrition.ts` | Přidat automatické ukládání templates v `onSuccess` |
| `src/hooks/useNutritionMealTemplates.ts` | Přidat hook `useAutoSaveMealTemplate` |
| `src/components/client-portal/nutrition/FrequentItemsSection.tsx` | Použít templates jako primární zdroj |

---

## Shrnutí výhod

| Výhoda | Popis |
|--------|-------|
| **Automatické učení** | Systém se učí z každého zadaného jídla |
| **Personalizace** | Každý klient má vlastní databázi oblíbených jídel |
| **Rychlejší zadávání** | Nejčastější jídla jsou vždy nahoře |
| **Bez duplicit** | Normalizace názvů zabrání duplicitám |
| **Zpětná kompatibilita** | Využívá existující tabulku `nutrition_meal_templates` |

---

## Pro vodu a kávu

Současný systém pro vodu (`useFrequentWaterAmounts`) a kávu (`useFrequentCoffeeTypes`) **již funguje správně** - analyzuje historii a zobrazuje nejčastější volby. Není potřeba vytvářet další tabulky.
