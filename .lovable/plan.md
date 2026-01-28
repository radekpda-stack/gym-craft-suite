
# Plán: Odstranění FAB a přidání tlačítka "Přidat trénink" do rozvrhu

## Shrnutí požadavků
- **Odstranit** globální FAB (velké modré plus) z celé aplikace
- **Přidat** tlačítko "Přidat trénink" přímo do headeru stránky Rozvrh

## Technické úpravy

### 1. Odstranění globálního FAB z Layout

**Soubor:** `src/components/layout/Layout.tsx`

Odstranit:
- Import `QuickActionButton` (řádek 7)
- Renderování `<QuickActionButton />` (řádek 102)

### 2. Přidání tlačítka do rozvrhu

**Soubor:** `src/pages/SchedulePage.tsx`

V headeru (řádky 316-351) přidat tlačítko "Přidat trénink" vedle stávajících tlačítek:

```text
┌────────────────────────────────────────────────────┐
│  Rozvrh          [+ Přidat] [🏋️] [⚙️] [Dnes] [📅] │
└────────────────────────────────────────────────────┘
```

Tlačítko bude:
- Primární styl (`variant="default"`)
- Ikona Plus + text "Přidat" (na mobilu jen ikona)
- Volá existující funkci `handleOpenCreate()`

### 3. Úklid nepoužívaných souborů

**Soubory k případnému odstranění (volitelné):**
- `src/components/layout/QuickActionButton.tsx` - již nebude potřeba
- `src/components/ui/floating-action-button.tsx` - používá se na jiných stránkách (TrainingModePage, Exercises), takže **ponechat**

## Výsledné chování

| Před | Po |
|------|-----|
| FAB plovoucí vpravo dole na všech stránkách | Žádný FAB |
| V rozvrhu žádné viditelné tlačítko pro přidání | Tlačítko "Přidat" v headeru rozvrhu |
| Prázdný stav má tlačítko "Přidat trénink" | Zůstává beze změny |

## Dotčené stránky

Stránky, které stále mají vlastní FAB (nezávislé na `QuickActionButton`):
- **TrainingModePage** - má vlastní `FloatingActionButton` ✓
- **Exercises** - má vlastní `FloatingActionButton` ✓  
- **CalendarPage** - má vlastní FAB tlačítko ✓
- **PublicNutritionLog** - má vlastní FAB tlačítko ✓

Tyto zůstanou funkční, protože nepoužívají odstraňovaný `QuickActionButton`.

## Časový odhad
- Odstranění FAB z Layout: 2 minuty
- Přidání tlačítka do SchedulePage: 5 minut
- Testování: 5 minut
