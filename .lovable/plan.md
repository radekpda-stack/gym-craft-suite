
# Oprava importu faktur: chyby při naskladnění + špatné zaúčtování balíků

## Identifikované problémy

### Problém 1: "Naskladnění nebylo dokončeno" + "Faktura nebyla přidána do nákladů"

Funkce `importItems` v `useInvoiceImport.ts` zpracovává produkty **sekvenčně v jednom try/catch bloku**. Pokud selže jakákoliv operace (vytvoření/aktualizace produktu), stane se toto:
- Mutace vyhodí chybu a zobrazí vlastní toast ("Chyba" / "Nepodařilo se aktualizovat produkt")
- Catch blok zachytí chybu a zobrazí druhý toast ("Chyba importu" / chybová zpráva)
- Vytvoření nákladu (expense) se **nikdy nespustí**, protože kód na něj nedojde

Navíc, pokud AI vrátí datum faktury ve špatném formátu (např. "20.02.2026" místo "2026-02-20"), vložení nákladu do databáze selže.

### Problém 2: Balíky vs. jednotlivé kusy se sloučí pod jednu položku

AI prompt v edge funkci `parse-invoice` neobsahuje instrukce pro rozlišení balíků (12ks) od jednotlivých kusů. Výsledek:
- "Energy gel 1ks" za 30 Kč a "Energy gel 12ks balení" za 300 Kč se spárují ke stejnému produktu
- Nákupní cena se přepíše na 300 Kč (cena za balík) místo 25 Kč (cena za kus)
- Prodejní cena je pak vypočtena z 300 Kč, což je chybné

### Drobný problém: SKU kódy se neukládají u nových produktů

Funkce `useCreateProduct` manuálně vybírá pole pro insert a **nezahrnuje `sku_code`**, i když ho volající kód nastaví.

---

## Plán oprav

### A. Odolný import s částečným úspěchem (`useInvoiceImport.ts`)

Aktuální stav: jeden `for` cyklus v try/catch -- jedna chyba zastaví vše.

Nový stav:
- Každý produkt se zpracuje ve vlastním try/catch
- Chyby se kumulují do pole `errors[]`
- Po zpracování VŠECH produktů se pokusí vytvořit náklad (i když některé produkty selhaly)
- Datum faktury se validuje/normalizuje (podpora formátů DD.MM.YYYY, D.M.YYYY)
- Na konci se zobrazí souhrnný toast: "Naskladněno X produktů, Y selhalo"
- Pokud některé selhaly, zobrazí se varování s detaily

### B. Rozlišení balíků vs. kusů v AI promptu (`parse-invoice/index.ts`)

Do systémového promptu přidat explicitní instrukce:

1. **Per-unit kalkulace**: Pokud je položka balení (např. "12x Energy gel" nebo "karton 24ks"), vždy vypočítat cenu ZA KUS -- `purchasePrice = celková_cena / počet_kusů`, `quantity = počet_kusů`
2. **Oddělené položky**: Pokud jsou na faktuře položky se stejným názvem ale různým balením (1ks vs 12ks), vrátit je jako SAMOSTATNÉ řádky s různými cenami za kus
3. **Příznak `isMultipack`**: Přidat nový field `unitInfo` (např. "balení 12ks") pro transparentnost v UI

### C. Podpora `sku_code` v `useCreateProduct` (`useProducts.ts`)

- Přidat `sku_code?: string | null` do `CreateProductInput` interface
- Zahrnout `sku_code` do insert objektu v `mutationFn`

---

## Technické detaily

### Soubory ke změně

| Soubor | Co se změní |
|---|---|
| `src/hooks/useInvoiceImport.ts` | Odolný import: individuální try/catch pro každý produkt, validace data, souhrnný toast |
| `supabase/functions/parse-invoice/index.ts` | Rozšíření AI promptu o instrukce pro multi-packy a per-unit kalkulaci |
| `src/hooks/useProducts.ts` | Přidání `sku_code` do `CreateProductInput` a do insert objektu |

### Detailní změny v `useInvoiceImport.ts`

```text
importItems():
  - Zavést pole: successCount, failedItems[], totalCost
  - Pro kazdy item: try { update/create } catch { push to failedItems }
  - Po smycce: if (createExpenseRecord && totalCost > 0) { try create expense }
  - Validace data: parseDateSafe(state.invoice?.date)
  - Souhrnny toast s vysledky
  - Navratova hodnota: true i pri castecnem uspechu (aby se dialog zavrel)
```

### Detailni zmeny v AI promptu

Pridat do systemoveho promptu sekci:
```text
MULTI-PACK / BULK INSTRUKCE:
- Pokud je polozka baleni (napr. "12x", "karton", "pack", "baleni"),
  VZDY vypocitej cenu za KUS: purchasePrice = celkova_cena / pocet_kusu
- quantity = pocet jednotlivych kusu v baleni
- Pokud faktura obsahuje STEJNY produkt jako jednotlive kusy I jako baleni,
  vrat je jako DVE SAMOSTATNE polozky (obe s cenou za kus)
- Pridej field "unitInfo": null pro jednotlive kusy, "baleni 12ks" pro multi-packy
```
