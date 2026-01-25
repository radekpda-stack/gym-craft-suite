

# Zjednodušení nutričního deníku + export pro ChatGPT

## Shrnutí změn

1. **Odstranit volbu 7/10 dní** - klient může zapisovat průběžně neomezeně
2. **Přidat gramáže k porcím** - orientační rozsahy pro lepší představu klienta
3. **Export pro ChatGPT** - kopírovatelný text s přesnými časy, jídly, porcemi

---

## 1. Odstranění přepínače 7/10 dní

Na stránce `NutritionClientDetail` je přepínač:
```
<Tabs value={periodDays.toString()} onValueChange={...}>
  <TabsList>
    <TabsTrigger value="7">7 dní</TabsTrigger>
    <TabsTrigger value="10">10 dní</TabsTrigger>
  </TabsList>
</Tabs>
```

**Řešení:** Místo přepínače nastavím výchozí období na 10 dní a odstraním Tabs. Trenér uvidí fixně posledních 10 dní (doporučená délka).

---

## 2. Přidání gramáží k velikostem porce

### Nová definice v `constants.ts`

```typescript
export const PORTION_SIZES = [
  { id: 'small', label: 'Malá', icon: '🥄', grams: '~100-150g' },
  { id: 'medium', label: 'Střední', icon: '🍽️', grams: '~200-300g' },
  { id: 'large', label: 'Velká', icon: '🍳', grams: '~350-500g' },
] as const;

export const PORTION_GRAMS: Record<string, string> = {
  small: '~100-150g',
  medium: '~200-300g',
  large: '~350-500g',
};
```

### Úprava zobrazení v `FoodLogForm.tsx`

Aktuální tlačítka:
```
[🥄 Malá] [🍽️ Střední] [🍳 Velká]
```

Nové tlačítka s gramáží:
```
[🥄 Malá       ] [🍽️ Střední    ] [🍳 Velká       ]
[~100-150g     ] [~200-300g      ] [~350-500g      ]
```

---

## 3. Export pro ChatGPT

### Nové tlačítko vedle "Export PDF"

V headeru `NutritionClientDetail`:
```
[📄 PDF] [📋 Pro ChatGPT]
```

### Formát exportovaného textu

```text
Nutriční deník: Lenka Deák
Období: 15.1. - 24.1.2026

=== Sobota 24.1.2026 ===

JÍDLO:
• 07:30 - Snídaně: Ovesná kaše s ovocem, střední porce (~200-300g)
• 12:00 - Oběd: Kuřecí prsa s rýží, velká porce (~350-500g)
• 18:30 - Večeře: Salát s tuňákem, střední porce (~200-300g)

NÁPOJE:
• 08:00 - Voda 300ml
• 14:00 - Voda 500ml

KOFEIN:
• 07:00 - Espresso (1×)
• 14:30 - Cappuccino (1×)

=== Pátek 23.1.2026 ===
...
```

### Dialog s exportem

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Export pro ChatGPT                                [✕]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [═══════════════════════════════════════════════════════]   │
│ │ Nutriční deník: Lenka Deák                            │   │
│ │ Období: 15.1. - 24.1.2026                            │   │
│ │                                                       │   │
│ │ === Sobota 24.1.2026 ===                             │   │
│ │ JÍDLO:                                               │   │
│ │ • 07:30 - Snídaně: Ovesná kaše...                    │   │
│ [═══════════════════════════════════════════════════════]   │
│                                                              │
│              [📋 Kopírovat]  [💾 Stáhnout .txt]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technické kroky

### Krok 1: Aktualizovat `constants.ts`
- Rozšířit `PORTION_SIZES` o pole `grams`
- Přidat `PORTION_GRAMS` mapování pro snadný přístup

### Krok 2: Aktualizovat `FoodLogForm.tsx`
- Zobrazit gramáže pod labely tlačítek porcí
- Upravit styl pro přehlednější zobrazení

### Krok 3: Upravit `NutritionClientDetail.tsx`
- Odstranit `<Tabs>` pro 7/10 dní, nastavit fixně 10 dní
- Přidat tlačítko "Pro ChatGPT"
- Přidat funkci `generateChatGPTExport()` pro formátování textu
- Přidat dialog `ChatGPTExportDialog` s textareaou a tlačítky

### Krok 4: Vytvořit komponentu `ChatGPTExportDialog.tsx`
- Zobrazuje formátovaný text
- Tlačítko "Kopírovat" (navigator.clipboard)
- Tlačítko "Stáhnout .txt" (Blob download)

---

## Výsledek

| Změna | Před | Po |
|-------|------|-----|
| Období | Přepínač 7/10 dní | Fixně 10 dní (doporučení) |
| Porce | Malá, Střední, Velká | + gramáže (~100-150g, ~200-300g, ~350-500g) |
| Export | Pouze PDF | + Kopírovatelný text pro ChatGPT |

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/nutrition/constants.ts` | Přidat gramáže k porcím |
| `src/components/client-portal/nutrition/FoodLogForm.tsx` | Zobrazit gramáže u tlačítek |
| `src/pages/NutritionClientDetail.tsx` | Odstranit Tabs, přidat export ChatGPT |
| `src/components/nutrition/ChatGPTExportDialog.tsx` | Nová komponenta pro export |

