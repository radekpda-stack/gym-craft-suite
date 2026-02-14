
# Oprava financniho systemu -- eliminace duplicitnich triggeru a sjednoceni zdroje dat

## Analyza korenove priciny

Financni system ma **3 databazove triggery na tabulce `credit_transactions`**, ktere si navzajem odporuji:

```text
TRIGGER 1: trg_sync_client_credit_balance (fn_sync_client_credit_balance)
           -> Po INSERT/UPDATE/DELETE prepocita balance z SUM(amount)

TRIGGER 2: trg_sync_balance_on_transaction (trg_sync_balance_on_transaction)  
           -> Po KAZDEM INSERT prida credit_balance += amount

TRIGGER 3: sync_balance_after_transaction (trg_sync_balance_on_transaction)
           -> Po INSERT WHERE status='completed' ZNOVU prida credit_balance += amount
           -> VOLA STEJNOU FUNKCI jako trigger 2!
```

Pri vlozeni jedne dokoncene transakce:
- Trigger 1 nastavi balance na spravny SUM
- Trigger 2 prida delta (+= amount) 
- Trigger 3 prida delta ZNOVU (+= amount)

Poradi triggeru je nedeterministicke. Vysledek zavisi na tom, ktery trigger se spusti jako posledni.

**Navic v aplikacnim kodu:**
- `useDeleteTransaction` smaze transakci (trigger 1 prepocita SUM) a POTOM zavola `applyCreditDelta(-amount)`, coz ZNOVU odecte castku -- vysledek je dvojity odpocet
- `usePayTraining` vlozi transakci (triggery aktualizuji balance) a POTOM zavola `applyCreditDelta(-price)` -- opet dvojity odpocet
- `useCreateTransaction` spravne NEVOLA `applyCreditDelta` (komentar: "We rely on DB triggers")

**Aktualni stav Dominika Tomana:** Nekdo (pravdepodobne predchozi oprava) vlozil +20 000 Kc transakci, takze stored balance = 13 700 Kc misto pozadovanych -6 300 Kc.

---

## Reseni

### Krok 1: Odstranit duplicitni triggery (databaze)

Ponechat POUZE `trg_sync_client_credit_balance` (fn_sync_client_credit_balance), ktery prepocitava z SUM -- je to jediny spravny pristup (Event Sourcing: balance = suma vsech transakci).

Smazat:
- `sync_balance_after_transaction` (duplikat)
- `trg_sync_balance_on_transaction` (duplikat)

Oba volaji `trg_sync_balance_on_transaction()` ktera dela `+= delta`, coz je v konfliktu s SUM pristupem.

### Krok 2: Opravit aplikacni kod -- odstranit dvojite aktualizace

**`useDeleteTransaction`** (useCreditOperations.ts radek 532-565):
- Odstranit volani `applyCreditDelta(-amount)` po smazani transakce
- Trigger `fn_sync_client_credit_balance` uz sam prepocita SUM po DELETE

**`usePayTraining`** (useUnpaidTrainings.ts):
- Odstranit volani `applyCreditDelta(clientId, -price)` po vlozeni transakce  
- Trigger uz sam aktualizuje balance po INSERT

**`useUpdateTransactionPaymentMethod`** (useCreditOperations.ts):
- Odstranit volani `applyCreditDelta` po zmene platebni metody
- Pokud se meni z/na credit, je treba vlozit/smazat transakci, ne rucne menit balance

### Krok 3: Opravit data Dominika Tomana

Smazat chybnou transakci +20 000 Kc (id: `2c0d7063-8120-42ee-90e4-a7339ef0fdcc`).
Po smazani trigger prepocita balance na SUM = -6 300 Kc (spravna hodnota).

### Krok 4: Opravit balance pro Lenku Deiak

Ma ledger_balance = 800 Kc ale stored = 0. Po oprave triggeru se to automaticky syncne. Pro jistotu spustim reconciliaci.

### Krok 5: Sjednotit cteni dat v UI

Aktualne `CompactClientRow` cte `client.credit_balance` z `useClients()`, ktery uz pouziva `vw_client_ledger_balances`. Detail klienta (`ClientDetailView`) take cte z `useClient()` ktery pouziva ledger view. Tyto zdroje by mely byt konzistentni po oprave triggeru.

Pro uplnou jistotu: po kazde mutaci zajistit invalidaci klicu `clients`, `credit_balance_v2`, `credit_transactions`.

---

## Zmeny v souborech

| Soubor / Oblast | Zmena |
|-----------------|-------|
| **Databaze (migrace)** | DROP triggery `sync_balance_after_transaction` a `trg_sync_balance_on_transaction`; reconciliace vsech balances z SUM |
| `src/hooks/useCreditOperations.ts` | `useDeleteTransaction`: odstranit `applyCreditDelta` volani; `useUpdateTransactionPaymentMethod`: odstranit `applyCreditDelta` volani |
| `src/hooks/useUnpaidTrainings.ts` | `usePayTraining`: odstranit `applyCreditDelta` volani (trigger to resi sam) |
| **Databaze** | Smazat chybnou transakci +20 000 Kc pro Dominika Tomana |

## Ocekavany vysledek

- Jediny trigger (`fn_sync_client_credit_balance`) zajistuje 100% shodu `clients.credit_balance` s SUM(amount) z ledgeru
- Zadne dvojite odpocty pri smazani/zmene transakci
- Dominik Toman: -6 300 Kc (spravne)
- Vsichni klienti: stored balance = ledger SUM
