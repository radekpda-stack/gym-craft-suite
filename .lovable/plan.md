
# Revize sekce Strava - Audit UI a návrh vylepšení

## Současný stav

Na základě screenshotů a analýzy kódu jsou identifikovány dva hlavní problematické pohledy:

### 1. Detail klienta (`NutritionClientDetail.tsx`)
**Problémy:**
- Popisy jídel se zalamují nešťastně (každé slovo na nový řádek)
- Timeline layout je příliš vertikální a zabírá hodně místa
- Badge pro typ jídla (Snídaně, Svačina) a čas jsou oddělené, ale mohly by být kompaktnější
- Chybí vizuální hierarchie mezi typy záznamů (jídlo vs. nápoje vs. káva)

### 2. Přehled klientů (`NutritionPage.tsx`)
**Problémy:**
- Jména klientů jsou useknutá ("L...", "T...")
- Metriky přetékají horizontálně ("prázdných dnů", "1× po 18:00")
- Badge "Pozornost" se ořezává
- Příliš husté horizontální rozložení metrik na mobilu

---

## Navrhované změny

### Fáze 1: Redesign zobrazení jídla v detailu klienta

**Současný layout:**
```text
09:00 [Snídaně] Cottage light, banán, maliny, červené hrozny, oříšky
                Porce: střední
```

**Nový layout - kompaktní karta:**
```text
┌─────────────────────────────────────────────────────────────┐
│ 🕘 09:00 • Snídaně                                [✏️] [💬] │
│ ─────────────────────────────────────────────────────────── │
│ Cottage light, banán, maliny, červené hrozny, oříšky       │
│ Porce: střední                                              │
└─────────────────────────────────────────────────────────────┘
```

**Klíčové změny:**
- Čas + typ jídla na jednom řádku jako header karty
- Popis jídla pod tím s `line-clamp-2` pro zkrácení (rozbalitelné)
- Akční tlačítka (Edit, Comment) vpravo v headeru, vždy viditelná na mobilu
- Porce jako subtle metadata pod popisem

### Fáze 2: Vylepšení přehledu klientů

**Současný layout řádku:**
```text
[L] L... [⚠ Pozornost] 🕐 Dnes  🍎 12 tento týden  📅 3 prázdných dnů  ☕ 1× po 18:00
```

**Nový layout - 2 řádky:**
```text
┌─────────────────────────────────────────────────────────────┐
│ [B] Bobáková Petra                    [⚠ Pozornost] [→]    │
│     🕐 Dnes • 🍎 12 • 📅 3 prázdných • ☕ 1× pozdě         │
└─────────────────────────────────────────────────────────────┘
```

**Klíčové změny:**
- Jméno klienta s `truncate` ale větší `max-w` (min 120px)
- Metriky na druhém řádku s kompaktnějším formátováním
- Zkrácené popisky ("prázdných" místo "prázdných dnů", "pozdě" místo "po 18:00")
- Badge indikátory (🍎, 💧, ☕) jako ikony bez textů na mobilu

### Fáze 3: Nová komponenta `NutritionFoodCard`

Vytvořit reusable komponentu pro zobrazení jednoho jídla:

```tsx
interface NutritionFoodCardProps {
  time: string;
  mealType: string;
  description: string;
  portionSize?: string;
  quality?: 'good' | 'normal' | 'poor';
  trainerComment?: string;
  onEdit?: () => void;
  onComment?: () => void;
}
```

**Vizuální prvky:**
- Barevný indikátor kvality (levý okraj)
- Rozbalitelný popis pro dlouhé texty
- Kompaktní metadata layout

### Fáze 4: Responzivní layout pro metriky klientů

**Mobilní view (< 640px):**
```text
┌─────────────────────────────────────┐
│ [B] Bobáková Petra      [⚠ Pozor]  │
│     🕐 Dnes                         │
│     🍎 12  📅 3  ☕ 1               │
└─────────────────────────────────────┘
```

**Desktop view (≥ 640px):**
```text
┌──────────────────────────────────────────────────────────────────┐
│ [B] Bobáková Petra           [⚠ Pozornost]                       │
│     🕐 Dnes • 🍎 12 tento týden • 📅 3 prázdných • ☕ 1× pozdě   │
└──────────────────────────────────────────────────────────────────┘
```

### Fáze 5: Vizuální vylepšení timeline

**Barevné kódování typů záznamu:**
- Jídlo: `bg-warning/5 border-l-2 border-warning`
- Nápoje: `bg-blue-500/5 border-l-2 border-blue-500`
- Káva: `bg-amber-600/5 border-l-2 border-amber-600`

**Ikony pro kvalitu:**
- 💚 Kvalitní (good)
- 🟡 Běžná (normal)
- 🔴 Nezdravá (poor)

---

## Technické kroky implementace

### Krok 1: Vytvořit komponentu `NutritionFoodCard`
```text
- Nová komponenta src/components/nutrition/NutritionFoodCard.tsx
- Props: time, mealType, description, portionSize, quality, trainerComment
- Expandable popis s line-clamp-2
- Barevný border podle typu/kvality
- Akční tlačítka v headeru
```

### Krok 2: Vytvořit komponentu `NutritionClientRow`
```text
- Nová komponenta src/components/nutrition/NutritionClientRow.tsx
- Optimalizovaný 2-řádkový layout pro klienta
- Responzivní zkracování metrik
- Správné truncation pro jméno
```

### Krok 3: Refaktorovat `NutritionClientDetail.tsx`
```text
- Nahradit inline food entry rendering komponentou NutritionFoodCard
- Přidat barevné kódování sekcí (jídlo/nápoje/káva)
- Zlepšit spacing a vizuální hierarchii
```

### Krok 4: Refaktorovat `NutritionPage.tsx` - client list
```text
- Nahradit inline client rendering komponentou NutritionClientRow
- Přidat responsive layout pro metriky
- Zkrátit popisky na mobilu
```

### Krok 5: Přidat rozbalitelný popis
```text
- Pro dlouhé popisy (>80 znaků) zobrazit zkráceně
- Přidat tlačítko "více" pro rozbalení
- Použít framer-motion pro smooth animaci
```

---

## Výsledek po úpravách

| Oblast | Před | Po |
|--------|------|-----|
| Popis jídla | Awkward word wrapping | Kompaktní karta s line-clamp |
| Jméno klienta | "L..." (useknuté) | Plné jméno nebo smart truncate |
| Metriky klienta | Horizontální overflow | 2-řádkový responzivní layout |
| Badge "Pozornost" | Ořezaný | Vždy viditelný |
| Vizuální hierarchie | Jednotné šedé pozadí | Barevné kódování podle typu |
| Kvalita jídla | Textové | Emoji indikátory (💚🟡🔴) |
| Akční tlačítka | Pouze on hover | Viditelná na mobilu |

---

## Vizuální návrh finální karty jídla

```text
┌─ 💚 ────────────────────────────────────────────────────────┐
│ 🕘 09:00 • Snídaně                              [✏️] [💬]   │
├─────────────────────────────────────────────────────────────┤
│ Cottage light, banán, maliny, červené hrozny, oříšky       │
│                                                              │
│ 📏 Střední porce                                             │
│                                                              │
│ ┌─ 💬 Trenér ─────────────────────────────────────────────┐ │
│ │ Super volba bílkovin! Zkus přidat více zeleniny.        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Vizuální návrh finální řádku klienta

**Mobilní:**
```text
┌─────────────────────────────────────────────────────────────┐
│ [🔴B] Bobáková Petra               [⚠ Pozornost]           │
│       🕐 Dnes                                               │
│       🍎 12   📅 3   ☕ 1                                   │
└─────────────────────────────────────────────────────────────┘
```

**Desktop:**
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [🔴B] Bobáková Petra                                         [⚠ Pozornost]     │
│       🕐 Dnes • 🍎 12 tento týden • 📅 3 prázdných dnů • ☕ 1× po 18:00   [→]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Prioritizace

**Vysoká priorita:**
1. Opravit přetékání metrik na přehledu klientů (NutritionPage)
2. Vytvořit NutritionFoodCard pro lepší zobrazení jídla
3. Přidat barevné kódování kvality

**Střední priorita:**
4. Responzivní 2-řádkový layout pro klienty
5. Expandable popisy jídla

**Nižší priorita:**
6. Animace pro rozbalení
7. Emoji indikátory místo textů
