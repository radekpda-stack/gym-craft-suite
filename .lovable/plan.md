
# Častá jídla, nápoje a káva - Quick Add rozšíření

## Přehled návrhu

Rozšíříme nutriční deník o inteligentní **"Častá jídla"** sekci, která se automaticky učí z historie klienta a nabízí rychlé přidání nejčastěji zadávaných položek. Systém bude fungovat pro jídla, vodu i kávu.

## Současný stav vs. cílový

| Oblast | Současný stav | Cílový stav |
|--------|---------------|-------------|
| **Jídla** | Existuje `useRecentFoodEntries` - zobrazuje 8 nejčastějších | Vylepšit UI, přidat do SimpleFoodForm |
| **Voda** | Statické presety (200, 300, 500 ml) | Automaticky detekovat nejčastější množství z historie |
| **Káva** | Statické presety (espresso, čaj) | Zobrazit nejčastější kombinace (typ + kofeinem ano/ne) |

---

## Vizuální návrh

### 1. Rozšířená sekce rychlého přidání na hlavní stránce

```text
┌──────────────────────────────────────────────────────────────┐
│ ⭐ TVOJE ČASTÁ JÍDLA                                        │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│ │ 🥣 Ovesná kaše │ │ 🍳 Míchaná    │ │ 🍗 Kuřecí prsa │    │
│ │ s ovocem      │ │ vajíčka       │ │ s rýží         │    │
│ │ [+]           │ │ [+]           │ │ [+]            │    │
│ └────────────────┘ └────────────────┘ └────────────────┘    │
│                                                              │
│ 💧 TVOJE VODA                                               │
│ ────────────────────────────────────────────────────────────│
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 200ml    │ │ 330ml ⭐ │ │ 500ml ⭐ │ │ 750ml    │        │
│ │          │ │ (nejčast.)│ │ (2. nej.)│ │          │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ ☕ TVOJE KÁVA/ČAJ                                            │
│ ────────────────────────────────────────────────────────────│
│ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│ │ ☕ Espresso │ │ 🥛 Capucc. │ │ 🍵 Čaj     │               │
│ │    [+]     │ │    [+]     │ │    [+]     │               │
│ └────────────┘ └────────────┘ └────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

### 2. Dialog pro potvrzení rychlého přidání s časem

Při kliknutí na "+" se otevře dialog:

```text
┌──────────────────────────────────────────────────────────────┐
│ ✓ Přidat: Ovesná kaše s ovocem                              │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ 📏 Porce: [Malá] [STŘEDNÍ] [Velká]                          │
│                                                              │
│ ⏰ Čas:   [_07:30_]                                          │
│                                                              │
│ Rychlá volba: [Nyní] [Ráno] [Poledne] [Večer]               │
│                                                              │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │       Zrušit            │ │         ✓ Přidat           │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### 1. Nové hooky pro častá data

#### `useFrequentDrinks.ts`
```typescript
// Analyzuje historii nápojů a vrací nejčastější množství vody + typy nápojů
function useFrequentDrinks(clientId: string) {
  return useQuery({
    queryKey: ['frequent-drinks', clientId],
    queryFn: async () => {
      // Načíst posledních 100 drink entries
      const { data } = await supabase
        .from('nutrition_drink_entries')
        .select('drink_type, amount_ml')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Spočítat frekvence pro vodu (water)
      const waterAmounts = data
        .filter(d => d.drink_type === 'water')
        .map(d => d.amount_ml);
      
      // Najít nejčastější množství
      const waterFrequency = countFrequency(waterAmounts);
      const topWaterAmounts = getTopN(waterFrequency, 4);

      // Spočítat frekvence pro ostatní nápoje
      const otherDrinks = data.filter(d => d.drink_type !== 'water');
      const drinkTypeFrequency = countFrequency(otherDrinks.map(d => d.drink_type));

      return {
        frequentWaterAmounts: topWaterAmounts, // [330, 500, 200, ...]
        frequentDrinkTypes: getTopN(drinkTypeFrequency, 3),
      };
    },
  });
}
```

#### `useFrequentCoffee.ts`
```typescript
// Analyzuje historii kávy a vrací nejčastější kombinace
function useFrequentCoffee(clientId: string) {
  return useQuery({
    queryKey: ['frequent-coffee', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('nutrition_coffee_entries')
        .select('coffee_type, is_caffeinated, count')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Spočítat frekvence typů kávy
      const coffeeFrequency = countFrequency(data.map(c => c.coffee_type));
      
      return {
        frequentCoffeeTypes: getTopN(coffeeFrequency, 4), // ['espresso', 'tea', 'cappuccino']
        defaultIsCaffeinated: mostCommonValue(data.map(c => c.is_caffeinated)),
      };
    },
  });
}
```

### 2. Nová komponenta `FrequentItemsSection.tsx`

```typescript
interface FrequentItemsSectionProps {
  clientId: string;
  sessionId: string;
  selectedDate: Date;
  onQuickAddFood: (food: FrequentFood) => void;
  onQuickAddWater: (amount: number) => void;
  onQuickAddCoffee: (type: string) => void;
}

function FrequentItemsSection({...}) {
  const { data: frequentFoods } = useRecentFoodEntries(clientId);
  const { data: frequentDrinks } = useFrequentDrinks(clientId);
  const { data: frequentCoffee } = useFrequentCoffee(clientId);

  return (
    <Card>
      {/* Častá jídla */}
      {frequentFoods?.length > 0 && (
        <Section title="⭐ Tvoje častá jídla">
          <FrequentFoodGrid items={frequentFoods} onSelect={onQuickAddFood} />
        </Section>
      )}

      {/* Rychlá voda - dynamické množství */}
      <Section title="💧 Rychle přidat vodu">
        <WaterAmountGrid 
          amounts={frequentDrinks?.frequentWaterAmounts || [200, 300, 500]}
          onSelect={onQuickAddWater}
        />
      </Section>

      {/* Častá káva/čaj */}
      <Section title="☕ Tvoje káva/čaj">
        <CoffeeTypeGrid 
          types={frequentCoffee?.frequentCoffeeTypes || ['espresso', 'tea']}
          onSelect={onQuickAddCoffee}
        />
      </Section>
    </Card>
  );
}
```

### 3. Dialog pro rychlé přidání s volbou času

#### `QuickAddFoodDialog.tsx`
```typescript
// Otevře se po kliknutí na častý item
// Umožní upravit porci a čas před uložením

interface QuickAddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: {
    description: string;
    meal_type: string;
    portion_size: string;
  };
  onConfirm: (data: {
    description: string;
    meal_type: string;
    portion_size: string;
    entry_time: string;
  }) => Promise<void>;
}
```

### 4. Integrace do `ClientPortalNutrition.tsx`

Nahradíme současnou sekci "Quick Actions" za vylepšenou verzi:

```typescript
// Místo statických presetů použít dynamické
{/* Frequent Items Section */}
<FrequentItemsSection
  clientId={clientId}
  sessionId={session.id}
  selectedDate={selectedDate}
  onQuickAddFood={handleQuickAddFrequentFood}
  onQuickAddWater={(amount) => setQuickAddDialog({ open: true, type: 'water', value: amount })}
  onQuickAddCoffee={(type) => setQuickAddDialog({ open: true, type: 'coffee', value: type })}
/>
```

---

## Logika detekce častých položek

### Pro vodu
1. Načíst posledních 100 záznamů vody
2. Seskupit podle `amount_ml`
3. Seřadit podle počtu výskytů
4. Vzít top 4 (nebo méně pokud nemá dost historie)
5. Fallback na statické [200, 300, 500] pokud historie prázdná

### Pro kávu
1. Načíst posledních 50 záznamů kávy
2. Seskupit podle `coffee_type`
3. Zobrazit maximálně 4 nejčastější typy
4. Fallback na statické ['espresso', 'tea']

### Pro jídla
Již existuje `useRecentFoodEntries` - pouze vylepšíme UI

---

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/hooks/useFrequentNutrition.ts` | VYTVOŘIT | Hooky pro častá data (voda, káva) |
| `src/components/client-portal/nutrition/FrequentItemsSection.tsx` | VYTVOŘIT | Hlavní komponenta pro častá jídla |
| `src/components/client-portal/nutrition/QuickAddFoodDialog.tsx` | VYTVOŘIT | Dialog pro rychlé přidání jídla s časem |
| `src/pages/client-portal/ClientPortalNutrition.tsx` | UPRAVIT | Integrace nové sekce |

---

## UX vylepšení

| Prvek | Implementace |
|-------|-------------|
| **Vizuální označení** | Nejčastější položky mají ⭐ nebo "(nejčastější)" label |
| **Fallback** | Pokud klient nemá historii, zobrazí se statické presety |
| **Animace** | Framer Motion pro přidání nové položky |
| **Haptic feedback** | Vibrace při úspěšném přidání |
| **Čas** | Dialog vždy vyžaduje potvrzení času konzumace |

---

## Shrnutí workflow

1. **Klient otevře nutriční deník**
2. **Vidí sekci "Tvoje častá jídla"** - automaticky generované z historie
3. **Ťukne na položku** (např. "Ovesná kaše")
4. **Otevře se dialog** s předvyplněnými daty + výběr času
5. **Potvrdí** → záznam se uloží
6. **Systém se učí** - častěji použité položky se posouvají nahoru
