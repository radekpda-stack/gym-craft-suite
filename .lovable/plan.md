
# Plán: Deník Návyků - Kompletní Přepracování Modulu "Strava"

## Shrnutí Požadavků

Přepracovat modul "Strava" z jednoduchého záznamu jídla na **7-10 denní deník návyků** zaměřený na:
- Jednoduché zadávání jídla, vody a kávy/čaje s **povinným časem konzumace**
- Trenérský přehled s detaily CO/KDY/KOLIK + možnost komentovat a editovat
- Widget pro **plnění cíle vody**
- Widget **"kofeinové okno"** s vyhodnocením vůči spánku
- **Poznámky dne** pro kontext (narozeniny, pracovní večeře atd.)
- BEZ maker, kalorií nebo detailního jídelníčku

---

## Fáze 1: Databázové Změny

### A) Nová tabulka: `client_habit_settings`

Uložení individuálního nastavení návyků klienta.

```sql
CREATE TABLE client_habit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  water_goal_ml INT NOT NULL DEFAULT 2000,
  sleep_time TIME NULL,
  wake_time TIME NULL,
  caffeine_cutoff_minutes INT NOT NULL DEFAULT 480,
  sleep_time_last_set_by TEXT NOT NULL DEFAULT 'system'
    CHECK (sleep_time_last_set_by IN ('client', 'trainer', 'system')),
  sleep_time_last_set_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);
```

### B) Nová tabulka: `nutrition_day_notes`

Poznámky dne pro kontext.

```sql
CREATE TABLE nutrition_day_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  client_note TEXT NULL,
  trainer_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, date)
);
```

### C) Úprava existujících tabulek

**`nutrition_coffee_entries`** - přidat:
- `is_caffeinated BOOLEAN NOT NULL DEFAULT true` - rozlišení kofeinová/bezkofeinová
- `amount_ml INT NULL` - objem (volitelné)

**Všechny entry tabulky** - přidat:
- `occurred_at TIMESTAMPTZ NULL` - čas konzumace (primární pole)
- `trainer_edited BOOLEAN NOT NULL DEFAULT false`
- `trainer_edited_at TIMESTAMPTZ NULL`
- `created_from TEXT NULL DEFAULT 'web'` - (web/mobile/unknown)

### D) Migrace existujících dat

```sql
-- Migrace: occurred_at = kombinace entry_date + entry_time
UPDATE nutrition_food_entries 
SET occurred_at = (entry_date::text || ' ' || COALESCE(entry_time, '12:00'))::timestamptz
WHERE occurred_at IS NULL;

-- Podobně pro drink a coffee entries
```

### E) RLS Politiky

```sql
-- client_habit_settings: klient může číst/upravovat své, trenér může číst/upravovat svých klientů
-- nutrition_day_notes: podobná logika
```

---

## Fáze 2: Úpravy Klientských Formulářů

### A) `FoodLogForm.tsx` - Přidat čas

| Pole | Změna |
|------|-------|
| Čas konzumace | **NOVÉ** - time picker, default = nyní, předvyplněný dle meal_type |

```typescript
// Nový state
const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm'));

// Předvyplnění času dle typu jídla (jako návrh)
useEffect(() => {
  const timeDefaults = {
    breakfast: '07:30',
    lunch: '12:30',
    dinner: '18:30',
    snack: format(new Date(), 'HH:mm'),
  };
  setEntryTime(timeDefaults[mealType] || format(new Date(), 'HH:mm'));
}, [mealType]);
```

### B) Drink Form - Přidat čas

Přidat time picker do formuláře pro pití.

### C) Coffee Form - Rozšíření

| Pole | Změna |
|------|-------|
| Čas konzumace | **NOVÉ** - time picker |
| Kofeinová/Bezkofeinová | **NOVÉ** - switch/toggle |
| Objem ml | **NOVÉ** - volitelné (presety 30/60/120/200/jiné) |

```typescript
// Nový state pro kávu
const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm'));
const [isCaffeinated, setIsCaffeinated] = useState<boolean>(true);
const [amountMl, setAmountMl] = useState<number | null>(null);
```

---

## Fáze 3: Úpravy Hooks

### A) `useClientPortalNutrition.ts`

Aktualizovat interfaces a mutace:

```typescript
export interface CoffeeEntryInput {
  coffee_type: 'espresso' | 'cappuccino' | 'tea' | 'energy' | 'other';
  count: number;
  is_caffeinated?: boolean;     // NOVÉ
  amount_ml?: number;           // NOVÉ
  entry_time?: string;          // NOVÉ
  // ... existující pole
}

// V mutacích přidat výpočet occurred_at:
const occurredAt = `${format(date, 'yyyy-MM-dd')}T${entryTime}:00`;
```

### B) Nový hook: `useClientHabitSettings.ts`

```typescript
// Čtení a aktualizace nastavení návyků klienta
export function useClientHabitSettings(clientId: string) { ... }
export function useUpdateHabitSettings() { ... }
```

### C) Nový hook: `useNutritionDayNotes.ts`

```typescript
// CRUD pro poznámky dne
export function useDayNotes(clientId: string, date: string) { ... }
export function useUpsertDayNote() { ... }
```

---

## Fáze 4: Nové Komponenty pro Klienta

### A) `HabitSettingsForm.tsx`

Nastavení návyků v klientském portálu:
- Cíl vody (ml/den)
- Čas spánku (time picker)
- Čas probuzení (volitelné)

### B) `WaterGoalWidget.tsx`

Klientský widget "Voda dnes":

```text
┌──────────────────────────┐
│ 💧 Voda dnes             │
│ ████████░░░░░ 1200/2000ml│
│ 60% • Zbývá 800ml        │
└──────────────────────────┘
```

### C) `CaffeineWindowWidget.tsx`

Widget "Kofeinové okno":

```text
┌──────────────────────────────────────────┐
│ ☕ Kofeinové okno                        │
│                                          │
│ 06:00  ─────────────────────────  24:00  │
│        ████████████████░░░░░░░░░          │
│        ZELENÁ          ČERVENÁ           │
│        [☕7:30] [☕10:00]     [☕16:30!]  │
│                                          │
│ ⚠️ 16:30 - Kofein pozdě (spánek 22:00)   │
└──────────────────────────────────────────┘
```

Logika:
- Zelená zóna: do `sleep_time - caffeine_cutoff_minutes`
- Červená zóna: po cutoff
- Značky kofeinu s `is_caffeinated=false` zobrazit ale NEPOČÍTAT do varování

### D) `DayNoteInput.tsx`

Tlačítko "+ Poznámka dne" v denním přehledu:
- Otevře modal s textarea
- Uloží do `nutrition_day_notes.client_note`

---

## Fáze 5: Úpravy Trenérského Přehledu

### A) `NutritionClientDetail.tsx` - Kompletní Přepracování

**Header:**
- Přepínač období: 7 dní / 10 dní
- Export PDF

**Denní karta:**
- Seřazeno podle `occurred_at` (ne created_at)
- Zobrazit poznámku dne (client_note + trainer_note)
- Timeline záznamů s:
  - Čas konzumace (occurred_at)
  - Typ + popis/název
  - Množství/porce
  - Ikona pro `is_caffeinated=false` (např. 🚫☕)

**Klik na položku → Detail Dialog:**

```text
┌──────────────────────────────────────┐
│ ☕ Espresso × 2                      │
├──────────────────────────────────────┤
│ 📍 Konzumováno: 10:30               │
│ 📝 Zadáno: 10:35 (web)              │
│ 🚫 Kofeinová: ANO                    │
│ 📦 Objem: 60ml                       │
├──────────────────────────────────────┤
│ Komentář trenéra:                    │
│ [                               ]    │
│ [Uložit komentář]                   │
├──────────────────────────────────────┤
│ [Upravit záznam]                    │
└──────────────────────────────────────┘
```

**Editace záznamu:**
- Trenér může změnit: čas, typ, popis, porce, množství, is_caffeinated
- Po uložení: `trainer_edited=true`, `trainer_edited_at=now()`

**Poznámka dne:**
- Zobrazit client_note
- Pole pro trainer_note

### B) Trenérské Statistiky

V headeru nebo postranním panelu:
- Průměr vody/den
- Počet dnů se splněným cílem vody
- Počet dnů s "pozdním kofeinem"
- Nejpozdější kofein v období

---

## Fáze 6: Aktualizace `TodayEntries.tsx`

### Timeline podle `occurred_at`

Seřadit všechny položky (food + drinks + coffee) do jednoho timeline dle času konzumace:

```text
07:30 🌅 Snídaně - Ovesná kaše, malá porce
08:00 ☕ Espresso ×1 (60ml)
10:00 💧 Voda 300ml
10:30 ☕ Cappuccino ×1 🚫 (bezkofeinová)
12:30 ☀️ Oběd - Kuřecí s rýží, střední porce
...
```

### Klikací položky

Klient vidí detail (read-only) + případně trenérův komentář.

---

## Technická Část

### Soubory k Vytvoření

| Soubor | Popis |
|--------|-------|
| `src/hooks/useClientHabitSettings.ts` | Hook pro nastavení návyků |
| `src/hooks/useNutritionDayNotes.ts` | Hook pro poznámky dne |
| `src/components/client-portal/nutrition/WaterGoalWidget.tsx` | Widget voda |
| `src/components/client-portal/nutrition/CaffeineWindowWidget.tsx` | Widget kofein |
| `src/components/client-portal/nutrition/DayNoteInput.tsx` | Vstup poznámky dne |
| `src/components/client-portal/nutrition/HabitSettingsForm.tsx` | Nastavení návyků |
| `src/components/nutrition/EntryDetailDialog.tsx` | Detail položky pro trenéra |
| `src/components/nutrition/DayNoteSection.tsx` | Sekce poznámek dne |

### Soubory k Úpravě

| Soubor | Změny |
|--------|-------|
| `src/hooks/useClientPortalNutrition.ts` | Přidat entry_time, is_caffeinated, amount_ml |
| `src/components/client-portal/nutrition/FoodLogForm.tsx` | Přidat time picker |
| `src/components/client-portal/nutrition/constants.ts` | Aktualizovat typy |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | Timeline podle occurred_at |
| `src/components/client-portal/nutrition/EditEntryDialog.tsx` | Přidat čas, is_caffeinated, amount_ml |
| `src/pages/NutritionClientDetail.tsx` | Kompletní přepracování UI |
| `src/components/nutrition/NutritionStats.tsx` | Použít water_goal_ml z settings |

### Databáze - Migrace

1. Vytvořit tabulky `client_habit_settings` a `nutrition_day_notes`
2. Přidat sloupce do `nutrition_coffee_entries`
3. Přidat `occurred_at`, `trainer_edited`, `trainer_edited_at` do všech entry tabulek
4. Migrovat existující data (occurred_at = entry_date + entry_time)
5. RLS politiky pro nové tabulky

---

## Vizuální Výstupy

### Klientský Portál - Denní Přehled

```text
┌─────────────────────────────────────────┐
│ 23. ledna 2026                     [+📝]│
├─────────────────────────────────────────┤
│ 💧 Voda: ████████░░ 1200/2000ml    60%  │
│ ☕ Kofein: ████░░░░░ OK (cutoff 14:00)  │
├─────────────────────────────────────────┤
│ Timeline:                               │
│ 07:30 🌅 Ovesná kaše • střední         │
│ 08:15 ☕ Espresso × 1                   │
│ 10:00 💧 300ml                         │
│ 12:30 ☀️ Kuřecí s rýží • střední       │
│ 14:30 ☕ Čaj × 1 (bez kofeinu)          │
│ ...                                     │
├─────────────────────────────────────────┤
│ 📝 Poznámka: Pracovní oběd s kolegy    │
└─────────────────────────────────────────┘
```

### Trenérský Přehled - 7/10 Dnů

```text
┌─────────────────────────────────────────┐
│ Marie Nováková - Deník návyků          │
│ [7 dní] [10 dní]              [Export] │
├─────────────────────────────────────────┤
│ Souhrn:                                 │
│ 💧 Ø 1850ml/den • 4/7 dnů splněno      │
│ ☕ 2 dny s pozdním kofeinem • max 17:30│
├─────────────────────────────────────────┤
│ 23.1. Čtvrtek                      [📝]│
│ Poznámka: Pracovní oběd                 │
│ ─────────────────────────────────────── │
│ 07:30 🌅 Ovesná kaše • malá       [💬] │
│       → Trenér: "Zkus přidat protein"   │
│ 08:15 ☕ Espresso × 1                   │
│ ...                                     │
├─────────────────────────────────────────┤
│ 22.1. Středa                           │
│ ...                                     │
└─────────────────────────────────────────┘
```

---

## Časový Odhad

| Fáze | Složitost | Odhad |
|------|-----------|-------|
| Fáze 1: DB změny | Střední | 15 min |
| Fáze 2: Klientské formuláře | Střední | 20 min |
| Fáze 3: Hooks | Nízká | 15 min |
| Fáze 4: Klientské widgety | Vysoká | 30 min |
| Fáze 5: Trenérský přehled | Vysoká | 35 min |
| Fáze 6: Timeline | Střední | 15 min |
| **Celkem** | | **~2 hodiny** |

---

## Očekávaný Výsledek

1. **Klient** jednoduše zadává jídlo/vodu/kávu s ČASEM konzumace
2. **Klient** vidí progress vody a kofeinové okno
3. **Klient** může přidat poznámku dne pro kontext
4. **Trenér** vidí detailně CO/KDY/KOLIK za 7-10 dní
5. **Trenér** může komentovat a editovat záznamy
6. **Trenér** vidí souhrn návyků a varování

Bez maker, kalorií, složitých výpočtů - pouze návyky.
