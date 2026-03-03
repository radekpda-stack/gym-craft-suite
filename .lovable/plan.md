
Cíl: aby se zůstatek klienta vždy zobrazoval stejně (karta klienta, dokončení tréninku, prodej) a aby historická data byla konzistentní. Z analýzy vyplývá, že hlavní příčina je mix dvou systémů:
- **Ledger (credit_transactions)** = správný zdroj pravdy
- **rpc_apply_credit_delta** = mění `clients.credit_balance` / `client_budget_groups.shared_balance` **bez zápisu do ledgeru**, což pak vytváří rozdíly a různé obrazovky čtou jiné číslo.

Níže je plán, jak to sjednotit na „jeden zdroj pravdy“ a zároveň opravit historii.

---

## 1) Sjednocení „jediného zdroje pravdy“ pro zůstatek (UI)
1. **Zobrazování zůstatku všude přepnout na ledger/view:**
   - všude, kde se dnes používá `client.credit_balance` nebo `group.shared_balance` pro *zobrazení*, přejít na:
     - `useCreditBalance()` (detail klienta, detail tréninku, rychlé modály), nebo
     - `useLedgerBalances()` (seznam klientů, tabulky, selektory).
2. **Zakázat/odstranit editaci `credit_balance` v klientském formuláři** (aby už nikdy nevznikl „stav bez transakce“). Kredit se bude měnit jen přes kreditní operace.

Konkrétně zkontrolujeme a upravíme komponenty, které dnes stále sahají na `client.credit_balance` pro “kredit stačí/nestačí”:
- `src/components/trainings/CompleteTrainingDialog.tsx`
- `src/components/trainings/QuickCompleteDialog.tsx`
- `src/pages/TrainingDetail.tsx` (helper `getEffectiveCreditBalance`)
- `src/components/ui/client-search-select.tsx` (zobrazený kredit v listu bude brán z ledgerem obohacených dat)

---

## 2) Jeden write-path: všechny změny kreditu se musí propsat do ledgeru
### Problém
`rpc_apply_credit_delta` dnes **jen přičítá/odečítá** na cached sloupcích a tím rozbije konzistenci s ledgerem (a s view `vw_*_ledger_balances`).

### Řešení
1. **Přestat v aplikaci používat `applyCreditDelta()` tam, kde se zároveň vkládá `credit_transactions`.**
   - V kódu existují místa, která:
     - vloží řádek do `credit_transactions`
     - a pak ještě zavolají `applyCreditDelta()` → tím se cached sloupec posune mimo ledger a vzniká mismatch.
2. **Změnit `rpc_apply_credit_delta` na kompatibilní wrapper**, který místo přímého UPDATE:
   - vloží odpovídající řádek do `credit_transactions` (typicky `manual` / `payment` / `training` dle kontextu),
   - nastaví `status='completed'`,
   - doplní `source_type/source_id/idempotency_key` (kde dává smysl),
   - a nechá trigger/ledger mechaniku udržet cached sloupce.
   Tím i kdyby někde zůstalo volání `applyCreditDelta`, už to znovu nerozbije data.

Dotčené frontend části (odstranění dvojího účtování a přímých “delta” update):
- `src/hooks/useTrainingSessions.ts` (update/complete/cancel/payment-change části – odstranit volání `applyCreditDelta` a sjednotit na ledger zápis)
- `src/hooks/useUnpaidTrainings.ts` (doplnit idempotentní chování, viz níže)
- `src/hooks/useUndoActions.ts` (undo má vytvářet kompenzační transakci, ne “tichý delta update”)

---

## 3) Tréninky: jediný způsob, jak odečíst kredit
### Problémy v datech, které už vidíme
- Existují **completed tréninky s `payment_status='paid_credit'` a `final_price IS NULL`** (u vás aktuálně desítky kusů).
- Existují případy, kdy **payment_status říká jedno, ale v ledgeru je/není odpovídající transakce**.

### Fix do budoucna
1. **Dokončení tréninku**: vše směrovat přes stávající atomický backend proces (`rpc_complete_training_session` přes `useCompleteTrainingAtomic`).
   - Tím se kredit transakce generuje jednotně, s idempotencí.
2. **Změna platby po dokončení** (cash ↔ credit):
   - místo kombinace “UPDATE training + INSERT tx + applyCreditDelta” přejít na:
     - UPDATE payment_status / payment_method
     - vytvoření **kompenzační** credit transakce (refund/deduct) v ledgeru
     - bez přímého update cached balance.

Konkrétní úpravy:
- `src/hooks/useTrainingSessions.ts`: zjednodušit a sjednotit chování v:
  - `useUpdateTrainingSession` (když se status změní na completed, neprovádět vlastní finanční logiku – delegovat)
  - `useChangePaymentMethod` (odstranit `applyCreditDelta`, ponechat pouze ledger kompenzaci)
- `src/components/calendar/QuickPaymentDialog.tsx`: dnes to volá `useUpdateTrainingSession` způsobem, který může sahat do finanční logiky. Přesměrujeme na nový/standardizovaný handler “potvrdit platbu” bez bočních efektů.

---

## 4) Prodeje: sjednotit credit dopad pro “platba kreditem” a “dobití”
V DB migracích je vidět, že `rpc_process_sale` historicky měnil `clients.credit_balance` přímo a zároveň vkládal transakce. To je přesně typ věci, která dělá rozdíly mezi moduly.

Plán:
1. Upravit backend logiku prodejů tak, aby:
   - při “payment_method=credit” vytvářela **pouze** ledger transakci (např. `type='product'`) a cached sloupce nechala na trigger sync,
   - při “credit_topup” vytvářela ledger transakci `type='payment' / 'topup'` (opět bez přímých UPDATE clients/group).
2. Na FE zajistit, že po prodeji se invalidují stejné query keys jako po tréninku (už z velké části děláte, jen to sjednotíme).

---

## 5) Oprava historie (jednorázově) + bezpečný audit report
Protože chcete „včetně historie“, uděláme to ve dvou krocích: **automaticky bezpečné opravy** + **flagované případy k ručnímu potvrzení**, abychom si “nevymysleli” částky.

### 5A) Automatické bezpečné opravy
Vytvoříme interní “repair” proces, který:
1. **Srovná cached balances se součtem ledgeru** pro klienty mimo skupiny a pro skupiny.
2. Najde klienty, kteří mají `credit_balance != 0`, ale v ledgeru mají 0 **a současně nemají žádnou historii transakcí** → vytvoří jednorázovou “opening/manual” transakci, aby se historický stav neztratil.
3. Přepočítá running balance (`balance_after`) tam, kde by bylo potřeba (u vás je aktuálně vyplněné, ale po opravách to zajistíme).

### 5B) Flagované nesrovnalosti tréninků
Pro completed tréninky:
- `paid_credit` + chybí `final_price`
- nebo `paid_credit` + chybí credit transakce
- nebo “ne-credit” + přesto existuje credit transakce

Uděláme report se seznamem tréninků a navrhneme akci:
- pokud lze cenu jednoznačně odvodit (např. ze `training_participants.price_share`), doplníme `final_price` a chybějící ledger transakci
- pokud cenu odvodit nelze, nastavíme trénink do stavu “vyžaduje kontrolu” (payment_status na `pending`) a zobrazíme vám v audit panelu tlačítko “Vyřešit”.

### Realizace opravy historie
- Přidáme backend admin endpoint (interní “backend funkci”) nebo admin RPC, který provede opravy s logem výsledků (kolik klientů/skupin opraveno, kolik tréninků opraveno/flagováno).
- Navážeme to na UI (např. v Nastavení → Finance audit) jako jednorázové tlačítko **“Opravit historii”** + možnost stáhnout CSV report.

---

## 6) Zlepšení “Finance audit” v UI (aby bylo hned vidět, co je špatně)
Rozšíříme `CreditAuditPanel` tak, aby ukazoval 3 bloky:
1. **Discrepancies balances** (už máte)
2. **Tréninky s podezřelým stavem** (paid_credit bez ceny / bez transakce, non-credit s transakcí…)
3. **Akce**:
   - “Opravit bezpečné věci”
   - “Opravit historii”
   - “Zobrazit report”

---

## 7) Kontrola po implementaci (co bude hotovo)
1. Vybereme 2–3 klienty, u kterých jste viděl rozdíl (karta klienta vs prodej vs trénink).
2. Pro každého projdeme scénář:
   - prodej produktu za kredit
   - dokončení tréninku za kredit
   - změna platby (credit ↔ cash)
   - kontrola zůstatku v:
     - seznamu klientů
     - detailu klienta
     - prodejním modulu
     - detailu tréninku

---

## Soubory / místa, která pravděpodobně upravíme
Frontend:
- `src/hooks/useTrainingSessions.ts` (odstranit/zakázat `applyCreditDelta` v finance-cestách)
- `src/hooks/useUnpaidTrainings.ts`
- `src/hooks/useUndoActions.ts`
- `src/components/calendar/QuickPaymentDialog.tsx`
- `src/components/trainings/CompleteTrainingDialog.tsx`, `QuickCompleteDialog.tsx`
- `src/pages/TrainingDetail.tsx`
- `src/components/settings/CreditAuditPanel.tsx` (+ případně nový “repair” panel)

Backend (DB logika):
- úprava `rpc_apply_credit_delta` (aby nikdy nepsal přímo do cached balances)
- doplnění “repair/audit” RPC nebo backend funkce pro jednorázovou opravu historie
- případně přidání idempotentních/ochranných indexů pro kritické operace (aby 2× klik nebo retry nevytvořil 2× finanční dopad)

---