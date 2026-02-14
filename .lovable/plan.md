
# Oprava nekonzistentního zobrazeni kreditu

## Problem

Seznam klientu a karta klienta zobrazuji odlisne zustatky, protoze:
1. PWA Service Worker cachuje API odpovedi az 24 hodin -- pri urcitych podminak servuje stara data
2. Seznam klientu pouziva jiny zdroj dat (view `vw_client_ledger_balances` + 30s staleTime) nez karta klienta (`balance_after` z posledni transakce, staleTime 0)
3. Po dokonceni treninku chybi invalidace klice `credit_balance_v2`

## Reseni

### 1. Odstranit PWA cache pro Supabase API

Soubor: `vite.config.ts`

Odstranim `runtimeCaching` pravidlo pro Supabase API (`supabase-api-cache`). Service Worker bude nadale cachovat staticke assety (JS, CSS, fonty), ale API volani budou vzdy cerstve. React Query jiz zajistuje client-side caching, takze PWA cache je nadbytecna a skodliva pro financni data.

### 2. Zkratit staleTime pro useClients

Soubor: `src/hooks/useClients.ts`

Snizim `staleTime` z 30 sekund na 5 sekund (shodne s ostatnimi financnimi hooky dle existujici konvence). Timto se minimalizuje okno, kdy seznam klientu zobrazuje zastaralou hodnotu.

### 3. Pridat invalidaci credit_balance_v2 po dokonceni treninku

Soubor: `src/hooks/useCompleteTrainingAtomic.ts`

Do `onSuccess` callbacku pridam invalidaci klice `credit_balance_v2` pro vsechny ucastniky treninku, aby se karta klienta okamzite obnovila i bez realtime subscripce.

## Technicke detaily

| Soubor | Zmena |
|--------|-------|
| `vite.config.ts` | Odstraneni Supabase runtimeCaching pravidla |
| `src/hooks/useClients.ts` | staleTime: 30000 -> 5000 |
| `src/hooks/useCompleteTrainingAtomic.ts` | Pridani invalidace `credit_balance_v2` per-participant |

Databaze se nemeni -- data v DB jsou konzistentni (-6300 Kc vsude). Problem je ciste na strane klientskeho cachovani.
