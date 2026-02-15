
# Opravy finančního reportu -- audit účetní spolehlivosti

## Nalezené chyby (ověřeno proti reálným datům)

### 1. Ztráta 4 500 Kc z platební metody `transfer`
Rozpad platebních metod nemapuje hodnotu `transfer` (jen `bank_transfer`, `bank`, `paid_bank`). Platba 4 500 Kc typu `payment` s `payment_method = 'transfer'` se nikam nezapocte.

**Oprava:** Pridat `transfer` do mapovani na `bank_transfer` bucket (radek 724).

### 2. Tydenni prijem ukazuje hodnotu treninku, ne skutecne platby
Mesicni prehled spravne scita realne prijate platby (payment + manual + sales_orders). Ale tydenni prehled na radku 512 pouziva `final_price` z treninku -- to je PLAN, ne skutecnost. Cisla jsou nesrovnatelna.

**Oprava:** Tydenni prijem pocitat stejne jako mesicni -- z `transactions` (payment+manual) a `salesOrders`, ne z `final_price`.

### 3. Zrusene treninky (canceled_training) se nikam nezapocitavaji
Existuje 16 transakcí typu `canceled_training` za 13 200 Kc. Tyto storno poplatky jsou reálný príjem, ale report je ignoruje -- nejsou v `totalIncome`, nejsou v mesícním prehledu, nejsou v platebních metodách.

**Oprava:** Zahrnout `canceled_training` transakce do celkových príjmu a do mesícního i týdenního prehledu jako samostatnou polozku "Storno poplatky".

### 4. Prodejní objednávky za hotovost chybí v payment method breakdown
Cash sales_orders (5 547 Kc) se správne prictou do breakdown (radek 729-736). Ale credit sales_orders (10 422 Kc) se prictou k `credit` bucketu -- to je vsak spatne, protoze kredit uz byl zapocten pri payment transakcich. Dochází k double-countingu.

**Oprava:** Sales orders s `payment_method = 'credit'` NEPRIDAVAT do breakdown (uz jsou zapocteny jako odliv z kreditu klienta). Pridat jen `cash`, `card`, `bank_transfer` sales orders.

### 5. `directPayments` label je zavadejici
Aktuálne `directPayments = paymentIncome - paidTrainingValue = 276 542 - 204 666 = 71 876`. To ale neznamena "prime platby kreditem" -- je to "castka z plateb klientu, ktera jeste nebyla pouzita na treninky". Label v PDF je "Prime platby (kredit)" coz je matouci.

**Oprava:** Prejmenovat na "Nealokovaný kredit" s popiskem "prijato od klientu, ale dosud nevycerpano na treninky".

### 6. `netProfit` formula odecita productCost ale ne cancellation income
`netProfit = totalIncome - totalExpenses - totalProductCost`. Ale `totalIncome` nezahrnuje storno poplatky (bod 3). Po oprave bodu 3 se tohle vyresi automaticky.

### 7. Validacni sekce -- barva semantiky je obracena
Radek 621: `trainedNotPaidDiff >= 0 ? C.success : C.danger`. Ale kladny rozdil znamena "vice odtrenováno nez zaplaceno" = spatne (klient dluzi). Cervena by mela byt pro kladne cislo (dluh), zelena pro nulu nebo zaporne (preplatek).

**Oprava:** Obrátit barvy.

### 8. Klienti -- chybí příjmy z produktů
`clientsData[].totalPaid` pocita jen `payment+manual` transakce. Pokud klient kupuje produkty, jeho castka to neodráží. `topClientsRevenuePercent` je tím zkresleny.

**Oprava:** Pridat produkt purchases z `salesOrders` do klientskych stats.

## Souhrnný plán zmen

### Soubor: `src/hooks/useFinancialReportData.ts`

1. **Pridat `canceled_training` do dotazu na transakce** (nove Promise.all polozka) a zahrnout do `totalIncome`, mesicniho a tydenniho prehledu
2. **Tydenni income** -- prepocitat z plateb/objednavek misto `final_price`
3. **Payment method breakdown** -- pridat `transfer` mapping, odstranit credit sales_orders z breakdown (double-count)
4. **Client stats** -- pridat product purchases z salesOrders
5. **directPayments** -- prejmenovat interface pole na `unallocatedCredit`
6. **Validation barvy** -- prehodit v PDF (ne v data hooku)
7. **Pridat `cancellationIncome`** do summary

### Soubor: `src/lib/financialReportPdf.ts`

1. **Validation barvy** -- obrátit semantiku (kladný diff = danger)
2. **directPayments label** -- zmenit na "Nealokovaný kredit"
3. **Pridat storno poplatky** do KPI breakdown radku
4. **Klienti tabulka** -- pridat sloupec "Produkty" s castkou za nakupy

### Soubor: `src/components/settings/FinancialReportSettings.tsx`

1. **Nahled** -- pridat storno poplatky do rozpadu, opravit label direct payments

### Zadne zmeny databaze
Vse je oprava logiky v kodu.
