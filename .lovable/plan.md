
# Kompletní vyladění kreditového systému na bankovní kvalitu

## Aktuální stav systému

### Co již funguje správně:
- **Running balance**: Všech 588 transakcí má správně vypočítaný `balance_after`
- **Zero discrepancies**: Audit potvrdil 0 rozdílů mezi uloženými zůstatky a ledgerem
- **Real-time synchronizace**: WebSocket subscriptions fungují pro okamžité aktualizace
- **Skupinové rozpočty**: Všech 8 skupin má synchronizované zůstatky
- **Denní audit**: Edge function `daily-financial-audit` automaticky detekuje a opravuje problémy

### Identifikované oblasti pro vylepšení:

1. **Nejednotné zdroje dat v UI komponentách**
   - `TrainingDetail.tsx` stále čte z `client?.credit_balance` (řádek 84)
   - `NewSaleDialog.tsx` a `QuickProductSale.tsx` používají mix zdrojů
   - Některé komponenty nepoužívají nový `useCreditBalance` hook

2. **Chybějící validace před operacemi**
   - Žádná kontrola dostatečného zůstatku před odečtením
   - Možnost vytvořit dluh bez varování

3. **Audit UI není integrován do hlavního dashboard**
   - `CreditAuditPanel` existuje v Settings, ale není snadno přístupný

4. **Chybějící notifikace při změně zůstatku**
   - Trenér nevidí toast při real-time změně zůstatku jiným zařízením

5. **Klientský portál nepoužívá optimalizovaný hook**
   - `useClientCreditStats` má vlastní logiku místo sdílení s admin UI

---

## Plán implementace

### Fáze 1: Unifikace zdrojů dat v UI

**Změny v komponentách:**

| Soubor | Problém | Řešení |
|--------|---------|--------|
| `TrainingDetail.tsx` | Čte z `client?.credit_balance` | Použít `useCreditBalance` hook |
| `NewSaleDialog.tsx` | Míchá `sharedBudget` a `credit_balance` | Použít `useCreditBalance` |
| `QuickProductSale.tsx` | Stejný problém | Použít `useCreditBalance` |
| `ParticipantPaymentCard.tsx` | Přijímá `credit_balance` prop | Přejmenovat na `balance` pro jasnost |
| `CompactClientRow.tsx` | Čte z `client.credit_balance` | Použít `useCreditBalanceValue` |

**Technická změna:**
```typescript
// TrainingDetail.tsx - PŘED (řádek 84):
const clientCreditBalance = client?.credit_balance ?? 0;

// PO:
const { balance: clientCreditBalance } = useCreditBalance(client?.id);
```

### Fáze 2: Předoperační validace

Přidat validaci do RPC funkcí:

```sql
-- V rpc_credit_deduct přidat kontrolu:
IF v_current_balance - p_amount < -10000 THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Překročen maximální povolený dluh'
  );
END IF;
```

### Fáze 3: Optimalizace klientského portálu

**Změny v `useClientCreditStats`:**
- Zjednodušit logiku - použít stejný přístup jako `useCreditBalance`
- Odstranit duplicitní kód pro načítání zůstatku

### Fáze 4: Vylepšení real-time notifikací

**Přidat toast při externí změně:**
```typescript
// V useCreditRealtime přidat callback:
onTransaction: (tx) => {
  if (tx.amount !== 0) {
    toast({
      title: tx.amount > 0 ? 'Kredit navýšen' : 'Kredit odečten',
      description: `${Math.abs(tx.amount)} Kč - ${tx.description || 'Transakce'}`,
    });
  }
}
```

### Fáze 5: Dashboard widget pro zdraví kreditu

**Nová komponenta `CreditHealthWidget`:**
- Zobrazit v dashboard přehledu
- Indikátor: ✅ Vše OK / ⚠️ Nalezeny diskrepance
- Odkaz na detailní audit

### Fáze 6: Automatické upozornění na problémy

**Vylepšení `daily-financial-audit`:**
- Pokud jsou nalezeny diskrepance, odeslat email adminovi
- Přidat webhook pro Slack notifikace (volitelně)

---

## Databázové změny

### Nová RPC pro validaci před operací:
```sql
CREATE OR REPLACE FUNCTION rpc_validate_credit_operation(
  p_client_id UUID,
  p_amount NUMERIC,
  p_operation TEXT -- 'deduct' | 'add'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_balance NUMERIC;
  v_after_balance NUMERIC;
  v_max_debt NUMERIC := -10000;
BEGIN
  -- Get current balance from running balance
  SELECT balance_after INTO v_current_balance
  FROM credit_transactions
  WHERE client_id = p_client_id
  AND status = 'completed'
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  
  v_current_balance := COALESCE(v_current_balance, 0);
  
  IF p_operation = 'deduct' THEN
    v_after_balance := v_current_balance - p_amount;
  ELSE
    v_after_balance := v_current_balance + p_amount;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', v_after_balance >= v_max_debt,
    'current_balance', v_current_balance,
    'after_balance', v_after_balance,
    'exceeds_limit', v_after_balance < v_max_debt
  );
END;
$$;
```

---

## Soubory k úpravě

| Priorita | Soubor | Změna |
|----------|--------|-------|
| 🔴 Vysoká | `src/pages/TrainingDetail.tsx` | Použít `useCreditBalance` |
| 🔴 Vysoká | `src/components/sales/NewSaleDialog.tsx` | Unifikovat zdroj dat |
| 🔴 Vysoká | `src/components/sales/QuickProductSale.tsx` | Unifikovat zdroj dat |
| 🟡 Střední | `src/hooks/useClientPortalStats.ts` | Zjednodušit, sdílet logiku |
| 🟡 Střední | `src/hooks/useCreditRealtime.ts` | Přidat notifikace při změně |
| 🟢 Nízká | `src/components/dashboard/` | Přidat `CreditHealthWidget` |
| 🟢 Nízká | Databáze | Přidat `rpc_validate_credit_operation` |

---

## Testovací scénáře

Po implementaci ověřit:

1. **Dokončení tréninku** → Okamžitá aktualizace zůstatku na kartě klienta
2. **Prodej produktu** → Správné odečtení z individuálního i skupinového účtu
3. **Dobití kreditu** → Viditelné v "Poslední pohyby" bez refreshe
4. **Zrušení tréninku** → Vratka kreditu se zobrazí okamžitě
5. **Klientský portál** → Stejný zůstatek jako v admin rozhraní
6. **Více zařízení** → Real-time sync mezi tabletem a telefonem

---

## Očekávané přínosy

- ✅ **Jediný zdroj pravdy** pro všechny komponenty
- ✅ **Zero tolerance k chybám** díky validaci
- ✅ **Okamžitá odezva** díky WebSocket
- ✅ **Transparentní audit** pro trenéra
- ✅ **Bankovní přesnost** matematických operací
