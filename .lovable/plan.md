

# Oprava nekonzistentniho zobrazeni kreditu -- cast 2

## Analyza problemu

Nase predchozi oprava (odstraneni PWA cache pravidla) je spravna v kodu, ale **stary Service Worker s cache "supabase-api-cache" je stale aktivni na telefonu uzivatele**. Novy SW se jeste nenacetl. Proto:

- Seznam klientu ukazuje -600 Kc (cachovana odpoved z 31.1.)
- Detail klienta ukazuje -2 400 Kc (cachovana odpoved z 2.2.)
- Databaze ma -7 100 Kc (spravny soucet vsech transakci)

Uzivatel chce zustatek -6 300 Kc (rozdil +800 Kc = korekce posledniho treninku).

## Reseni

### 1. Vymazat starou SW cache pri startu aplikace

Soubor: `src/main.tsx`

Pridam jednrazovy cleanup, ktery smaze cache "supabase-api-cache" z Service Workeru. Toto zajisti, ze i uzivatel se starym SW okamzite prestane dostavat cachovana API data. Kod bude:

```typescript
// Cleanup legacy SW cache that caused stale financial data
if ('caches' in window) {
  caches.delete('supabase-api-cache');
}
```

### 2. Opravit zustatek Dominika Tomana na -6 300 Kc

Databaze aktualne ukazuje -7 100 Kc. Uzivatel chce -6 300 Kc. Vytvorim korekci:
- Vlozim novou korekni transakci +800 Kc s popisem "Korekce zustatku"
- Nastavim `balance_after = -6300` na teto transakci
- Trigger automaticky aktualizuje `clients.credit_balance`

### 3. Zajistit ze oba pohledy ctou stejna data

Pro uplnou jistotu pridam do `CompactClientRow` pouziti `useCreditBalanceValue` misto `client.credit_balance`, cimz seznam klientu bude cist zustatek ze stejneho zdroje jako detail (posledni transakce). Toto eliminuje moznost diskrepance i v budoucnu.

**Pozn.:** Tato zmena zvysi pocet dotazu na DB (1 per klient), ale diky staleTime a React Query cache bude dopad minimalni. Alternativne bychom mohli pouzit ledger view primo v `useClients`, coz uz delame -- ale pridani druheho zdroje je bezpecnejsi.

## Technicke detaily

| Soubor | Zmena |
|--------|-------|
| `src/main.tsx` | Pridani `caches.delete('supabase-api-cache')` |
| Databaze | INSERT korekce +800 Kc pro Dominika Tomana |
| `src/components/clients/CompactClientRow.tsx` | Mozna zmena zdroje dat pro kredit badge (volitelne) |

