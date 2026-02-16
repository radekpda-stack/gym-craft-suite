
# Oprava nesouladu kreditního zůstatku mezi seznamem a kartou klienta

## Nalezený problém

Aplikace používá **dva různé zdroje dat** pro zobrazení kreditního zůstatku:

1. **Seznam klientů (Clients.tsx):** Čte `client_budget_groups.shared_balance` z tabulky (aktualizováno DB triggerem) -- zobrazuje **4 800 Kč**
2. **Detail klienta (ClientDetail.tsx):** Používá hook `useCreditBalance`, který hledá poslední `credit_transactions.balance_after` přímým dotazem -- zobrazuje **6 600 Kč** (zastaralá hodnota z cache)

Problém vzniká, protože `useCreditBalance` dotazuje jednotlivé transakce a výsledek může být zastaralý kvůli cachování v React Query nebo PWA service workeru. Naproti tomu `shared_balance` v tabulce je aktualizován spolehlivě DB triggerem.

Ověřeno v databázi:
- `vw_group_ledger_balances` (view, vždy správný): **4 800 Kč**
- `client_budget_groups.shared_balance` (trigger): **4 800 Kč**
- `useCreditBalance` hook (stale cache): **6 600 Kč** (zastaralá hodnota z 26.1.)

## Řešení

Přepsat `useCreditBalance` hook tak, aby vždy četl z **databázových views** (`vw_group_ledger_balances` a `vw_client_ledger_balances`), které počítají zůstatek čerstvě při každém dotazu. Tím se eliminuje riziko zastaralých dat z cachované transakce.

## Technické změny

### 1. `src/hooks/useCreditBalance.ts`

Zjednodušit `queryFn` -- nahradit dotazy na jednotlivé transakce dotazy na views:

```typescript
// PRED (nespolehlivé - závisí na nalezení správné transakce):
const { data: latestTx } = await supabase
  .from('credit_transactions')
  .select('balance_after, created_at')
  .eq('group_id', groupId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// PO (spolehlivé - view vždy vrátí aktuální hodnotu):
const { data: ledger } = await supabase
  .from('vw_group_ledger_balances')
  .select('ledger_balance')
  .eq('group_id', groupId)
  .maybeSingle();
balance = ledger?.ledger_balance ?? 0;
```

Stejná změna pro individuální klienty -- použít `vw_client_ledger_balances` místo hledání poslední transakce.

Přidat `refetchOnMount: 'always'` pro zajištění čerstvých dat při každém otevření karty klienta.

### 2. `src/pages/Clients.tsx` (volitelné vylepšení)

Seznam klientů nyní funguje správně (čte z `shared_balance`). Pro 100% konzistenci by mohl také číst z views, ale to by znamenalo N+1 dotazy. Stávající přístup je dostatečný, protože DB trigger spolehlivě synchronizuje `shared_balance` s ledgerem.

## Rozsah změn
- **1 soubor:** `src/hooks/useCreditBalance.ts`
- **Žádné změny databáze** -- views i triggery už existují a fungují správně
- Oprava je zpětně kompatibilní -- rozhraní `CreditBalanceData` se nemění
