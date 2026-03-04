

# Audit kreditního systému – Jednotný zdroj pravdy (Fáze 7)

Systém má definovaný zdroj pravdy (ledger views `vw_client_ledger_balances` / `vw_group_ledger_balances`), ale **ne všechny části aplikace ho používají**. Několik míst stále čte zastaralý cached sloupec `clients.credit_balance` nebo `client_budget_groups.shared_balance`, což vytváří nesoulad.

---

## Nalezené problémy

### P1: ClientDetailView zobrazuje cached balance místo ledgeru
`ClientDetailView.tsx` (řádek 387-388) zobrazuje `client.credit_balance || 0` — čte přímo z cached sloupce tabulky `clients`. Tento sloupec se aktualizuje triggerem, ale s prodlevou oproti ledger view.

**Řešení:** Nahradit `client.credit_balance` hodnotou z `useCreditBalanceValue(client.id)`, který čte z ledger view.

### P2: useCreateTransaction čte cached balance po mutaci
`useCreditOperations.ts` (řádky 460-478) po insertu transakce čte `clients.credit_balance` resp. `client_budget_groups.shared_balance` pro zobrazení v toastech. Trigger nemusí stihnout aktualizovat cached sloupec před tímto čtením → zobrazí se stará hodnota.

**Řešení:** Po insertu číst z ledger views (`vw_client_ledger_balances` / `vw_group_ledger_balances`) místo cached sloupců.

### P3: useBusinessHealthScore čte cached balance
`useBusinessHealthScore.ts` (řádek 60) selectuje `clients.credit_balance` přímo z tabulky pro výpočet health score.

**Řešení:** Joinout s `vw_client_ledger_balances` nebo fetch balances zvlášť z view.

### P4: ClientDetailView umožňuje ruční editaci credit_balance
V edit mode (řádky 364-384) může trenér ručně přepsat `creditBalance` přes formulář. Tím zapíše přímo do `clients.credit_balance`, čímž obejde ledger. Při dalším triggeru se hodnota přepíše zpět na ledger stav, což je matoucí.

**Řešení:** Odstranit editovatelné pole `creditBalance` z formuláře. Kredit se mění pouze přes transakce (ledger), nikdy přímou editací.

### P5: Duplicitní typy a re-exporty
`src/types/finance.ts` definuje `CreditTransaction`, `TransactionType`, `PaymentMethod` — ale `useCreditOperations.ts` definuje vlastní verze těchto typů. `useCreditTransactions.ts` je jen re-export barrel. Toto je zdroj potenciálních type-mismatchů.

**Řešení:** Smazat `src/types/finance.ts` (pokud nikdo neimportuje přímo) a `src/hooks/useCreditTransactions.ts` barrel, ponechat kanonické typy v `useCreditOperations.ts`.

---

## Plán oprav

### 1) ClientDetailView — ledger balance
- Importovat `useCreditBalanceValue` 
- Nahradit `client.credit_balance || 0` za `useCreditBalanceValue(client.id)` v zobrazení
- Odstranit `creditBalance` z formuláře (pole i z defaultValues)

### 2) useCreateTransaction — ledger read po mutaci
- Nahradit čtení z `clients.credit_balance` za `vw_client_ledger_balances.ledger_balance`
- Nahradit čtení z `client_budget_groups.shared_balance` za `vw_group_ledger_balances.ledger_balance`

### 3) useBusinessHealthScore — ledger balance
- Doplnit fetch z `vw_client_ledger_balances` a mergovat do client dat

### 4) Smazat duplicitní typy
- Smazat `src/types/finance.ts` (po ověření, že nikdo neimportuje přímo)
- Smazat `src/hooks/useCreditTransactions.ts` re-export barrel
- Smazat `src/hooks/useSharedBudgetBalance.ts` re-export barrel

---

## Technické detaily

### Soubory k úpravě
- `src/components/clients/ClientDetailView.tsx` — ledger balance + odstranit editaci kreditu
- `src/hooks/useCreditOperations.ts` (řádky 460-478) — číst z ledger views
- `src/hooks/useBusinessHealthScore.ts` — ledger balances

### Soubory ke smazání
- `src/types/finance.ts`
- `src/hooks/useCreditTransactions.ts`
- `src/hooks/useSharedBudgetBalance.ts`

### Očekávaný dopad
- **Všechny části aplikace čtou ze stejného zdroje** (ledger views)
- **Žádná časová prodleva** mezi operací a zobrazením
- **Odstranění možnosti ruční editace** cached sloupce mimo ledger

