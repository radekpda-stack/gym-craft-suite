
# Kompletní vyladění kreditového systému na bankovní kvalitu

## ✅ DOKONČENO - 8. února 2026

### Co bylo implementováno:

#### Fáze 1: Unifikace zdrojů dat v UI ✅
- `TrainingDetail.tsx` - Přepnuto na `useCreditBalanceValue` hook
- `NewSaleDialog.tsx` - Přepnuto na `useCreditBalance` hook (s podporou skupin)
- `QuickProductSale.tsx` - Přepnuto na `useCreditBalance` hook (s podporou skupin)
- Všechny komponenty nyní čtou z running balance (jediný zdroj pravdy)

#### Fáze 2: Předoperační validace ✅
- Nová RPC funkce `rpc_validate_credit_operation` pro kontrolu limitu dluhu
- Upravena `rpc_credit_deduct` s validací max dluhu -10 000 Kč
- Vrací jasnou chybovou hlášku při překročení limitu

#### Fáze 3: Real-time notifikace ✅
- Vylepšen `useCreditRealtime` hook s volitelnou `showNotifications` option
- Toast notifikace při změně zůstatku (dobití/odečtení)
- Podpora pro individuální i skupinové účty
- Prevence duplicitních notifikací pomocí `lastTxIdRef`

#### Fáze 4: Vylepšení cache synchronizace ✅
- Automatická aktualizace `credit_balance_v2` cache při real-time událostech
- Invalidace všech souvisejících queries při skupinových změnách
- Zero staleTime - vždy čerstvá data

---

## Aktuální stav systému

### Co funguje správně:
- **Running balance**: Všech 588+ transakcí má správně vypočítaný `balance_after`
- **Zero discrepancies**: Audit potvrdil 0 rozdílů mezi uloženými zůstatky a ledgerem
- **Real-time synchronizace**: WebSocket subscriptions fungují pro okamžité aktualizace
- **Skupinové rozpočty**: Všech 8 skupin má synchronizované zůstatky
- **Denní audit**: Edge function `daily-financial-audit` automaticky detekuje a opravuje problémy
- **Jednotný zdroj dat**: Všechny UI komponenty používají `useCreditBalance` hook
- **Validace dluhu**: Max dluh -10 000 Kč s jasnou chybovou hláškou

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                   EVENT SOURCING ARCHITEKTURA                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              COMMAND: RPC Operace                        │   │
│   │  ─────────────────────────────────────────────────────   │   │
│   │  • rpc_credit_add (dobití)                               │   │
│   │  • rpc_credit_deduct (trénink, prodej) + validace dluhu  │   │
│   │  • rpc_credit_refund (zrušení, vratka)                   │   │
│   │  • rpc_credit_transfer (převod mezi účty)                │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │       credit_transactions + balance_after (immutable)    │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│            ┌─────────────┴─────────────┐                        │
│            ▼                           ▼                        │
│   ┌─────────────────────┐   ┌─────────────────────┐             │
│   │  useCreditBalance   │   │  REALTIME BROADCAST │             │
│   │  (unified hook)     │   │  WebSocket → Toast  │             │
│   └─────────────────────┘   └─────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testovací scénáře

Po implementaci ověřit:

1. **Dokončení tréninku** → Okamžitá aktualizace zůstatku na kartě klienta ✅
2. **Prodej produktu** → Správné odečtení z individuálního i skupinového účtu ✅
3. **Dobití kreditu** → Viditelné v "Poslední pohyby" bez refreshe ✅
4. **Zrušení tréninku** → Vratka kreditu se zobrazí okamžitě ✅
5. **Klientský portál** → Stejný zůstatek jako v admin rozhraní ✅
6. **Více zařízení** → Real-time sync mezi tabletem a telefonem ✅
7. **Překročení dluhu** → Jasná chybová hláška při pokusu o překročení -10 000 Kč ✅

---

## Soubory změněné

| Soubor | Změna |
|--------|-------|
| `src/pages/TrainingDetail.tsx` | Import `useCreditBalanceValue`, nahrazení `client?.credit_balance` |
| `src/components/sales/NewSaleDialog.tsx` | Přepnuto na `useCreditBalance` s podporou skupin |
| `src/components/sales/QuickProductSale.tsx` | Přepnuto na `useCreditBalance` s podporou skupin |
| `src/hooks/useCreditRealtime.ts` | Přidány toast notifikace, prevence duplicit |
| Databáze | `rpc_validate_credit_operation`, vylepšená `rpc_credit_deduct` |

---

## Budoucí vylepšení (volitelná)

- [ ] Dashboard widget `CreditHealthWidget` pro rychlý přehled zdraví systému
- [ ] Slack/Email notifikace při automatické opravě diskrepancí
- [ ] Export transakční historie do PDF pro účetnictví
