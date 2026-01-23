
# Plán: Vylepšení zadávání jídla pro klienta

## Ověření stavu

### ✅ Co funguje správně:
1. **Data se správně propisují** - záznamy z klientského portálu jsou viditelné v trenérské aplikaci:
   - `ClientNutritionCard` - přehled u klienta
   - `NutritionClientDetail` (`/nutrition/client/:clientId`) - detailní týdenní pohled
   - Trenér může přidávat komentáře k jednotlivým záznamům
   
2. **Současné UI je již zjednodušené**:
   - Jedno tlačítko "Přidat jídlo nebo nápoj"
   - Autocomplete s historií a běžnými jídly
   - Quick add pro vodu (+300ml) a kávu (+1)

### ⚠️ Identifikované problémy k opravě:

---

## Problém 1: Příliš mnoho kroků při zadávání jídla

**Současný stav:**
```
Klik "Přidat jídlo" → Výběr typu (Jídlo/Pití/Káva) → Formulář
```

**Řešení:** Sloučit výběr typu přímo do jednoho formuláře s taby nahoře

### Změny v `src/components/client-portal/nutrition/FoodLogForm.tsx`:

```typescript
// PŘED: Dvoustupňový flow (výběr typu → formulář)
step === 'type' ? <TypeSelector /> : <Form />

// PO: Jeden formulář s taby nahoře
<Tabs defaultValue="food">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="food">🍽️ Jídlo</TabsTrigger>
    <TabsTrigger value="drink">💧 Pití</TabsTrigger>
    <TabsTrigger value="coffee">☕ Káva</TabsTrigger>
  </TabsList>
  <TabsContent value="food">{/* Food form */}</TabsContent>
  <TabsContent value="drink">{/* Drink form */}</TabsContent>
  <TabsContent value="coffee">{/* Coffee form */}</TabsContent>
</Tabs>
```

**Výsledek:** Místo 2 kliků stačí 1 klik

---

## Problém 2: Quick presety jsou schované

**Současný stav:**
- Presety (Ovesná kaše, Kuřecí prsa...) se zobrazují až po výběru typu jídla
- Jsou v collapsible sekci "Rychlá volba"

**Řešení:** Zobrazit presety prominentně hned pod autocomplete

### Změny v `FoodLogForm.tsx`:

```typescript
// Zobrazit presety přímo pod autocomplete (ne v collapsible)
<div className="space-y-2">
  <Label className="text-xs text-muted-foreground">Co jsi jedl/a?</Label>
  <FoodAutocomplete ... />
  
  {/* Presety přímo viditelné */}
  {description.length === 0 && (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {currentPresets.slice(0, 6).map(preset => (
        <Button 
          key={preset.description}
          variant="outline" 
          size="sm"
          className="h-7 text-xs"
          onClick={() => selectPreset(preset)}
        >
          {preset.icon} {preset.description}
        </Button>
      ))}
    </div>
  )}
</div>
```

**Výsledek:** Klient vidí běžná jídla ihned, může je vybrat jedním klikem

---

## Problém 3: TodayEntries nezobrazuje všechny detaily

**Současný stav:**
- Zobrazuje: typ jídla, popis, porci, čas
- NEzobrazuje: kvalitu, pocit sytosti, poznámku

**Řešení:** Přidat tyto detaily (pokud jsou vyplněné)

### Změny v `src/components/client-portal/nutrition/TodayEntries.tsx`:

```typescript
// V food entries přidat:
{entry.quality && (
  <span className="text-xs">
    {entry.quality === 'good' ? '💚' : entry.quality === 'poor' ? '🔴' : '🟡'}
  </span>
)}
{entry.satiation && (
  <span className="text-xs text-muted-foreground">
    {entry.satiation === 'just_right' ? 'Akorát' : 
     entry.satiation === 'still_hungry' ? 'Hlad' : 'Přejedení'}
  </span>
)}
{entry.note && (
  <p className="text-xs text-muted-foreground italic mt-1">{entry.note}</p>
)}
```

---

## Problém 4: Volitelné detaily jsou příliš skryté

**Současný stav:**
- "Více detailů" v collapsible - klient nemusí vědět, že tam jsou
- Obsahuje: kvalitu jídla, pocit sytosti, poznámku

**Řešení:** Přejmenovat na jasnější label a zobrazit hint

```typescript
<CollapsibleTrigger>
  <span>📝 Přidat hodnocení (volitelné)</span>
  <span className="text-[10px] text-muted-foreground">
    Kvalita, sytost, poznámka
  </span>
</CollapsibleTrigger>
```

---

## Souhrn změn

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/nutrition/FoodLogForm.tsx` | Sloučit kroky do tabs, zobrazit presety prominentně |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | Přidat zobrazení quality, satiation, note |

---

## Vizuální výsledek

### Nový formulář (jeden krok místo dvou):
```
┌─────────────────────────────────────────┐
│ Přidat záznam                       [×] │
├─────────────────────────────────────────┤
│ [🍽️ Jídlo] [💧 Pití] [☕ Káva]         │
├─────────────────────────────────────────┤
│ Datum: 23. ledna 2025                   │
├─────────────────────────────────────────┤
│ [🌅Snídaně][☀️Oběd][🌙Večeře][🍎Svač.] │
├─────────────────────────────────────────┤
│ 🔍 Co jsi jedl/a?                       │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ [🥣Ovesná kaše][🍳Vajíčka][🥗Salát]... │  ← Presety viditelné!
├─────────────────────────────────────────┤
│ [🥄Malá] [🍽️Střední] [🍳Velká]          │
├─────────────────────────────────────────┤
│ ▸ 📝 Přidat hodnocení (volitelné)       │
├─────────────────────────────────────────┤
│              [Uložit]                   │
└─────────────────────────────────────────┘
```

### Záznamy s více detaily:
```
┌─────────────────────────────────────────┐
│ 🍽️ Oběd                         12:30  │
│ Kuřecí prsa s rýží                      │
│ Střední porce 💚 Akorát                 │
│ 📝 Domácí příprava                      │
└─────────────────────────────────────────┘
```

---

## Očekávaný výsledek

1. **Rychlejší zadávání** - 1 klik místo 2 pro výběr typu
2. **Presety ihned viditelné** - běžná jídla na dosah
3. **Více informací v přehledu** - klient vidí co vyplnil
4. **Jasný hint** - volitelné detaily mají popis
