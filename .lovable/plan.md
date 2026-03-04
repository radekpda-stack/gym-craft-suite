

# Audit sekce Prodej + Import faktur – Fáze 9

---

## Nalezené problémy

### P1: Import faktur NEZAPISUJE stock_movements
`useInvoiceImport.ts` při importu aktualizuje `stock_quantity` přímo přes `updateProduct.mutateAsync`, ale **nevytváří záznam v `stock_movements`** s typem `invoice_import`. Tím se obchází skladový ledger — pohyby skladu z faktur se nezobrazí v časové ose „Pohyby skladu" a audit trail je neúplný.

**Řešení:** Po každém úspěšném importu položky volat `useCreateStockMovement` s `movement_type: 'invoice_import'`, `quantity`, `unit_price` a `source_ref` (číslo faktury).

### P2: Import — `updateProduct` přepisuje stock_quantity absolutně
Řádek 272: `stock_quantity: (item.matchedProduct.stock_quantity || 0) + item.editedQuantity` — ale `matchedProduct` je snapshot z doby parsování. Pokud mezi parsováním a importem proběhl jiný prodej, stock_quantity bude špatně (race condition).

**Řešení:** Místo absolutního nastavení použít inkrementální přístup — buď RPC `increment_stock(product_id, delta)` nebo alespoň fresh read před zápisem.

### P3: Import — edge function posílá celý base64 PDF v body
Pro velké faktury (multi-page PDF) může base64 překročit limit edge function payload (~6MB). Není žádné upozornění ani validace velikosti na klientovi.

**Řešení:** Přidat validaci velikosti souboru na klientovi (max 5MB) s jasnou chybovou hláškou.

### P4: SalesStatistics.tsx má 1130 řádků
Monolitní komponenta s inline charty, výpočty a filtry. Ztěžuje údržbu.

**Řešení:** Ponechat pro pozdější fázi — priorita je funkční oprava importu.

### P5: `useSharedBudgetBalance.ts` je re-export barrel
Stejný problém jako v předchozích fázích — zbytečný soubor.

**Řešení:** Smazat a přesměrovat importy na `useCreditOperations`.

### P6: Import — chybí feedback při částečném selhání
Po importu se zobrazí toast, ale uživatel nevidí KTERÉ položky selhaly a proč. Dialog se zavře po úspěšném importu, takže info zmizí.

**Řešení:** Při částečném selhání nechat dialog otevřený a vizuálně označit selhané položky.

### P7: Import — nové produkty nemají `sku_code` v typu
`createProduct.mutateAsync` dostává `sku_code` jako `any` cast (řádek 287-299), protože `useCreateProduct` typ `sku_code` nepodporuje. TypeScript to nezachytí.

**Řešení:** Ověřit a doplnit `sku_code` do create product typu, nebo ho zapsat zvlášť přes update po vytvoření.

---

## Plán oprav

### 1) Opravit import faktur — stock_movements zápis
- V `useInvoiceImport.ts` importovat `useCreateStockMovement`
- Po každém úspěšném `updateProduct` / `createProduct` zapsat `stock_movement` s `movement_type: 'invoice_import'`
- Jako `source_ref` použít číslo faktury (`state.invoice?.invoiceNumber`)
- Jako `unit_price` použít `editedPurchasePrice`

### 2) Opravit race condition — inkrementální stock update
- Vytvořit DB funkci `rpc_increment_stock(p_product_id UUID, p_delta INT)` která atomicky zvýší stock
- V importu volat tuto RPC místo absolutního nastavení `stock_quantity`

### 3) Přidat validaci velikosti souboru
- V `InvoiceImportDialog.tsx` a `useInvoiceImport.ts` přidat check na `file.size > 5 * 1024 * 1024`
- Zobrazit uživateli srozumitelnou chybovou hlášku

### 4) Zlepšit feedback při částečném selhání
- Při `failedItems.length > 0` a `successCount > 0` nechat dialog otevřený
- Vizuálně označit selhané řádky (červený border + error message)
- Přidat tlačítko „Zkusit znovu" pro selhané položky

### 5) Smazat `useSharedBudgetBalance.ts` barrel
- Přesměrovat importy v `SalesRegister.tsx` na `useCreditOperations`

---

## Technické detaily

### Nová DB migrace
```sql
CREATE OR REPLACE FUNCTION public.rpc_increment_stock(
  p_product_id UUID, 
  p_delta INT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE products 
  SET stock_quantity = stock_quantity + p_delta 
  WHERE id = p_product_id;
END;
$$;
```

### Soubory k úpravě
- `src/hooks/useInvoiceImport.ts` — stock_movements zápis, inkrementální stock, file size check, partial failure handling
- `src/components/sales/InvoiceImportDialog.tsx` — partial failure UI, file size validation
- `src/components/sales/InvoiceItemRow.tsx` — error state vizualizace
- `src/components/sales/SalesRegister.tsx` — přesměrovat import z barrel

### Soubory ke smazání
- `src/hooks/useSharedBudgetBalance.ts`

### Očekávaný dopad
- **Úplný audit trail** — všechny importy faktur viditelné v Pohybech skladu
- **Žádné ztracené kusy** — atomický inkrement místo absolutního přepisu
- **Lepší UX** — jasná chybová hlášení, viditelné selhání jednotlivých položek
- **Čistší kód** — odstranění barrel re-exportu

