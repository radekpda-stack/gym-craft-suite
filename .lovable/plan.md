
# Odstranění generické volby "Ostatní" z nutričního deníku

## Identifikovaný problém

Ze screenshotu vidím, že trenér vidí záznam **"Ostatní 30ml"** v kofeinu, což neposkytuje žádnou užitečnou informaci. Klient může vybrat "Jiné" a nemusí specifikovat co to vlastně je.

### Aktuální stav:
- **Nápoje (DRINK_TYPES)**: Má "Jiné" + textové pole pro název (ale není povinné)
- **Kofein (COFFEE_TYPES)**: Má "Jiné" ale **NEMÁ textové pole** pro specifikaci

## Navrhované řešení

Místo odstranění "Jiné" (což by omezilo flexibilitu) navrhuju **vynutit konkrétní specifikaci**:

### Změna 1: Přidat textové pole pro "Jiné" u kávy

U `COFFEE_TYPES` když je vybráno "other", přidat povinný input:
```
[Espresso] [Cappuccino] [Čaj] [Energy] [Jiné]

// Pokud vybráno "Jiné":
┌─────────────────────────────────────────────┐
│ Jaký nápoj? *                               │
│ [např. Matcha, Kakao, Horká čokoláda...]   │
└─────────────────────────────────────────────┘
```

### Změna 2: Vynutit vyplnění názvu

Validace při odeslání:
- Pokud `drinkType === 'other'` a `drinkName` je prázdné → **chyba**
- Pokud `coffeeType === 'other'` a `coffeeName` je prázdné → **chyba**

```typescript
// Při submitu
if (drinkType === 'other' && !drinkName.trim()) {
  toast.error('Zadej konkrétní název nápoje');
  return;
}
```

### Změna 3: Lepší zobrazení v trenérském pohledu

V `TodayEntries.tsx` a dalších místech zobrazovat:
```
❌ Před: "Ostatní 30ml"
✅ Po:   "Matcha 30ml" nebo "Horká čokoláda 30ml"
```

Pokud klient zadá pouze typ bez názvu (starší data), zobrazit:
```
"Jiný nápoj (nespecifikováno)" - jasné upozornění
```

---

## Technické kroky

### Krok 1: Přidat pole `coffee_name` do formuláře kávy

Soubor: `src/components/client-portal/nutrition/FoodLogForm.tsx`
- Přidat state `coffeeName`
- Zobrazit Input když `coffeeType === 'other'`
- Validace při submitu

### Krok 2: Přidat validaci pro povinný název u "Jiné"

Soubory: `FoodLogForm.tsx`, `EditEntryDialog.tsx`
- Blokovat odeslání pokud je vybráno "Jiné" bez vyplněného názvu
- Zobrazit toast error s jasnou zprávou

### Krok 3: Aktualizovat zobrazení záznamů

Soubory: `TodayEntries.tsx`, `NutritionLogDetail.tsx`, `ChatGPTExportDialog.tsx`
- Prioritně zobrazovat `coffee_name`/`drink_name` místo generického "Jiné"
- Pro starší záznamy zobrazit "(nespecifikováno)"

### Krok 4: Aktualizovat databázové schéma

Přidat sloupec `coffee_name` do tabulky `nutrition_coffee_entries` (pokud neexistuje)

---

## Alternativa: Rozšířit kategorie místo "Jiné"

Pokud chcete úplně odstranit "Jiné", můžeme rozšířit kategorie:

### COFFEE_TYPES:
```typescript
{ id: 'matcha', label: 'Matcha', icon: '🍵' },
{ id: 'cocoa', label: 'Kakao', icon: '🍫' },
{ id: 'decaf', label: 'Decaf', icon: '☕' },
```

### DRINK_TYPES:
```typescript
{ id: 'milk', label: 'Mléko', icon: '🥛' },
{ id: 'juice', label: 'Džus', icon: '🧃' },
{ id: 'soda', label: 'Cola/limonáda', icon: '🥤' },
```

Tím by klient vždy vybral konkrétní kategorii.

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/nutrition/FoodLogForm.tsx` | Přidat `coffeeName` input + validace |
| `src/components/client-portal/nutrition/EditEntryDialog.tsx` | Přidat `coffeeName` input + validace |
| `src/components/client-portal/nutrition/constants.ts` | Případně rozšířit kategorie |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | Zobrazovat konkrétní názvy |
| `src/components/nutrition/NutritionLogDetail.tsx` | Zobrazovat konkrétní názvy |
| `src/components/nutrition/ChatGPTExportDialog.tsx` | Export s konkrétními názvy |
| Databáze | Přidat sloupec `coffee_name` pokud chybí |

---

## Očekávaný výsledek

| Před | Po |
|------|-----|
| Klient vybere "Jiné" → nic nezadá | Klient musí specifikovat co pil |
| Trenér vidí "Ostatní 30ml" | Trenér vidí "Matcha 30ml" |
| Vágní záznamy | Konkrétní záznamy pro analýzu |
