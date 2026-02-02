
# Plán: Oprava systému počítání kreditu (klient: Vladimír Parez a další)

## Shrnutí nalezených problémů

### 1. Realita u Vladimíra Pareze
| Zdroj | Hodnota |
|-------|---------|
| Transakční ledger (SUM) | **0 Kč** |
| Uložený zůstatek v DB | **0 Kč** |
| View `vw_client_ledger_balances` | **0** |

**Závěr**: Databáze je správná. Screenshot z ostré aplikace pravděpodobně pochází z cache před opravou nebo zachycuje "running balance" u nejnovějšího řádku (nikoliv aktuální zůstatek).

### 2. Nalezené diskrepance v databázi (audit)
Při auditu bylo nalezeno **11 klientů a 2 skupiny** s nesouladem mezi uloženým zůstatkem a transakčním ledgerem:

| Klient | Uloženo | Ledger | Rozdíl |
|--------|---------|--------|--------|
| Lucie Ševečková | 600 | 1 600 | -1 000 |
| Zlatka Vlkovjáková | 600 | 1 600 | -1 000 |
| Barbora Vopavová | 4 700 | 6 300 | -1 600 |
| Tomáš Stibor | 4 800 | 5 600 | -800 |
| Míra Cetos | 4 000 | 4 800 | -800 |
| Vanerová Iva | -1 600 | -800 | -800 |
| Zbyšek Žemlík | -2 000 | -1 000 | -1 000 |
| Dominik Toman | -2 400 | -600 | -1 800 |
| Vladislava Leišová | 18 243 | 21 668 | -3 425 |
| Chochola Petr | 1 600 | 2 400 | -800 |
| Zuzka Kratochvílová | 2 859 | 2 889 | -30 |
| Skupina Kok | 8 313 | 10 713 | -2 400 |
| Skupina Rom | 7 101 | 7 700 | -599 |

### 3. Příčina problému
Starší operace (před 25. ledna 2026) používaly **dvojitý zápis**: vložily transakci a zároveň ručně upravily `credit_balance`. Od 25.1.2026 existuje trigger `trg_sync_balance_on_transaction`, který to dělá automaticky.

Některé transakce v přechodovém období buď:
- neměly správně nastavený `status = 'completed'`
- byly vytvořeny bez odpovídající aktualizace cache
- byly vytvořeny s duplicitní aktualizací (double counting)

---

## Navrhované řešení

### A. Jednorázová oprava všech diskrepancí (IHNED)
Spustit existující RPC funkci `rpc_recalculate_all_balances` nebo jednotlivě `rpc_fix_balance_discrepancy` pro všechny postižené entity.

**Akce:**
1. V Nastavení → Systém → **Audit kreditového systému** kliknout na "Opravit vše"
2. Nebo: vytvořit edge funkci, která zavolá RPC pro všechny diskrepance

### B. Automatická noční oprava (podle požadavku)
Rozšířit stávající `daily-financial-audit` edge funkci tak, aby:
1. Zkontrolovala diskrepance pomocí `rpc_audit_all_balances()`
2. Automaticky opravila všechny nalezené nesrovnalosti pomocí `rpc_fix_balance_discrepancy()`
3. Zalogovala, co opravila (pro transparentnost)

**Soubory k úpravě:**
- `supabase/functions/daily-financial-audit/index.ts`

### C. Zlepšení robustnosti systému (prevence)
1. **Odstranit duplicitní zápis v `useCompleteTraining`**: Hook v `useTrainingSessions.ts` (řádky 849-864) vkládá transakci **a** volá `applyCreditDelta()`. To je duplicitní – trigger již aktualizuje balance automaticky.

2. **Sjednotit všechny cesty k jednomu vzoru**: Všechny operace by měly pouze vložit transakci a spoléhat na trigger.

---

## Konkrétní změny

### Změna 1: Edge funkce `daily-financial-audit` – automatická oprava
Rozšíření o automatické opravy diskrepancí:

```text
supabase/functions/daily-financial-audit/index.ts
```

```typescript
// Po stávající kontrole diskrepancí:
const { data: discrepancies } = await supabase.rpc('rpc_audit_all_balances');
const itemsToFix = discrepancies?.filter(d => d.needs_fix) || [];

for (const item of itemsToFix) {
  const { data: fixResult } = await supabase.rpc('rpc_fix_balance_discrepancy', {
    p_entity_type: item.entity_type,
    p_entity_id: item.entity_id
  });
  console.log(`Fixed ${item.entity_name}: ${fixResult?.adjustment} Kč`);
}
```

### Změna 2: Odstranění duplicitního `applyCreditDelta` volání
V `src/hooks/useTrainingSessions.ts` odstranit řádek 864:

```typescript
// PŘED:
const { balance: newBalance } = await applyCreditDelta(client_id, -price);

// PO:
// Trigger 'sync_balance_after_transaction' již aktualizuje balance automaticky
// Pouze načteme aktuální hodnotu pro zobrazení
const { data: updatedClient } = await supabase
  .from('clients')
  .select('credit_balance')
  .eq('id', client_id)
  .single();
const newBalance = updatedClient?.credit_balance ?? 0;
```

### Změna 3: Přidání varování do UI při zastaralých datech
V `ClientFinanceLedger.tsx` zobrazit upozornění, pokud existuje diskrepance mezi zobrazeným `currentBalance` a součtem ledger entries.

---

## Testovací scénáře

1. **Ověření jednorázové opravy**: Po spuštění auditu a opravy zkontrolovat, že všichni klienti z tabulky výše mají správný zůstatek.

2. **Noční oprava**: Počkat na 02:00 nebo ručně spustit edge funkci a ověřit logy.

3. **Nové tréninky**: Dokončit trénink u klienta a ověřit, že:
   - Transakce je vytvořena s `status = 'completed'`
   - `credit_balance` odpovídá součtu všech transakcí
   - UI zobrazuje správnou hodnotu

---

## Technické poznámky

### Architektura (jak systém funguje správně)
```text
┌─────────────────────────────────────────────────────────┐
│                    TRANSAKCE                            │
│  INSERT INTO credit_transactions (status='completed')   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              TRIGGER: sync_balance_after_transaction    │
│  → IF group_id: UPDATE client_budget_groups.shared_bal  │
│  → ELSE: UPDATE clients.credit_balance                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           VIEW: vw_client_ledger_balances               │
│  → ledger_balance = SUM(credit_transactions.amount)     │
│  → discrepancy = stored_balance - ledger_balance        │
└─────────────────────────────────────────────────────────┘
```

### Proč UI někdy ukazuje špatnou hodnotu
1. **React Query cache**: Stará data zůstávají v paměti
2. **Mismatch mezi hooks**: `useClient()` a `useCreditTransactions()` se mohou načíst v jiném pořadí
3. **Running balance vs. current balance**: Komponenta `ClientFinanceLedger` ukazuje u každého řádku "balance po té transakci", což může zmást uživatele

---

## Soubory k úpravě (shrnutí)

| Soubor | Změna |
|--------|-------|
| `supabase/functions/daily-financial-audit/index.ts` | Přidat automatickou opravu diskrepancí |
| `src/hooks/useTrainingSessions.ts` | Odstranit duplicitní `applyCreditDelta()` volání (řádek 864) |
| `src/components/clients/ClientFinanceLedger.tsx` | (Volitelně) Přidat varování při nesouladu |

---

## Očekávaný výsledek

| Před | Po |
|------|-----|
| Barbora Vopavová: 4 700 Kč | 6 300 Kč ✅ |
| Všech 11 klientů s diskrepancí | Opraveno automaticky ✅ |
| Nové tréninky | Bez duplicitního zápisu ✅ |
| Noční audit | Automaticky opravuje nové diskrepance ✅ |
