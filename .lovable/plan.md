
# Opravy dat a modernizace PDF finančního reportu

## Nalezené datové chyby

### 1. Rozpad platebních metod zahrnuje i debety tréninků
Dotaz `allTransactionsWithMethod` zahrnuje typy `training` a `product` (debetní transakce), na jejichž částkách se volá `Math.abs()`. To znamená, že rozpad platebních metod ukazuje nejen příjmy, ale i odběry kreditu za tréninky -- čísla jsou nafouklá.

**Oprava:** Filtrovat pouze typy `payment` a `manual` s `amount > 0` (skutečné příjmy), plus sales_orders (ty už se přidávají zvlášť).

### 2. Dvousloupcový layout v PDF je křehký
Sekce "Souhrn období" a "Tréninky a platby" se pokoušejí o dvousloupcový layout ručním přepočtem `yPos`. Pokud má levý sloupec jiný počet řádků než pravý, sloupce se překrývají nebo mezi nimi vznikají mezery. Zejména řádek 188 (`rightStartY = yPos - (...)`) je odhadnutý offset.

**Oprava:** Uložit startovní `yPos` před vykreslením levého sloupce, pak pravý sloupec začít na stejné pozici.

### 3. Chybějící příjmy z produktů v sales_orders v payment method breakdown
Sales orders se přidávají do payment method breakdown, ale `allTransactionsWithMethod` už může obsahovat i `product` typ transakce -- potenciální dvojí započtení.

**Oprava:** Z `allTransactionsWithMethod` odstranit typ `product` (počítat ho jen z `salesOrders`).

## Modernizace vizuálu PDF

### Aktuální stav
- Oranžové vyplněné obdélníky jako nadpisy sekcí
- Základní `grid` tabulky s oranžovou hlavičkou
- Jednoduchý textový layout bez vizuální hierarchie
- Malé písmo, málo prostoru

### Navrhované změny

**Barvy a styl:**
- Tmavší, profesionálnější paleta: tmavě šedé nadpisy místo oranžových obdélníků
- Oranžová pouze jako akcentní barva (čísla, rozdíly)
- Tabulky: střídavé šedé řádky, tenké linky, bez plných barevných hlaviček
- Větší mezery mezi sekcemi pro vzdušnější design

**Typografie:**
- Zvětšit hlavní titulek (24pt)
- Nadpisy sekcí: uppercase s tenkým spodním pruhem místo plného obdélníku
- Hodnoty metrik: větší písmo (12pt bold) pro klíčová čísla

**Layout:**
- KPI karty nahoře: 3-4 boxy s klíčovými čísly (příjmy, tréninky, klienti, zisk)
- Opravit dvousloupcový layout
- Lepší zarovnání pravého a levého sloupce

**Tabulky:**
- Jemnější styl: `striped` místo `grid`
- Hlavičky: tmavě šedé (ne oranžové)
- Zaoblené rohy přes `roundedRect`

## Technické detaily

### Soubory k úpravě

**`src/hooks/useFinancialReportData.ts`**
- Řádek 309: změnit `allTransactionsWithMethod` dotaz -- odebrat typy `training` a `product`, nechat jen `payment` a `manual` s `amount > 0`
- Řádek 718-724: zjednodušit payment method breakdown (jen payment/manual příjmy + sales orders)

**`src/lib/financialReportPdf.ts`**
- Kompletní přepracování vizuálu:
  - Nová barevná paleta (tmavý header, neutrální tóny)
  - `drawSectionTitle`: tenký spodní pruh + uppercase text místo plného obdélníku
  - KPI boxy na vrchu souhrnu (3-4 vedle sebe s rámečkem)
  - Oprava dvousloupcového layoutu v sekcích Souhrn a Tréninky/Platby
  - Modernější tabulkový styl (striped, tmavě šedé hlavičky)
  - Více whitespace mezi sekcemi
  - Lepší footer s logem

### Žádné databázové změny
Vše se opravuje na úrovni kódu -- dotazy a rendering.
