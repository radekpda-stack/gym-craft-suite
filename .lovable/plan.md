

# Vylepšení statistik prodeje -- analýza a plán

## Aktualni stav

Statistiky prodeje (`SalesStatistics.tsx`, 913 radku) uz obsahuji:
- 4 KPI karty (trzby, naklady, zisk, pocet prodeju) se srovnanim s predchozim obdobim
- Area chart -- trzby v case
- Platebni metody (grid)
- Kolacovy graf kategorii
- Line chart -- trend marze
- Sloupcovy graf prodeju podle produktu
- Tabulka nejprodavanejsich produktu
- Sekce Postrehy (SalesInsights)

## Dostupna data (realna)

| Metrika | Hodnota |
|---|---|
| Celkem objednavek | 88 |
| Trzby celkem | 22 072 Kc |
| Unikatnich klientu | 22 |
| Aktivnich dnu | 39 |
| Obdobi | 26.12.2025 -- 13.2.2026 |
| Platebni metody | kredit (53), hotovost (33), karta (2) |
| Kategorii | supplement, bar, water, service, snack, drink |

## Co chybi -- navrhovane zmeny

### 1. Heatmapa prodejnich hodin (DEN x HODINA)
Data `DOW + HOUR` uz mame. Chybi vizualizace -- heatmapa grid ukazujici, kdy se nejvic prodava (pondeli--nedele x 6:00--20:00). Trenérovi to umozni pripravit se na silne hodiny.

### 2. Top klienti -- sloupcovy graf
Mame data o 22 klientech s utratou. Aktualne se nikde nezobrazuji. Pridat horizontalni bar chart "Klienti podle utraty" s top 10 klienty.

### 3. Prumerny prodej na den (KPI karta)
Vypocet: trzby / pocet aktivnich dnu. Pridat jako 5. KPI kartu nebo nahradit "pocet prodeju" dvema mensimi metrikami (pocet + prumer/den).

### 4. Trend poctu prodeju (druha krivka v area chartu)
Existujici area chart ukazuje jen trzby. Pridat druhou krivku (count) s vlastni Y osou -- umoznuje porovnat, zda rust trzeb je tazen objemem nebo cenami.

### 5. Srovnani kategorii v case (Stacked Area / Stacked Bar)
Data o kategoriich mame. Pridat stacked bar chart ukazujici, jak se meni podil kategorii (supplement vs. water vs. bar...) v jednotlivych tydnech/mesicich.

### 6. Prumerná hodnota objednávky (AOV) trend
Data pro vypocet existuji (trzby/pocet za kazdy den). Pridat malou line chartku zobrazujici vyvoj prumerne objednavky v case.

---

## Technicke detaily implementace

### Upravene soubory
- `src/components/sales/SalesStatistics.tsx` -- hlavni soubor, pridani novych sekci
- `src/components/sales/SalesStatistics.tsx` (funkce `fetchPeriodStats`) -- rozsireni o data pro heatmapu, klienty a AOV

### Nove komponenty (doporucene vyextrahovat)
- `src/components/sales/SalesHeatmap.tsx` -- heatmapa hodin (grid 7x15)
- `src/components/sales/TopClientsChart.tsx` -- horizontalni bar chart klientu
- `src/components/sales/CategoryTrendChart.tsx` -- stacked area/bar kategorii

### Datove zmeny
- Rozsireni `fetchPeriodStats()` o:
  - `hourlyHeatmap: { dow: number; hour: number; count: number }[]` -- agregace z `sales_orders.created_at`
  - `clientStats: { name: string; orderCount: number; totalSpent: number }[]` -- GROUP BY client_id
  - `categoryTrend: { period: string; [category]: number }[]` -- GROUP BY date + category
  - `aovTrend: { label: string; aov: number }[]` -- prumer na den

### Poradi sekci (po uprave)
1. KPI karty (5 karet: trzby, naklady, zisk, pocet, prumer/den)
2. Postrehy (SalesInsights -- beze zmen)
3. Trzby v case (area chart s dvojitou krivkou: trzby + pocet)
4. Platebni metody
5. **NOVY** -- Heatmapa prodejnich hodin
6. Kategorie produktu (pie) + Trend marze (line) -- beze zmen
7. **NOVY** -- Srovnani kategorii v case (stacked bar)
8. Prodeje podle produktu (bar) -- beze zmen
9. **NOVY** -- Top klienti podle utraty (horizontal bar)
10. **NOVY** -- AOV trend (mala line chartka)
11. Tabulka nejprodavanejsich -- beze zmen

### Knihovny
Vsechno realizovatelne s `recharts` (uz nainstalovan). Heatmapa pomoci obycejneho CSS gridu s barevnou skalou.

