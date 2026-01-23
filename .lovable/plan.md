
# Plán: Redesign nutričního deníku pro klientské centrum

## Shrnutí problému

Na základě screenshotů a analýzy kódu mám přehled o aktuálních problémech:

1. **Zastaralý vzhled** - Formulář působí těžkopádně, neladí s moderním glassmorphism designem aplikace
2. **Příliš mnoho rozklikávacích sekcí** - Collapsible "Více detailů", "Přesnější množství" komplikují UX
3. **Chybí výběr času jídla** - V databázi existuje `entry_time`, ale klient ho nemůže zadat (automaticky se nastaví aktuální čas)
4. **Příliš mnoho kroků** - Výběr typu → Formulář → Další sekce → Uložit
5. **Vizuální nepřehlednost** - Tlačítka jsou příliš velká, formulář je příliš dlouhý

---

## Navrhovaný nový design

### Filozofie redesignu
- **Jedna obrazovka, minimální scroll** - vše podstatné viditelné najednou
- **Čas je klíčový** - výrazný time picker vedle data
- **Méně rozklikávání** - všechny základní možnosti viditelné
- **Glassmorphism** - sjednocení s vizuálním jazykem aplikace
- **Mobile-first** - optimalizace pro palec

### Nový layout formuláře pro jídlo

```text
┌─────────────────────────────────────────────────┐
│  ✕                     Přidat jídlo             │
├─────────────────────────────────────────────────┤
│                                                 │
│  📅 Datum          ⏰ Čas                       │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ 23. ledna   │  │   12:30     │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  🍽️ Typ jídla                                  │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                       │
│  │🌅│ │☀️│ │🌙│ │🍎│                       │
│  └───┘ └───┘ └───┘ └───┘                       │
│                                                 │
│  🔍 Co jsi jedl/a?                              │
│  ┌─────────────────────────────────────────┐   │
│  │ Kuřecí prsa s rýží...             🔍    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📏 Porce                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Malá   │ │ Střední │ │  Velká  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  💬 Poznámka (volitelné)                        │
│  ┌─────────────────────────────────────────┐   │
│  │ domácí příprava, restaurace...          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                 Uložit                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Klíčové změny

| Aspekt | Před | Po |
|--------|------|-----|
| **Čas jídla** | Pouze automaticky z `new Date()` | Explicitní time picker s předvolbami |
| **Kvalita jídla** | V Collapsible "Více detailů" | Odstraněno (zřídka používáno) |
| **Jak jsi se najedl/a** | V Collapsible | Odstraněno (přesunut do poznámky) |
| **Gramáž/kusy** | V Collapsible | Odstraněno (příliš detailní) |
| **Design tlačítek** | Velké, řádkové | Kompaktní, inline |
| **Formulář jako Card** | Samostatná karta | Sheet/Modal zespodu |

---

## Technické detaily

### 1. Nová komponenta: SimpleFoodForm

**Soubor:** `src/components/client-portal/nutrition/SimpleFoodForm.tsx`

Úplně nová, zjednodušená komponenta nahrazující původní `FoodLogForm`:

```typescript
interface SimpleFoodFormProps {
  sessionId: string;
  clientId: string;
  selectedDate: Date;
  prefilledMealType?: MealTypeId;
  onClose: () => void;
}

// State
const [mealType, setMealType] = useState<MealTypeId>('lunch');
const [description, setDescription] = useState('');
const [portionSize, setPortionSize] = useState<PortionSizeId>('medium');
const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm'));
const [note, setNote] = useState('');
```

Klíčové vlastnosti:
- **Přímý výběr času** pomocí `<input type="time">` (nativní time picker)
- **Rychlé časové předvolby**: "Nyní", "Ráno (7:00)", "Poledne (12:00)", "Večer (18:00)"
- **Bez Collapsible sekcí** - vše na jedné úrovni
- **Sheet místo Card** - vysune se zespodu jako iOS-style modal

### 2. Přidání času do hooks

**Soubor:** `src/hooks/useClientPortalNutrition.ts`

Rozšířit `FoodEntryInput` o čas:
```typescript
export interface FoodEntryInput {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  portion_size?: 'small' | 'medium' | 'large';
  note?: string;
  entry_time?: string; // NOVÉ: formát "HH:mm"
}
```

V `useAddFoodEntry` použít předaný čas:
```typescript
entry_time: entry.entry_time || format(new Date(), 'HH:mm'),
```

### 3. Zjednodušení hlavní stránky

**Soubor:** `src/pages/client-portal/ClientPortalNutrition.tsx`

Změny:
- Použít **Sheet** místo inline karty pro formulář
- Zjednodušit Quick Actions - menší tlačítka
- Přidat animovaný progress pro denní vodu
- Přeuspořádat layout pro lepší přehlednost

```typescript
// Místo inline FoodLogForm použít Sheet
<Sheet open={showAddForm} onOpenChange={setShowAddForm}>
  <SheetContent side="bottom" className="h-[85vh]">
    <SimpleFoodForm ... />
  </SheetContent>
</Sheet>
```

### 4. Konstanty pro časové předvolby

**Soubor:** `src/components/client-portal/nutrition/constants.ts`

```typescript
export const TIME_PRESETS = [
  { label: 'Ráno', time: '07:00', icon: '🌅' },
  { label: 'Dopoledne', time: '10:00', icon: '☀️' },
  { label: 'Poledne', time: '12:00', icon: '🌤️' },
  { label: 'Odpoledne', time: '15:00', icon: '🍎' },
  { label: 'Večer', time: '18:00', icon: '🌙' },
  { label: 'Nyní', time: 'now', icon: '⏱️' },
] as const;
```

### 5. Úprava TodayEntries

**Soubor:** `src/components/client-portal/nutrition/TodayEntries.tsx`

- Zobrazit čas prominentněji vedle typu jídla
- Seřadit záznamy podle času (již funguje přes `order by entry_time`)
- Přidat vizuální timeline (čas vlevo, obsah vpravo)

---

## Odstranění nepotřebných prvků

Z formuláře **odstraníme**:
1. ✂️ `Kvalita jídla` (good/normal/poor) - nepoužívané
2. ✂️ `Jak jsi se najedl/a` (satiation) - nepoužívané
3. ✂️ `Přesnější množství` (grams/units) - příliš detailní
4. ✂️ Collapsible sekce "Více detailů" - komplikuje UX

Tyto údaje mohou být volitelně v `poznámce`, pokud klient chce.

---

## Vizuální styl

```css
/* Sheet styling */
.food-form-sheet {
  background: hsl(var(--background) / 0.95);
  backdrop-blur: 12px;
  border-top-left-radius: 1.5rem;
  border-top-right-radius: 1.5rem;
}

/* Kompaktní tlačítka pro typ jídla */
.meal-type-btn {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
}

/* Time picker styling */
.time-input {
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `SimpleFoodForm.tsx` (nový) | Nová zjednodušená komponenta |
| `ClientPortalNutrition.tsx` | Sheet místo inline karty, zjednodušení |
| `constants.ts` | Přidat TIME_PRESETS |
| `useClientPortalNutrition.ts` | Podpora entry_time v inputu |
| `TodayEntries.tsx` | Lepší zobrazení času |
| `FoodLogForm.tsx` | Zachovat pro kompatibilitu, ale nepoužívat |

---

## Očekávaný výsledek

1. **Rychlejší zadávání** - 3 kroky místo 5
2. **Přehlednější** - vše na jedné obrazovce bez scrollu
3. **Moderní vzhled** - Sheet zespodu, glassmorphism
4. **Přesný čas** - klient může zadat kdy přesně jedl
5. **Méně klikání** - žádné rozklikávací sekce

---

## Ukázka nového flow

```text
1. Klient klikne "+ Přidat jídlo" nebo "Snídaně"
2. Zespodu vyjede Sheet s formulářem
3. Klient vidí: Datum | Čas | Typ jídla | Popis | Porce | Poznámka
4. Klikne "Uložit"
5. Sheet se zavře, záznam se objeví v seznamu
```

Celkový čas zadání: ~5-8 sekund (oproti 15-20 sekund nyní)
