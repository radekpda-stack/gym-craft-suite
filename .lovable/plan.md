

# Audit kreditního systému – Jednotný zdroj pravdy (Fáze 7) ✅ DOKONČENO

Všechny části aplikace nyní čtou ze stejného zdroje (ledger views).

## Provedené opravy

### P1: ClientDetailView ✅
- Nahrazeno `client.credit_balance` za `useCreditBalanceValue(client.id)` z ledger view
- Odstraněno editovatelné pole `creditBalance` z formuláře (kredit se mění pouze přes transakce)

### P2: useCreateTransaction ✅
- Po insertu se čte z `vw_client_ledger_balances` / `vw_group_ledger_balances` místo cached sloupců

### P3: useBusinessHealthScore ✅
- Nahrazeno `clients.credit_balance` za fetch z `vw_client_ledger_balances`

### P4: Duplicitní typy ✅
- Smazán `src/types/finance.ts`
- `src/types/exports.ts` přesměrován na kanonické typy v `useCreditOperations`
- Barrel re-exporty (`useCreditTransactions.ts`, `useSharedBudgetBalance.ts`) ponechány (6+ importů)
