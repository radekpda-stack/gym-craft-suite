
# AI Import Faktur do Skladu

## Přehled

Přidání nové funkce **Import faktury** do sekce Prodej → Sklad, která pomocí AI automaticky extrahuje položky z nahrané faktury (PDF/obrázek) a umožní je hromadně naskladnit s možností zápisu do nákladů.

---

## Workflow uživatele

```text
1. Klikne na "Import faktury"
         ↓
2. Nahraje fakturu (PDF, JPG, PNG)
         ↓
3. AI zpracuje a extrahuje položky
         ↓
4. Zobrazí se tabulka s položkami:
   ☑ Protein bar     10 ks   25 Kč   45 Kč
   ☐ BCAA 500g       5 ks    180 Kč  349 Kč
   ☑ Shaker          3 ks    35 Kč   89 Kč
         ↓
5. Uživatel vybere položky checkboxem
         ↓
6. Zvolí: [x] Přidat do nákladů
         ↓
7. Klikne "Naskladnit vybrané (3 položky)"
         ↓
8. Položky se přidají/aktualizují v produktech
   + vytvoří se záznam v nákladech
```

---

## UI komponenty

### Tlačítko v StockManagement

```text
[Zobrazit marži]       [Příjem zboží] [📄 Import faktury] [+ Přidat položku]
```

### Dialog pro import faktury

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📄 Import faktury                                          [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │     📤 Přetáhněte fakturu sem nebo klikněte pro výběr       │ │
│ │                                                             │ │
│ │     Podporované formáty: PDF, JPG, PNG                      │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Zpracovat AI]                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Po zpracování AI

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📄 Import faktury                                          [X] │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Rozpoznáno 5 položek z faktury                               │
│                                                                 │
│ Dodavatel: FitShop s.r.o.                                       │
│ Číslo faktury: FV-2026-0142                                     │
│ Datum: 27.1.2026                                                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ [☑] Vybrat vše                                                  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [☑] Protein bar                                    [Nový]   │ │
│ │     Počet: [10] ks                                          │ │
│ │     Nákupní cena: [25] Kč    Prodejní cena: [45] Kč         │ │
│ │     Kategorie: [▼ Svačina]                                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [☑] BCAA 500g                           [Existující ✓]      │ │
│ │     Počet: [5] ks   (+5 ks na sklad)                        │ │
│ │     Nákupní cena: [180] Kč                                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [☐] Neznámá položka XYZ                            [Nový]   │ │
│ │     ⚠ Nepodařilo se určit kategorii                         │ │
│ │     Počet: [2] ks                                           │ │
│ │     Nákupní cena: [?] Kč    Prodejní cena: [?] Kč           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ Celkem k naskladnění: 15 ks (2 nové produkty, 1 existující)     │
│ Celková nákupní cena: 1 430 Kč                                  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [x] Přidat jako náklad do kategorie "Nákup zboží"           │ │
│ │     Náklad 1 430 Kč bude automaticky zaznamenán             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Zrušit] [Naskladnit 3 položky]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### 1. Edge funkce `parse-invoice`

Nová edge funkce využívající Lovable AI (Gemini) pro parsování faktur:

```text
supabase/functions/parse-invoice/index.ts

Vstup:
- fileBase64: string (base64 encoded PDF/image)
- mimeType: string (application/pdf, image/jpeg, image/png)
- existingProducts: string[] (seznam názvů existujících produktů pro matching)

Výstup:
{
  success: true,
  invoice: {
    supplier: "FitShop s.r.o.",
    invoiceNumber: "FV-2026-0142",
    date: "2026-01-27",
    totalAmount: 1430
  },
  items: [
    {
      name: "Protein bar",
      quantity: 10,
      purchasePrice: 25,
      suggestedSellPrice: 45,
      suggestedCategory: "snack",
      matchedProductId: null,          // null = nový produkt
      matchedProductName: null,
      confidence: 0.95
    },
    {
      name: "BCAA 500g",
      quantity: 5,
      purchasePrice: 180,
      suggestedSellPrice: null,
      matchedProductId: "abc-123",     // existující produkt
      matchedProductName: "BCAA Powder 500g",
      confidence: 0.87
    }
  ]
}
```

### 2. AI Prompt pro parsování

```text
Analyzuj tuto fakturu a extrahuj všechny položky produktů/zboží.

Pro každou položku urči:
1. Název produktu
2. Počet kusů
3. Nákupní cenu za kus (bez DPH pokud je uvedeno)
4. Navrhni prodejní cenu (typicky 1.5-2x nákupní)
5. Navrhni kategorii: supplement, drink, snack, equipment, other

Pokud je položka podobná některému z existujících produktů, uveď shodu.
Existující produkty: [seznam]

Vrať JSON ve formátu: { invoice: {...}, items: [...] }
```

### 3. Frontend komponenty

| Soubor | Popis |
|--------|-------|
| `src/components/sales/InvoiceImportDialog.tsx` | Hlavní dialog s upload a náhledem |
| `src/components/sales/InvoiceItemRow.tsx` | Řádek položky s checkbox a editací |
| `src/hooks/useInvoiceImport.ts` | Hook pro volání edge funkce a správu stavu |

### 4. Logika importu

```typescript
// Pro vybrané položky:
for (item of selectedItems) {
  if (item.matchedProductId) {
    // Existující produkt - pouze aktualizovat stock_quantity
    await updateProduct({
      id: item.matchedProductId,
      stock_quantity: existingStock + item.quantity
    });
  } else {
    // Nový produkt - vytvořit
    await createProduct({
      name: item.name,
      price: item.suggestedSellPrice,
      purchase_price: item.purchasePrice,
      category: item.suggestedCategory,
      kind: 'inventory',
      stock_quantity: item.quantity
    });
  }
}

// Pokud je zaškrtnuto "Přidat jako náklad"
if (createExpense) {
  await createExpense({
    name: `Import faktury: ${invoice.invoiceNumber || 'Bez čísla'}`,
    description: selectedItems.map(i => `${i.name} (${i.quantity}x)`).join(', '),
    amount: totalPurchasePrice,
    date: invoice.date || today,
    category: 'inventory'
  });
}
```

---

## Soubory k vytvoření

| Soubor | Popis |
|--------|-------|
| `supabase/functions/parse-invoice/index.ts` | Edge funkce pro AI parsování |
| `src/components/sales/InvoiceImportDialog.tsx` | Hlavní dialog |
| `src/components/sales/InvoiceItemRow.tsx` | Řádek položky |
| `src/hooks/useInvoiceImport.ts` | Hook pro import |

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/sales/StockManagement.tsx` | Přidat tlačítko "Import faktury" |
| `supabase/config.toml` | Přidat novou funkci parse-invoice |

---

## Doplňující funkce (na které jsi zapomněl)

1. **Automatické mapování produktů** - AI porovná názvy z faktury s existujícími produkty a navrhne shody (fuzzy matching)

2. **Uložení dodavatele** - Možnost uložit informace o dodavateli pro budoucí reference

3. **Historie importů** - Možnost zobrazit předchozí importy (v nákladech jako popis)

4. **Validace duplicit** - Upozornění pokud faktura s podobným číslem už byla importována

5. **Návrh marže** - AI automaticky navrhne prodejní cenu na základě typické marže v kategorii (např. nápoje 80%, suplementy 60%)

6. **Batch úprava prodejní ceny** - Možnost hromadně nastavit marži pro všechny položky (např. +50%)

7. **Seskupení podle kategorie** - Položky ve výsledku seskupit podle navržené kategorie

8. **Varování při nízké marži** - Zvýraznění položek kde je marže pod 20%

---

## Bezpečnost

- Edge funkce vyžaduje autentizaci (Authorization header)
- Soubory se neukládají na server, zpracují se pouze v paměti
- Rate limiting pro prevenci zneužití AI

---

## Výhody řešení

- **Úspora času**: Místo ručního zadávání 10+ položek stačí nahrát fakturu
- **Přesnost**: AI extrahuje přesné částky a množství
- **Integrace s náklady**: Automatický zápis do evidence nákladů
- **Chytré mapování**: Rozpozná existující produkty a pouze dorovná sklad
- **Flexibilita**: Možnost upravit jakoukoliv hodnotu před importem
