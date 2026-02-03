
# Vylepšení dialogu "Dokončit trénink" - Tagy a platební metody

## Identifikované problémy

### 1. Sekce tagů ("Doplňte povinné tagy")
**Aktuální stav:**
- Collapsible layout s expandovanými kategoriemi
- Presets jako horizontální scroll (špatně viditelné)
- Složité na mobilní orientaci
- Uživatel musí klikat na jednotlivé kategorie

### 2. Platební metody v ParticipantPaymentCard
**Aktuální stav:**
- 5 tlačítek v jednom řádku s pill-style selector
- Text "Později" přetéká na malých obrazovkách
- Použitý `shortLabel` ale stále moc dlouhý

---

## Navržené řešení

### A. Přepracování sekce tagů - "Quick Tag Grid"

Nahradit `CompactTagSelector` za jednodušší **grid layout s přímým výběrem**:

```text
╭──────────────────────────────────────────────────────────╮
│ ⚠️ Doplňte povinné tagy                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ RYCHLÁ VOLBA (preset chips)                              │
│ ╭─────────╮ ╭─────────╮ ╭─────────╮ ╭─────────╮         │
│ │💪Silový │ │🌿Regene │ │❤️Kondice│ │⚡Horní │         │
│ ╰─────────╯ ╰─────────╯ ╰─────────╯ ╰─────────╯         │
│                                                          │
│ ─────── nebo vyberte jednotlivě ───────                  │
│                                                          │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│ │  ZAMĚŘENÍ  ⚠️ │ │  INTENZITA ⚠️ │ │   PARTIE   ⚠️ │   │
│ │ [▼ Vybrat...] │ │ [▼ Vybrat...] │ │ [▼ Vybrat...] │   │
│ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                          │
│ Vybrané: [Síla ×] [Těžký ×] [Horní část ×]              │
╰──────────────────────────────────────────────────────────╯
```

**Klíčové změny:**
1. **Prominent presets** - velké chips místo malých scrollovaných tlačítek
2. **3-column grid** s dropdowny pro jednotlivé typy tagů
3. **Visual indicator** (⚠️) u chybějících tagů
4. **Removable chips** pro vybrané tagy
5. Odstranění collapsible sekcí - vše viditelné najednou

---

### B. Oprava přetékání "Později" v platebních metodách

**Změny v `ParticipantPaymentCard.tsx`:**

1. **Zkrátit labels:**
   ```typescript
   const paymentOptions = [
     { value: 'credit', shortLabel: 'Kredit', icon: Wallet },
     { value: 'cash', shortLabel: 'Cash', icon: Banknote },     // "Hotově" → "Cash"
     { value: 'card', shortLabel: 'Karta', icon: CreditCard },  // "Kartou" → "Karta"
     { value: 'bank', shortLabel: 'Banka', icon: Building2 },   // "Převodem" → "Banka"
     { value: 'pending', shortLabel: 'Dluží', icon: Clock },    // "Později" → "Dluží"
   ];
   ```

2. **Responsive text visibility:**
   - Na mobilu: pouze ikony
   - Na tabletu/desktopu: ikony + text

3. **Flexbox fix:**
   ```tsx
   // Zajistit min-width a text-overflow
   <span className="hidden xs:inline text-[10px] truncate max-w-[40px]">
     {option.shortLabel}
   </span>
   ```

---

### C. Celkové grafické vylepšení dialogu

**Změny v `TrainingDetail.tsx` (dialog sekce):**

1. **Premium glassmorphism styl:**
   ```tsx
   <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border-border/50">
   ```

2. **Success header gradient** (už existuje v `CompleteTrainingDialog`, přenést sem)

3. **Strukturovanější layout:**
   - Header s checkmark ikonou
   - Sekce tagů jako "card-floating"
   - Sekce účastníků s vlastním headerem
   - Fixed footer s tlačítky

---

## Detailní technické změny

### Soubor 1: `src/components/trainings/CompactTagSelector.tsx`

**Kompletní redesign:**

```tsx
export function CompactTagSelector({
  selectedTagIds,
  onChange,
  trainingType,
  missingTypes = [],
}: CompactTagSelectorProps) {
  const { data: tags = [] } = useTags();
  
  // Group tags by essential types only
  const focusTags = tags.filter(t => t.tag_type === 'focus');
  const intensityTags = tags.filter(t => t.tag_type === 'intensity');
  const bodyPartTags = tags.filter(t => t.tag_type === 'body_part' && CATEGORY_NAMES.includes(t.name));
  
  return (
    <div className="space-y-4">
      {/* Presets - prominent 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {TAG_PRESETS.map(preset => (
          <button
            key={preset.name}
            onClick={() => handleApplyPreset(preset)}
            className={cn(
              "flex items-center gap-2 p-3 rounded-xl border text-left transition-all",
              "bg-card/60 hover:bg-card hover:shadow-md hover:-translate-y-0.5",
              "border-border/50"
            )}
          >
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${preset.color}20` }}>
              {preset.icon}
            </div>
            <span className="text-sm font-medium">{preset.name}</span>
          </button>
        ))}
      </div>
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            nebo vyberte
          </span>
        </div>
      </div>
      
      {/* 3-column dropdown grid */}
      <div className="grid grid-cols-3 gap-2">
        <TagDropdownSelect
          label={missingTypes.includes('focus') ? "Zaměření ⚠️" : "Zaměření"}
          options={focusTags.map(t => ({ id: t.id, label: t.name }))}
          value={selectedTagIds.find(id => focusTags.some(t => t.id === id)) || null}
          onChange={(id) => handleTagTypeSelect('focus', id)}
          className={missingTypes.includes('focus') ? "ring-1 ring-warning" : ""}
        />
        {/* ... similar for intensity and body_part */}
      </div>
      
      {/* Selected tags as removable chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <Badge key={tag.id} className="gap-1 pr-1">
              {tag.name}
              <button onClick={() => removeTag(tag.id)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Soubor 2: `src/components/trainings/ParticipantPaymentCard.tsx`

**Změny pro přetékání:**

```tsx
const paymentOptions = [
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kredit', mobileLabel: '', icon: Wallet },
  { value: 'cash', label: 'Hotově', shortLabel: 'Cash', mobileLabel: '', icon: Banknote },
  { value: 'card', label: 'Kartou', shortLabel: 'Karta', mobileLabel: '', icon: CreditCard },
  { value: 'bank', label: 'Převodem', shortLabel: 'Banka', mobileLabel: '', icon: Building2 },
  { value: 'pending', label: 'Později', shortLabel: 'Dluží', mobileLabel: '', icon: Clock },
];

// V render:
<button className="relative z-10 flex-1 flex items-center justify-center gap-0.5 py-2 px-0.5 rounded-lg text-[10px] font-medium min-w-0">
  <Icon className="w-4 h-4 shrink-0" />
  <span className="hidden sm:block truncate">{option.shortLabel}</span>
</button>
```

### Soubor 3: `src/pages/TrainingDetail.tsx` (dialog sekce)

**Layout vylepšení:**

```tsx
<Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
  <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
    {/* Premium header with gradient */}
    <DialogHeader className="relative px-4 pt-4 pb-3 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-success/15 via-success/5 to-transparent rounded-t-2xl pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <div className="p-2 rounded-xl bg-success/20 ring-1 ring-success/30">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold">Dokončit trénink</DialogTitle>
          <DialogDescription className="text-xs">
            Zkontrolujte účastníky a platby
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
    
    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
      {/* Tags section - with floating card styling */}
      {!dialogTagValidation.isValid && (
        <div className="p-3 bg-warning/5 backdrop-blur-sm rounded-xl border border-warning/30 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium text-warning">Doplňte povinné tagy</span>
          </div>
          <CompactTagSelector
            selectedTagIds={dialogTagIds}
            onChange={setDialogTagIds}
            trainingType={dialogTrainingType}
            missingTypes={dialogTagValidation.missingTypes}
          />
        </div>
      )}
      
      {/* ... rest of content */}
    </div>
    
    {/* Fixed footer */}
    <div className="shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 flex gap-2">
      {/* buttons */}
    </div>
  </DialogContent>
</Dialog>
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/trainings/CompactTagSelector.tsx` | Kompletní redesign - grid layout, prominent presets, dropdowny |
| `src/components/trainings/ParticipantPaymentCard.tsx` | Zkrátit labels, responsive text, opravit přetékání |
| `src/pages/TrainingDetail.tsx` | Premium dialog styling, lepší layout sekcí |

---

## Vizuální srovnání

### PŘED - Tag selector:
```text
┌──────────────────────────────────────┐
│ ← [Silový] [Regene] [Kondice] [H →   │ ← scroll
│                                      │
│ ▼ Zaměření (collapsible)             │
│   [Síla] [Mobilita] [Kardio] ...     │
│                                      │
│ ▼ Intenzita (collapsible)            │
│   [Lehký] [Střední] [Těžký]          │
│                                      │
│ ▼ Partie (collapsible)               │
│   [Horní] [Dolní] [Core] ...         │
└──────────────────────────────────────┘
```

### PO - Tag selector:
```text
╭──────────────────────────────────────╮
│ ╭─────────╮  ╭─────────╮             │
│ │💪Silový │  │🌿Regene │             │ ← 2x2 grid
│ ╰─────────╯  ╰─────────╯             │
│ ╭─────────╮  ╭─────────╮             │
│ │❤️Kondice│  │⚡Horní │             │
│ ╰─────────╯  ╰─────────╯             │
│                                      │
│ ─────── nebo vyberte ────────        │
│                                      │
│ [Zaměření⚠️▼] [Intenzita⚠️▼] [Partie▼]│ ← 3 dropdowns
│                                      │
│ [Síla ×] [Těžký ×] [Horní ×]         │ ← removable
╰──────────────────────────────────────╯
```

### PŘED - Platební metody:
```text
┌─────────────────────────────────────────────────────────┐
│ [Kredit] [Hotově] [Kartou] [Převodem] [Později←overflow]│
└─────────────────────────────────────────────────────────┘
```

### PO - Platební metody:
```text
╭─────────────────────────────────────────────────────────╮
│ [💰Kredit] [💵Cash] [💳Karta] [🏦Banka] [⏰Dluží]       │ ← desktop
├─────────────────────────────────────────────────────────┤
│ [💰] [💵] [💳] [🏦] [⏰]                                │ ← mobile (icons only)
╰─────────────────────────────────────────────────────────╯
```
