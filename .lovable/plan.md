

# Vylepšení AI Import Faktur pro Vilgain faktury

## Analýza vaší faktury

Z faktury `881/2025/9035` od **Vilgain s.r.o.** jsem identifikoval následující strukturu:

**Metadata faktury:**
- Dodavatel: Vilgain s. r. o.
- IČO dodavatele: 29269555
- Číslo faktury: 881/2025/9035
- Datum vystavení: 26.06.2025
- Variabilní symbol: 5341828
- Způsob platby: Online platba

**Struktura položek (tabulka):**
| Zboží | Množství | Netto/MJ | Daň % | Netto | DPH | Brutto |
|-------|----------|----------|-------|-------|-----|--------|
| Vilgain Clear Whey Isolate Peach fuzz 25 g [PV44916] | 1,000 ks | 33,04 | 12 | 33,04 | 3,96 | 37,00 Kč |

**Klíčové poznatky:**
- Produkty mají **SKU kódy** v hranatých závorkách: `[PV44916]`
- Ceny jsou rozděleny na: **Netto/MJ** (nákupní za kus bez DPH), **Brutto** (s DPH)
- Množství ve formátu `1,000 ks` (čárka jako desetinný oddělovač)
- Faktura má více stran (2 strany)
- Obsahuje řádek **Poštovné** (doprava) - neměl by se naskladňovat

---

## Co chybí v aktuální implementaci

### 1. Extrakce SKU kódů
Aktuálně se neextrahuje SKU kód produktu (např. `[PV44916]`), který je klíčový pro:
- Přesné mapování na existující produkty
- Budoucí automatické rozpoznání produktů

### 2. Filtrování nevhodných položek
Položky jako **Poštovné**, **Doprava**, **Balné** by měly být automaticky označeny jako "nevybráno" nebo filtrovány.

### 3. Podpora více stran PDF
Faktura má 2 strany s položkami - AI musí analyzovat celý dokument.

### 4. Rozpoznání brutto vs netto ceny
Vilgain faktury mají obě ceny - měla by být jasná volba, kterou cenu použít jako nákupní.

### 5. Uložení SKU pro existující produkty
Možnost přiřadit SKU kód k produktu pro budoucí automatické mapování.

### 6. Zobrazení DPH sazby
Některé produkty mají 12%, jiné 21% - důležité pro účetnictví.

---

## Technické změny

### 1. Rozšíření rozhraní `ParsedInvoiceItem`

Přidám nová pole:
- `skuCode` - SKU/katalogové číslo produktu (např. "PV44916")
- `unitPriceNet` - cena bez DPH za kus
- `unitPriceGross` - cena s DPH za kus
- `vatRate` - sazba DPH (12, 21)
- `isShipping` - příznak pro položky typu doprava/poštovné

### 2. Vylepšení AI promptu

Aktualizuji prompt v edge funkci aby:
- Extrahoval SKU kódy z názvů položek `[PVXXXXX]`
- Rozpoznal položky typu doprava/poštovné
- Vrátil jak netto tak brutto ceny
- Zpracoval všechny strany dokumentu

### 3. Vylepšení UI

**Nové funkce v dialogu:**
- Zobrazení SKU kódu u položek
- Automatické odznačení poštovného
- Přepínač "Použít ceny s DPH / bez DPH"
- Možnost uložit SKU kód k produktu při vytvoření

**Vizuální indikátory:**
- Badge pro položky s SKU
- Varování pro položky typu "doprava"
- Zobrazení DPH sazby

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `supabase/functions/parse-invoice/index.ts` | Rozšířený prompt, extrakce SKU, filtr dopravy |
| `src/hooks/useInvoiceImport.ts` | Nová pole, logika pro uložení SKU |
| `src/components/sales/InvoiceItemRow.tsx` | Zobrazení SKU, DPH, badge pro dopravu |
| `src/components/sales/InvoiceImportDialog.tsx` | Přepínač netto/brutto, souhrn DPH |

---

## Databázové změny

Přidám sloupec pro SKU kód do tabulky produktů:

```sql
ALTER TABLE products ADD COLUMN sku_code TEXT;
CREATE INDEX idx_products_sku ON products(sku_code) WHERE sku_code IS NOT NULL;
```

Toto umožní automatické mapování produktů podle SKU v budoucích importech.

---

## Ukázka vylepšeného UI

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📄 Import faktury                                          [X] │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Rozpoznáno 15 položek z faktury                              │
│                                                                 │
│ Dodavatel: Vilgain s.r.o.        IČO: 29269555                  │
│ Č. faktury: 881/2025/9035        Datum: 26.06.2025              │
│ VS: 5341828                      Celkem: 3 932 Kč               │
│                                                                 │
│ Cenová základna: (○) Netto (bez DPH)  (●) Brutto (s DPH)       │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ [☑] Vybrat vše (14 produktů, 1 doprava)                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [☑] Vilgain Clear Whey Isolate Peach fuzz 25g      [Nový]   │ │
│ │     [PV44916]  DPH: 12%                                     │ │
│ │     Počet: [1] ks                                           │ │
│ │     Nákupní: [37.00] Kč    Prodejní: [75] Kč                │ │
│ │     Kategorie: [▼ Doplněk]                                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [☑] Vilgain Protein Iced Coffee karamelové latté   [Nový]   │ │
│ │     [PV45967]  DPH: 12%                                     │ │
│ │     Počet: [17] ks                                          │ │
│ │     Nákupní: [49.00] Kč    Prodejní: [89] Kč                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [☐] Poštovné                              [🚚 Doprava]      │ │
│ │     ⚠️ Položka typu doprava - automaticky odznačena         │ │
│ │     89.00 Kč                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ K naskladnění: 52 ks (14 nových produktů)                       │
│ Nákupní cena: 3 843 Kč                                          │
│ DPH 12%: 411,75 Kč  |  DPH 21%: 15,45 Kč                        │
│                                                                 │
│ [x] Přidat jako náklad (3 843 Kč do "Nákup zboží")              │
│ [x] Uložit SKU kódy k novým produktům                           │
│                                                                 │
│                              [Zrušit] [Naskladnit 14 položek]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementační pořadí

1. **Databázová migrace** - přidat sloupec `sku_code`
2. **Edge funkce** - vylepšený prompt pro Vilgain faktury
3. **Hook** - rozšířené rozhraní a logika pro SKU
4. **UI komponenty** - nové zobrazení položek
5. **Testování** - ověření s vaší fakturou

