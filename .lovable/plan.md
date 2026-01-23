
# Plán: Vylepšení nutričního deníku pro klienty

## Shrnutí

Cílem je zjednodušit a zpříjemnit zadávání stravy pro klienty, aby je týden zapisování bavilo. Aktuální rozhraní je funkční, ale lze ho výrazně vylepšit z hlediska rychlosti zadávání, přehlednosti a motivace.

---

## Navrhované změny

### 1. Rychlé přidání nápojů - rozšíření možností

**Aktuální stav:**
- Tlačítko "+300ml vody" přidá vodu
- Tlačítko "+1 Káva" přidá espresso

**Nový stav:**
- Přidat **více rychlých tlačítek pro vodu** s různým množstvím (sklenice 💧, hrnek ☕, láhev 🍶)
- Při výběru typu "Jiné" v nápojích přidat **pole pro poznámku/název nápoje** (např. "Limonáda", "Sodovka", "Mléko")
- Zobrazit poznámku v seznamu záznamů

| Tlačítko | Množství | Ikona |
|----------|----------|-------|
| Sklenice | 200 ml | 💧 |
| Hrnek | 300 ml | ☕ |
| Láhev | 500 ml | 🍶 |

### 2. Přidání pole pro název nápoje (u typu "Jiné")

**Problém:** Když klient pije limonádu nebo sodovku, nemá kde napsat co přesně pil.

**Řešení:**
- Pokud je zvolen typ nápoje `other` (Jiné), zobrazit **textové pole pro název nápoje**
- Toto pole se uloží do sloupce `drink_name` (již existuje v databázi)
- V seznamu záznamů zobrazit název nápoje místo "Jiné"

### 3. Vylepšení formuláře pro pití

**Aktuální stav:**
```
Typ nápoje: [Voda] [Slazené] [Ionťák] [Alkohol] [Jiné]
Množství: [200] [300] [500] [750] [Jiné]
```

**Nový stav:**
```
Typ nápoje: [Voda] [Slazené] [Ionťák] [Alkohol] [Jiné]
→ Pokud "Jiné": Textové pole "Jaký nápoj?" (max 50 znaků)

Množství: [200] [300] [500] [750] [Jiné]
→ Vizuálně s ikonami kontejnerů (sklenice, hrnek, láhev, velká láhev)
```

### 4. Přehlednější zobrazení nápojů v seznamu

**Aktuální stav:**
```
💧 Jiné - 500 ml    14:30
```

**Nový stav:**
```
🧃 Limonáda - 500 ml    14:30
   (Jiné)
```

### 5. Motivační prvky pro dlouhodobé zapisování

| Prvek | Popis |
|-------|-------|
| **Série dní** | "🔥 3 dny v řadě!" - zobrazit na hlavní obrazovce |
| **Denní cíl vody** | Progress bar "💧 1.5L / 2L (75%)" |
| **Barevné označení dnů** | Ve WeekStrip použít barvy podle počtu záznamů |
| **Jednoduché emoji zpětné vazby** | Po přidání záznamu krátká animace ✅ |

### 6. Zjednodušení hlavních akcí

**Reorganizovat Quick Actions:**
```
┌─────────────────────────────────────────┐
│  JÍDLO                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  │ 🌅     │ │ ☀️     │ │ 🌙     │ │ 🍎     │
│  │Snídaně │ │ Oběd   │ │ Večeře │ │Svačina │
│  └────────┘ └────────┘ └────────┘ └────────┘
├─────────────────────────────────────────┤
│  PITÍ                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  │ 💧     │ │ 🥤     │ │ ⚡     │ │ 🧃     │
│  │ +Voda  │ │Slazené │ │Ionťák  │ │ Jiné   │
│  └────────┘ └────────┘ └────────┘ └────────┘
├─────────────────────────────────────────┤
│  KÁVA / ČAJ                             │
│  ┌────────────────────┐ ┌────────────────────┐
│  │ ☕ +1 Káva         │ │ 🍵 +1 Čaj          │
│  └────────────────────┘ └────────────────────┘
└─────────────────────────────────────────┘
```

---

## Technické detaily

### Soubory k úpravě

**1. `src/components/client-portal/nutrition/constants.ts`**
- Přidat nové konstanty pro rychlé množství s ikonami:
```typescript
export const QUICK_WATER_AMOUNTS = [
  { amount: 200, label: 'Sklenice', icon: '💧' },
  { amount: 300, label: 'Hrnek', icon: '☕' },
  { amount: 500, label: 'Láhev', icon: '🍶' },
] as const;
```

**2. `src/components/client-portal/nutrition/FoodLogForm.tsx`**
- Přidat state pro `drinkName` (string)
- Při `drinkType === 'other'` zobrazit Input pro název nápoje
- Předat `drink_name` do `handleSubmitDrink`
- Přidat vizuální ikony ke množství

Změny v sekci drink-form:
```typescript
// Nový state
const [drinkName, setDrinkName] = useState('');

// Při odeslání
entry: {
  drink_type: drinkType,
  amount_ml: finalAmount,
  drink_name: drinkType === 'other' ? drinkName.trim() : undefined,
},

// V UI - po výběru typu "Jiné" zobrazit:
{drinkType === 'other' && (
  <div className="space-y-2">
    <Label>Jaký nápoj?</Label>
    <Input 
      value={drinkName}
      onChange={(e) => setDrinkName(e.target.value)}
      placeholder="např. Limonáda, Mléko, Džus..."
      maxLength={50}
    />
  </div>
)}
```

**3. `src/components/client-portal/nutrition/TodayEntries.tsx`**
- Zobrazit `drink_name` místo "Jiné" pokud existuje
```typescript
<span className="text-sm font-medium">
  {entry.drink_name || DRINK_LABELS[entry.drink_type] || entry.drink_type}
</span>
```

**4. `src/components/client-portal/nutrition/EditEntryDialog.tsx`**
- Přidat state pro `drinkName`
- Přidat pole pro název nápoje při editaci

**5. `src/pages/client-portal/ClientPortalNutrition.tsx`**
- Přeorganizovat Quick Actions do přehlednějších sekcí
- Přidat více tlačítek pro vodu s různým množstvím
- Přidat rychlé tlačítko pro čaj
- Přidat progress bar pro denní příjem tekutin

---

## Očekávaný výsledek

Po implementaci:

1. **Rychlejší zadávání** - Klient může jedním kliknutím přidat vodu v různých množstvích
2. **Přehlednější kategorie** - Jídlo, Pití a Káva jsou jasně oddělené
3. **Možnost specifikovat "Jiné" nápoje** - Při výběru "Jiné" může klient napsat co přesně pil (např. "Limonáda 500ml")
4. **Lepší vizuální zpětná vazba** - Ikony kontejnerů, progress bar pro vodu
5. **Motivace** - Série dní, denní cíle

---

## Priorita implementace

| Priorita | Funkce | Důvod |
|----------|--------|-------|
| 🔴 Vysoká | Pole pro název "Jiného" nápoje | Základní požadavek uživatele |
| 🔴 Vysoká | Zobrazení názvu nápoje v seznamu | Souvisí s předchozím |
| 🟡 Střední | Rychlá tlačítka pro různé množství vody | Zrychlení zadávání |
| 🟡 Střední | Reorganizace Quick Actions | Lepší přehlednost |
| 🟢 Nízká | Progress bar pro denní pitný režim | Motivační prvek |
| 🟢 Nízká | Vizuální ikony kontejnerů | Estetické vylepšení |
