
# Plán: Automatické párování tagů partie těla podle cviků

## Přehled

Při přidání cviku do tréninku se automaticky přiřadí odpovídající tagy partie těla na základě svalových skupin cviku.

**Příklad:**
- Přidám "Dřep (Back Squat)" → automaticky se přidá tag **"Dolní část"** + **"Core"**
- Přidám "Bench Press" → automaticky se přidá tag **"Horní část"** + **"Hrudník"**

---

## Jak to funguje

```text
┌─────────────────────────────────────────────────────────────────┐
│  Přidání cviku                                                  │
│  "Dřep (Back Squat)"                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Zjistit svalové skupiny cviku                               │
│     quadriceps, gluteus_maximus, hamstrings, erector_spinae     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Přeložit na body_part_categories (view v databázi)          │
│     → "lower" (Dolní část), "core" (Core)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Najít odpovídající tagy typu "body_part"                    │
│     → "Dolní část" (id: d5f602c0-...)                           │
│     → "Střed těla" (id: 72d6af4d-...)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Přidat tagy k tréninku (pokud ještě nejsou)                 │
│     training_session_tags.insert(...)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Změny

### 1. Nový hook `useAutoTagFromExercise`

**Soubor:** `src/hooks/useAutoTagFromExercise.ts`

Hook bude:
- Přijímat `trainingSessionId` a `exerciseId`
- Používat existující `useExerciseBodyPartCategories` pro získání body_part kategorií cviku
- Mapovat body_part kategorie na tagy pomocí jednoduché lookup tabulky
- Automaticky přidávat chybějící tagy pomocí `useUpdateTrainingSessionTags`

```typescript
// Mapování body_part_key → tag ID
const BODY_PART_TO_TAG: Record<string, string> = {
  'upper': 'd5f602c0-...', // "Horní část"
  'lower': '05427be9-...', // "Dolní část" 
  'core': '72d6af4d-...',  // "Střed těla"
};
```

### 2. Integrace do WorkoutExerciseManager

**Soubor:** `src/components/trainings/WorkoutExerciseManager.tsx`

Po úspěšném přidání cviku (`handleAddExercise`):
1. Zavolat nový hook pro získání body_part kategorií cviku
2. Sloučit s existujícími tagy tréninku
3. Aktualizovat tagy tréninku

```typescript
// V handleAddExercise po úspěšném uložení:
if (data.exercise_id) {
  await autoTagFromExercise(trainingSessionId, data.exercise_id);
}
```

### 3. Notifikace uživateli

Při automatickém přidání tagu zobrazit toast:
```
✓ Automaticky přidáno: Dolní část, Core
```

---

## Mapování kategorií na tagy

| Body Part Key | Tag ID | Tag Name |
|---------------|--------|----------|
| `upper` | `05427be9-cf51-4d10-a5be-749626fdbec2` | Horní část |
| `lower` | `d5f602c0-1711-435e-84d7-6c2863a753a7` | Dolní část |
| `core` | `72d6af4d-345b-46d2-8a22-c456bbdbaa8f` | Střed těla |

---

## Edge cases

| Situace | Řešení |
|---------|--------|
| Cvik nemá svalové skupiny | Nic se neděje, tagy se nepřidávají |
| Tag už je přidán | Přeskočí se (žádné duplicity) |
| Cvik bez exercise_id | Přeskočí se (custom cviky) |
| Trenér ručně odebere tag | Zůstane odebraný (nevrací se) |

---

## Budoucí rozšíření

Funkce bude připravena na:
- Přidávání specifičtějších tagů (např. "Hýždě" místo jen "Dolní část")
- Konfigurovatelnost v nastavení (zapnout/vypnout auto-tagging)
- Sugesce místo automatického přidání (dialog "Chcete přidat tag?")

---

## Soubory k vytvoření/úpravě

| Soubor | Akce |
|--------|------|
| `src/hooks/useAutoTagFromExercise.ts` | **NOVÝ** - hook pro auto-tagging |
| `src/components/trainings/WorkoutExerciseManager.tsx` | Integrace hooku |

---

## Očekávaný výsledek

| Akce | Před | Po |
|------|------|-----|
| Přidám dřep | Musím ručně kliknout "Dolní část" | Automaticky se přidá |
| Přidám bench press | Musím ručně kliknout "Horní část" | Automaticky se přidá |
| Přidám plank | Musím ručně kliknout "Core" | Automaticky se přidá |
| Smíšený trénink | Zaklikávám vše po jednom | Tagy se přidávají průběžně |
