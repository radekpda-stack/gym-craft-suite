
# Oprava UI bugů a vylepšení sekce Klasifikace

## Identifikované problémy

| Problém | Příčina | Řešení |
|---------|---------|--------|
| **Dvojitá fajfka (před a za slovem)** | `TagDropdownSelect.tsx` přidává vlastní `<Check>` ikonu (řádek 82), ale Radix UI `SelectItem` již má vestavěnou fajfku přes `SelectPrimitive.ItemIndicator` | Odstranit duplicitní fajfku z `TagDropdownSelect.tsx` |
| **Tečky/překrývající se text pod typem tréninku** | V dropdown trigger se zobrazuje špatně emoji + text | Opravit renderování v `SelectValue` |
| **Chybí možnost specifikovat konkrétní partie** | Při výběru "Horní část", "Dolní část" nebo "Břicho" v compact view se automaticky neotevře podvýběr | Přidat hierarchický výběr přímo do compact dropdownu pomocí sub-menu |

---

## Technické řešení

### 1. Odstranění dvojité fajfky

**Soubor:** `src/components/trainings/TagDropdownSelect.tsx`

**Změna:** Odstranit vlastní `<Check>` ikonu z `SelectItem`, protože Radix UI ji již zobrazuje automaticky.

```typescript
// PŘED (řádek 78-84):
<SelectItem key={option.id} value={option.id}>
  <span className="flex items-center gap-2">
    {option.icon && <span>{option.icon}</span>}
    <span>{option.label}</span>
    {option.id === value && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
  </span>
</SelectItem>

// PO:
<SelectItem key={option.id} value={option.id}>
  <span className="flex items-center gap-2">
    {option.icon && <span>{option.icon}</span>}
    <span>{option.label}</span>
  </span>
</SelectItem>
```

---

### 2. Oprava překrývajícího se textu u typu tréninku

**Soubor:** `src/components/trainings/TagDropdownSelect.tsx`

**Problém:** `SelectValue` může mít problémy s renderováním při změně hodnoty. Ujistit se, že `SelectValue` má správný placeholder a children.

```typescript
// Oprava SelectValue - použít key pro vynucení re-renderu
<SelectValue placeholder={placeholder}>
  {selectedOption ? (
    <span key={selectedOption.id} className="flex items-center gap-1.5">
      {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
      <span className="truncate">{selectedOption.label}</span>
    </span>
  ) : (
    placeholder
  )}
</SelectValue>
```

---

### 3. Hierarchický výběr partií těla v compact view

**Nový přístup:** Nahradit jednoduchý dropdown pro "Partie" speciální komponentou s rozbalovacím sub-menu.

**Nová komponenta:** `BodyPartDropdownSelect.tsx`

```text
┌─────────────────────────────────────────┐
│ Partie                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Horní část ▼                        │ │  ← Dropdown trigger
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Celé tělo                               │  ← Bez podkategorií
├─────────────────────────────────────────┤
│ Horní část                          ▶  │  ← Kliknutí rozbalí
├─────────────────────────────────────────┤
│   ☑ Ramena                              │
│   ☐ Biceps                              │
│   ☐ Triceps                             │
│   ☐ Hrudník                             │
│   ☐ Záda                                │
│   ...                                   │
├─────────────────────────────────────────┤
│ Dolní část                          ▶  │
├─────────────────────────────────────────┤
│ Břicho                              ▶  │
└─────────────────────────────────────────┘
```

**Implementace:**

Použijeme `Popover` s vnořeným `Collapsible` pro každou kategorii:

```typescript
interface BodyPartDropdownSelectProps {
  bodyPartTagIds: string[];
  onBodyPartTagsChange: (ids: string[]) => void;
  availableTags: Tag[];
}

export function BodyPartDropdownSelect({ ... }) {
  const [open, setOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Kategorie s podkategoriemi
  const CATEGORIES = [
    { key: 'full', name: 'Celé tělo', hasChildren: false },
    { key: 'upper', name: 'Horní část', hasChildren: true, children: [...] },
    { key: 'lower', name: 'Dolní část', hasChildren: true, children: [...] },
    { key: 'core', name: 'Břicho', hasChildren: true, children: [...] },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>...</PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        {CATEGORIES.map(category => (
          <div key={category.key}>
            {/* Hlavní kategorie */}
            <div 
              className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer"
              onClick={() => {
                if (category.hasChildren) {
                  setExpandedCategory(
                    expandedCategory === category.key ? null : category.key
                  );
                } else {
                  toggleTag(category.tagId);
                }
              }}
            >
              <span className="flex items-center gap-2">
                {isSelected && <Check className="h-4 w-4" />}
                {category.name}
              </span>
              {category.hasChildren && (
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  expandedCategory === category.key && "rotate-90"
                )} />
              )}
            </div>
            
            {/* Podkategorie */}
            {category.hasChildren && expandedCategory === category.key && (
              <div className="pl-4 border-l-2 border-primary/20 ml-3 space-y-1">
                {category.children.map(child => (
                  <div 
                    key={child.id}
                    className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer"
                    onClick={() => toggleTag(child.id)}
                  >
                    <Checkbox checked={bodyPartTagIds.includes(child.id)} />
                    <span className="text-sm">{child.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

---

## Soubory k úpravě

| Soubor | Typ | Změna |
|--------|-----|-------|
| `src/components/trainings/TagDropdownSelect.tsx` | Úprava | Odstranit duplicitní fajfku, opravit SelectValue |
| `src/components/trainings/BodyPartDropdownSelect.tsx` | **Nový** | Hierarchický výběr partií s rozbalovacími podkategoriemi |
| `src/components/trainings/CompactTagGridSelector.tsx` | Úprava | Nahradit dropdown pro partie novou komponentou |

---

## Shrnutí změn

1. **Oprava dvojité fajfky** - Odstranění zbytečné `<Check>` ikony, ponechání pouze vestavěné od Radix UI

2. **Oprava překrývajícího se textu** - Přidání `key` prop a `shrink-0` pro emoji

3. **Hierarchický výběr partií** - Nový dropdown s možností rozbalit podkategorie:
   - "Celé tělo" - jednoduchý výběr bez podkategorií
   - "Horní část" → rozbalí se: Ramena, Biceps, Triceps, Hrudník, Záda...
   - "Dolní část" → rozbalí se: Přední stehna, Zadní stehna, Hýždě, Lýtka...
   - "Břicho" → rozbalí se: Přímé břišní, Šikmé břišní, Hluboké břišní...

4. **Multi-select s checkboxy** - Možnost vybrat více konkrétních svalů najednou

5. **Badge s počtem** - Zobrazení počtu vybraných partií na trigger tlačítku
