
# Dalsi vylepseni modulu Prodej a Sklad

## Co uz je hotove (z predchoziho planu)
- Historie pohybu skladu (stock_movements + timeline)
- Inventura (stocktaking dialog)
- Export skladu do XLSX
- Oprava importu faktur (resilient import + bulk pricing)

## Navrzene nove upravy a vylepseni

### 1. Hromadne operace se zbozim (Bulk Operations)
Aktualne lze produkty editovat pouze jeden po jednem. Pridame:
- Checkbox u kazde polozky v seznamu skladu
- Plovouci action bar pri vyberu (pocet vybranych + akce)
- Hromadne akce: archivovat/aktivovat, zmenit kategorii, smazat
- Hromadna zmena ceny (procentualni navyseni/snizeni vsech vybranych)

**Zmeny:** `StockManagement.tsx` (checkbox logika, floating action bar, bulk mutace)

---

### 2. Automaticky nakupni seznam (Shopping List)
Na zaklade Stock Velocity predikce automaticky generovat "Nakupni seznam":
- Nova komponenta `ShoppingListPanel.tsx` v sekci Sklad
- Zobrazi produkty, ktere dojdou do X dni (nastavitelny prah, default 14)
- U kazdeho produktu: nazev, aktualni stav, predikce dojezdu, doporucene mnozstvi k objednani (= prumer 30 dni)
- Moznost exportu seznamu do CSV
- Tlacitko v toolbaru skladu

**Nove soubory:** `src/components/sales/ShoppingListDialog.tsx`
**Zmeny:** `StockManagement.tsx` (tlacitko v toolbaru)

---

### 3. Paragon / potvrzeni o nakupu (Receipt)
Po dokonceni prodeje moznost zobrazit/tisknout zjednoduseny paragon:
- Dialog s nahldem paragonu po uspesnem prodeji
- Obsah: datum, cas, polozky, ceny, celkem, platebni metoda, klient
- Tlacitko "Tisknout" (window.print s @media print styly)
- Tlacitko "Stahnout PDF" (pomoci jspdf, ktery je uz nainstalovany)
- Moznost zobrazit paragon i z historie prodeju (tlacitko v detailu objednavky)

**Nove soubory:** `src/components/sales/ReceiptDialog.tsx`
**Zmeny:** `SalesRegister.tsx` (zobrazeni po prodeji), `SalesOrderDetailModal.tsx` (tlacitko "Paragon")

---

### 4. Vylepseni historie prodeju
Aktualni historie zobrazuje max 100 poslednich prodeju. Vylepsime:
- Filtrovani podle platebni metody (chip filtry: Vse, Hotove, Kartou, Kredit, Prevod)
- Filtrovani podle obdobi (dnes, tento tyden, tento mesic, vse)
- Souhrnny radek na vrchu: celkova castka za filtrovane obdobi + pocet prodeju
- Zvyseni limitu na 500 s lazy loading / "Nacist dalsi"

**Zmeny:** `SalesHistory.tsx` (filtry, souhrn, paginace)

---

### 5. Zapinani/vypinani stavu skladu u produktu v pohybu
Pridame do casove osy pohybu skladu rychle filtrovani podle smeru:
- Chip filtry: "Vse", "Naskladneni (+)", "Vyskladneni (-)", "Inventura"
- Male souhrnne KPI nad timeline: celkem naskladneno, celkem vyskladneno za obdobi

**Zmeny:** `StockMovementsTimeline.tsx` (filtry, KPI)

---

## Doporucene poradi implementace

| Priorita | Vylepseni | Slozitost | Dopad |
|---|---|---|---|
| 1 | Hromadne operace (#1) | Stredni | Vysoky -- efektivita |
| 2 | Nakupni seznam (#2) | Nizka | Stredni -- prevence vypadku |
| 3 | Paragon (#3) | Nizka | Stredni -- profesionalita |
| 4 | Vylepseni historie (#4) | Nizka | Stredni -- prehlednost |
| 5 | Filtry pohybu skladu (#5) | Nizka | Nizky -- pohodli |

## Technicke detaily

### Hromadne operace
- Stav `selectedIds: Set<string>` v StockManagement
- "Vybrat vse" checkbox v hlavicce
- AnimatePresence pro floating action bar (Framer Motion)
- Bulk update pres `Promise.all` s updateProduct mutaci
- Hromadna zmena ceny: dialog s inputem pro procenta, nahledy nove ceny

### Nakupni seznam
- Vyuzije existujici `useStockVelocity` hook
- Filtruje produkty kde `daysRemaining !== null && daysRemaining <= threshold`
- Doporucene mnozstvi = `avgDailySales * 30` (mesicni zasoba)
- Export: generovani CSV stringu a download pres Blob

### Paragon
- Sdilena komponenta `ReceiptDialog` pouzitelna z pokladny i z detailu objednavky
- PDF generovani pres `jspdf` (uz nainstalovany) + `jspdf-autotable`
- Tisk pres `window.print()` s dedicnou @media print stylovou sekcí

### Vylepseni historie
- Chip filtry pro platebni metodu (reuse PAYMENT_LABELS)
- Date range preset selector (dnes/tyden/mesic/vse)
- Souhrnny badge: `filteredOrders.reduce(sum => sum + total_amount)`
- Cursor-based paginace: "Nacist dalsi" tlacitko, `.range(offset, offset+50)`
