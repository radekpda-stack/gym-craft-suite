
# Hodnocení zápisů a kontrola dnů - Nutriční deník trenéra

## Shrnutí požadavků

1. **Hodnocení záznamů 1-10**: Trenér může hodnotit jednotlivé záznamy (jídlo, káva, nápoje) na škále 1-10
2. **Komentáře k záznamům**: Rozšíření stávající funkce pro komentáře
3. **Zobrazení v klientském deníku**: Klient vidí hodnocení i komentáře od trenéra
4. **Možnost odpovědi klienta**: Klient může do komentáře doplnit informace
5. **Kontrola dne**: Trenér může označit den jako "zkontrolováno" - klient tuto informaci uvidí

---

## Databázové změny

### 1. Přidat `trainer_rating` do všech entry tabulek

Přidáme nový sloupec pro hodnocení 1-10 do:
- `nutrition_food_entries`
- `nutrition_drink_entries`  
- `nutrition_coffee_entries`

```sql
ALTER TABLE nutrition_food_entries ADD COLUMN trainer_rating SMALLINT CHECK (trainer_rating >= 1 AND trainer_rating <= 10);
ALTER TABLE nutrition_drink_entries ADD COLUMN trainer_rating SMALLINT CHECK (trainer_rating >= 1 AND trainer_rating <= 10);
ALTER TABLE nutrition_coffee_entries ADD COLUMN trainer_rating SMALLINT CHECK (trainer_rating >= 1 AND trainer_rating <= 10);
```

### 2. Přidat `client_reply` pro odpovědi klienta

```sql
ALTER TABLE nutrition_food_entries ADD COLUMN client_reply TEXT;
ALTER TABLE nutrition_drink_entries ADD COLUMN client_reply TEXT;
ALTER TABLE nutrition_coffee_entries ADD COLUMN client_reply TEXT;
```

### 3. Přidat `is_checked` do `nutrition_day_notes`

```sql
ALTER TABLE nutrition_day_notes ADD COLUMN is_checked BOOLEAN DEFAULT false;
ALTER TABLE nutrition_day_notes ADD COLUMN checked_at TIMESTAMPTZ;
```

---

## Změny v UI - Trenér

### 1. Nový dialog pro hodnocení a komentář

Sloučení komentáře a hodnocení do jednoho dialogu:

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Hodnocení a komentář                              [✕]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Hodnocení (1 = špatné, 10 = výborné)                        │
│ ★ ★ ★ ★ ★ ★ ★ ★ ☆ ☆  [8/10]                               │
│                                                              │
│ Komentář pro klienta:                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Super volba bílkovin! Zkus přidat zeleninu.            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                              [Zrušit]  [💾 Uložit]          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Checkbox pro kontrolu dne

V headeru každého dne přidat toggle:

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Sobota 24. 1.    [✓ Zkontrolováno]   [📝 Poznámka]      │
├─────────────────────────────────────────────────────────────┤
│ ...záznamy...                                                │
└─────────────────────────────────────────────────────────────┘
```

### 3. Vizuální indikátor hodnocení na kartách

Na `NutritionFoodCard` zobrazit hvězdičku s hodnocením:

```
┌─ 💚 ────────────────────────────────────────────────────────┐
│ 🕘 09:00 • Snídaně              ⭐ 8/10      [✏️] [💬]      │
├─────────────────────────────────────────────────────────────┤
│ Cottage light, banán, maliny...                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Změny v UI - Klient

### 1. Zobrazení hodnocení od trenéra

V `TodayEntries.tsx` přidat vizuální indikátor hodnocení:

```
┌─────────────────────────────────────────────────────────────┐
│ 🕘 09:00 • Snídaně                                          │
│ Cottage light, banán, maliny...                              │
│                                                              │
│ ⭐ Hodnocení od trenéra: 8/10                               │
│ 💬 Super volba bílkovin! Zkus přidat zeleninu.              │
│                                                              │
│ [📝 Odpovědět]                                              │
└─────────────────────────────────────────────────────────────┘
```

Barevné škálování hodnocení:
- 1-3: 🔴 Červená (špatné)
- 4-6: 🟡 Žlutá (průměrné)
- 7-8: 🟢 Zelená (dobré)
- 9-10: 💚 Sytě zelená (výborné)

### 2. Dialog pro odpověď klienta

Klient může kliknout na "Odpovědět" a přidat svou odpověď:

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Odpověď trenérovi                                 [✕]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Komentář trenéra:                                           │
│ "Super volba bílkovin! Zkus přidat zeleninu."              │
│                                                              │
│ Vaše odpověď:                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Díky! Zeleninu přidám příště.                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                                         [💾 Odeslat]        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Indikátor "Zkontrolováno" pro klienta

V klientském pohledu na den zobrazit badge:

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Sobota 24. 1.                    [✓ Zkontrolováno]      │
├─────────────────────────────────────────────────────────────┤
│ Váš trenér zkontroloval váš jídelníček za tento den.        │
│ ...záznamy...                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technické kroky implementace

### Krok 1: Databázová migrace
```
Přidat do všech entry tabulek:
- trainer_rating (SMALLINT, 1-10)
- client_reply (TEXT)

Přidat do nutrition_day_notes:
- is_checked (BOOLEAN)
- checked_at (TIMESTAMPTZ)
```

### Krok 2: Rozšířit hook `useTrainerComment`
```
Přejmenovat na useTrainerFeedback
Přidat podporu pro:
- trainer_rating (1-10)
- trainer_comment (existující)
```

### Krok 3: Vytvořit novou komponentu `TrainerFeedbackDialog`
```
Props:
- type: 'food' | 'drink' | 'coffee'
- entryId: string
- currentRating: number | null
- currentComment: string | null
- onSave: (rating, comment) => void

Obsahuje:
- RatingInput (existující komponenta)
- Textarea pro komentář
- Tlačítka Uložit/Zrušit
```

### Krok 4: Přidat checkbox "Zkontrolováno" do `NutritionClientDetail`
```
V headeru každého dne:
- Checkbox pro is_checked
- Volání upsertDayNote s is_checked: true/false
- Barevný indikátor: zelený pokud zkontrolováno
```

### Krok 5: Rozšířit hook `useNutritionDayNotes`
```
Přidat podporu pro:
- is_checked (boolean)
- checked_at (timestamp)
```

### Krok 6: Upravit `NutritionFoodCard` pro zobrazení hodnocení
```
Přidat prop: trainerRating?: number | null
Zobrazit hvězdičku s číslem v headeru karty
Barevné kódování podle hodnoty
```

### Krok 7: Upravit `TodayEntries.tsx` pro klienty
```
Zobrazit trainer_rating vizuálně
Zobrazit trainer_comment
Přidat tlačítko "Odpovědět"
Zobrazit client_reply pokud existuje
```

### Krok 8: Vytvořit `ClientReplyDialog` komponentu
```
Pro klienty - možnost odpovědět na komentář trenéra
Volá mutation pro update client_reply
```

### Krok 9: Přidat indikátor "Zkontrolováno" do klientského pohledu
```
V NutritionDiary pro klienta:
- Zobrazit badge "✓ Zkontrolováno" pokud is_checked = true
- Zelená barva pro pozitivní zpětnou vazbu
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| **Migrace** | Nová SQL migrace pro trainer_rating, client_reply, is_checked |
| `src/pages/NutritionClientDetail.tsx` | Nový dialog, checkbox pro kontrolu |
| `src/components/nutrition/NutritionFoodCard.tsx` | Zobrazení hodnocení |
| `src/components/nutrition/TrainerFeedbackDialog.tsx` | Nová komponenta |
| `src/hooks/useNutritionDayNotes.ts` | Podpora is_checked |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | Hodnocení, odpověď |
| `src/components/client-portal/nutrition/ClientReplyDialog.tsx` | Nová komponenta |

---

## Vizuální návrh hodnocení

```
Škála 1-10 s barvami:

1-3:  🔴🔴🔴⚪⚪⚪⚪⚪⚪⚪  "Potřebuje zlepšit"
4-6:  🟡🟡🟡🟡🟡🟡⚪⚪⚪⚪  "Průměrné"  
7-8:  🟢🟢🟢🟢🟢🟢🟢🟢⚪⚪  "Dobré"
9-10: 💚💚💚💚💚💚💚💚💚💚  "Výborné!"
```

Pro klienta jednoduché zobrazení:
```
⭐ 8/10 - Dobré!
```

---

## Výsledek implementace

| Funkce | Trenér | Klient |
|--------|--------|--------|
| Hodnocení 1-10 | ✅ Může nastavit | ✅ Vidí vizuálně |
| Komentář | ✅ Může napsat | ✅ Vidí |
| Odpověď | ✅ Vidí odpověď | ✅ Může odpovědět |
| Kontrola dne | ✅ Checkbox | ✅ Badge "Zkontrolováno" |
| Barevné indikátory | ✅ Ano | ✅ Ano |

