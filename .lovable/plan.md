

# Audit kreditového systému: Analýza a návrh zjednodušení

## Shrnutí zjištění

Po důkladné analýze kódu a databáze jsem identifikoval několik kritických problémů v kreditovém systému, které vedou k diskrepancím mezi zobrazeným zůstatkem a historií transakcí.

---

## Identifikované problémy

### 1. Dvojí zdroj pravdy (stored_balance vs ledger)

Systém ukládá zůstatky na dvou místech:
- **`clients.credit_balance`** – uložený zůstatek pro individuální klienty
- **`client_budget_groups.shared_balance`** – uložený zůstatek pro skupiny

Zároveň existují view `vw_client_ledger_balances` a `vw_group_ledger_balances`, které počítají zůstatek ze součtu transakcí.

**Problém**: Aktuální stav databáze ukazuje 5 klientů s diskrepancí:

| Klient | Uloženo | Ledger | Rozdíl |
|--------|---------|--------|--------|
| Kokešová Maruška | -14 364 | 0 | -14 364 |
| Roman Lazinka | -2 599 | -599 | -2 000 |
| Kokeš Jirka | -1 800 | 0 | -1 800 |
| Milan Dolák | -1 600 | 0 | -1 600 |
| Malvína Koutová | -1 000 | 0 | -1 000 |

**Příčina**: Tito klienti jsou členy skupinových rozpočtů (`is_in_group = true`), ale mají nenulový `credit_balance` v tabulce `clients`. Pro členy skupin by měl být `credit_balance` vždy 0.

---

### 2. Chybějící `price_share` u tréninků

Při dokončení tréninku se některým účastníkům neuloží `price_share` do tabulky `training_participants`:

```
20 tréninků má price_share = 0 při final_price > 0
```

**Příklad**: Petr Barda, trénink s `final_price = 800`, ale `price_share = 0`.

**Důsledek**: Při auditu se používá `price_share` z `training_participants`, ale když je 0, systém nemůže správně spočítat stržený kredit.

---

### 3. Trigger vs RPC – konflikt při aktualizaci zůstatku

Existují dva mechanismy pro aktualizaci zůstatků:

1. **Trigger `sync_balance_after_transaction`** – automaticky aktualizuje zůstatek při INSERT do `credit_transactions`
2. **RPC `rpc_complete_training_session`** – ručně aktualizuje zůstatek v kódu

**Problém**: RPC funkce `rpc_complete_training_session` (řádky 141-210) vytváří transakci a **neaktualizuje** explicitně zůstatek – spoléhá na trigger. Ale `rpc_process_sale` (řádky 244-295) **explicitně aktualizuje** zůstatek před triggerem.

Toto může vést k nekonzistencím, pokud:
- Trigger selže (např. kvůli chybě v ON_CLIENT_ADDED_TO_BUDGET_GROUP)
- Dojde k race condition při rychlých operacích

---

### 4. Cache invalidation – staleTime vs refetchType

V `useCreditOperations.ts`:
```typescript
staleTime: 30 * 1000 // 30 sekund
```

V `useCompleteTrainingAtomic.ts`:
```typescript
queryClient.invalidateQueries({ 
  queryKey: ["shared_budget_balance", participant.client_id],
  refetchType: 'all'
});
```

**Problém**: `refetchType: 'all'` vynucuje refetch, ale pokud je `staleTime` 30s, UI může stále zobrazovat zastaralá data z jiných komponent, které neprovedly invalidaci.

---

### 5. Klienti ve skupinách mají osobní zůstatek

Pro členy skupinových rozpočtů platí pravidlo: **Osobní `credit_balance` by měl být 0**, veškeré transakce jdou na skupinu.

Aktuální stav:
- Roman Lazinka: `credit_balance = -2599`, ale je ve skupině "Rom"
- Milan Dolák: `credit_balance = -1600`, ale je ve skupině "Dolák"

**Příčina**: Při přidání klienta do skupiny se pravděpodobně neresetoval jeho osobní zůstatek, nebo došlo k chybě v triggeru.

---

## Navrhovaná řešení

### Řešení 1: Ledger jako jediný zdroj pravdy (doporučeno)

**Princip**: Zrušit cached `stored_balance` sloupce a vždy číst z ledger views.

**Změny**:

1. **UI vždy čte z `vw_client_ledger_balances` / `vw_group_ledger_balances`**
   - Upravit `useSharedBudgetBalance` – již částečně implementováno
   - Zajistit, že všechny komponenty používají tyto views

2. **Odstranit triggery pro sync balancí** – nejsou potřeba, pokud se nečte ze stored sloupce

3. **Smazat/deprecatovat `credit_balance` sloupec** – nebo ho ponechat jen pro zpětnou kompatibilitu, ale nepoužívat v UI

**Výhody**:
- Jediný zdroj pravdy
- Žádné diskrepance
- Jednodušší debugování

**Nevýhody**:
- Mírně pomalejší čtení (SUM přes transakce)
- Nutnost indexů pro výkon

---

### Řešení 2: Opravit stávající systém s triggery

**Změny**:

1. **Opravit `price_share` při dokončení tréninku**
   ```sql
   -- V rpc_complete_training_session přidat:
   UPDATE training_participants
   SET price_share = v_price_share
   WHERE training_session_id = p_session_id
   AND client_id = v_client_id;
   ```

2. **Přidat nočni audit cron job**
   - Porovnat `stored_balance` vs ledger
   - Automaticky opravit diskrepance
   - Logovat do `app_settings` nebo dedikované tabulky

3. **Resetovat osobní zůstatky členů skupin**
   ```sql
   UPDATE clients c
   SET credit_balance = 0
   WHERE EXISTS (SELECT 1 FROM client_budget_members bm WHERE bm.client_id = c.id);
   ```

4. **Posílit trigger při přidání do skupiny**
   - Zajistit převod osobního zůstatku do skupiny
   - Nebo vynulovat a vytvořit adjustment transakci

---

### Řešení 3: Hybrid – Materialized View s refresh

**Princip**: Použít materialized view pro rychlé čtení, ale pravidelně refreshovat.

**Implementace**:
```sql
CREATE MATERIALIZED VIEW mv_credit_balances AS
SELECT 
  c.id as client_id,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.group_id IS NULL), 0) as balance
FROM clients c
LEFT JOIN credit_transactions ct ON ct.client_id = c.id
GROUP BY c.id;

CREATE INDEX ON mv_credit_balances(client_id);
```

Refresh každou minutu nebo při kritických operacích.

---

## Doporučený plán implementace

### Fáze 1: Okamžité opravy (bezpečné)

1. **Opravit stávající diskrepance** – jednorázová migrace
2. **Opravit `price_share = 0` záznamy** – dopočítat z `final_price / participant_count`
3. **Přidat validaci do `rpc_complete_training_session`** – vždy zapisovat `price_share`

### Fáze 2: Zjednodušení architektury

1. **Migrovat UI na ledger views** – `vw_client_ledger_balances`
2. **Přidat index pro rychlé výpočty**:
   ```sql
   CREATE INDEX idx_credit_transactions_client_amount 
   ON credit_transactions(client_id, amount) 
   WHERE status = 'completed';
   ```
3. **Snížit `staleTime` na 5s nebo 0** pro kritické komponenty (kredit)

### Fáze 3: Monitoring

1. **Přidat denní audit job** (edge function + cron)
2. **Vytvořit alert při diskrepanci > 1 Kč**
3. **Dashboard v Settings pro ruční audit** (již existuje `CreditAuditPanel`)

---

## Technické soubory k úpravě

| Soubor/Tabulka | Změna |
|----------------|-------|
| `rpc_complete_training_session` | Přidat UPDATE na `training_participants.price_share` |
| `vw_client_ledger_balances` | Optimalizovat pro indexy |
| `useSharedBudgetBalance` | Vždy číst z view, ne z cached sloupce |
| `ClientCreditHeroCard` | Ověřit použití správného zdroje dat |
| `CreditAuditPanel` | Přidat tlačítko "Opravit vše" s detailním logem |
| Jednorázová migrace | Opravit stored_balance = ledger pro všechny entity |

---

## Očekávaný výsledek

Po implementaci:
- ✅ Žádné diskrepance mezi UI a databází
- ✅ Jediný zdroj pravdy pro zůstatky
- ✅ Automatická detekce a oprava problémů
- ✅ Rychlejší debugging díky přehlednému auditu

