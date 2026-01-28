
Cíl: opravit chybu při dokončení tréninku tak, aby se neopakovala, a současně udělat systém odolnější (rychlejší diagnostika, menší riziko dalších „skrytých“ chyb v DB funkcích).

## Co je teď skutečný problém (dle screenshotu + kontroly DB)
Chyba hlásí:
- `column "budget_group_id" of relation "credit_transactions" does not exist`

V databázi ale tabulka `credit_transactions` nemá `budget_group_id`. Má:
- `group_id` (ověřeno dotazem na `information_schema.columns`)

A současná verze DB funkce `public.rpc_complete_training_session` (ta, kterou volá aplikace při „Dokončit trénink“) vkládá do `credit_transactions` sloupec `budget_group_id`, který neexistuje.

Navíc jsem našel druhý „minový“ problém v té samé funkci:
- funkce čte z `clients` sloupec `stored_balance`, ale v tabulce `clients` existuje jen `credit_balance` (tj. po opravě `budget_group_id` by velmi pravděpodobně spadla na další chybě).

To vysvětluje, proč se to i po předchozích opravách pořád rozbíjí: v DB funkci jsou názvy sloupců/struktur ve dvou místech mimo realitu DB schématu.

## Navržená oprava (backend / databáze)
1) Opravit `rpc_complete_training_session` tak, aby:
   - místo `budget_group_id` používala `group_id`
   - místo `clients.stored_balance` používala `clients.credit_balance`
   - sjednotila výstupní strukturu výsledku s tím, co frontend očekává (volitelně, ale doporučeno):
     - dnes RPC vrací `results`, zatímco frontend typově počítá s `deductions` (i když to aktuálně přímo nezabije proces, je to zdroj budoucích bugů)

2) Doplnit „pojistku“ proti podobným regresím:
   - do DB migrace přidat jednoduchý „self-check“ (např. `PERFORM` dotazy do `information_schema.columns` a vyvolat srozumitelnou výjimku při deployi, pokud by schéma neodpovídalo očekávání), aby se do budoucna nestalo, že funkce odkazuje na neexistující sloupce a projeví se to až v mobilu.
   - alternativně (jednodušší): držet konvence názvů a opravit všechny výskyty `budget_group_id` v DB funkcích/migracích na `group_id` a do budoucna už jen `group_id`.

3) Ověřit, zda nejsou další DB funkce, které stále používají `budget_group_id` nebo `stored_balance`:
   - rychlý audit všech `rpc_*` funkcí a triggerů, které pracují s `credit_transactions` a `clients` zůstatkem.

## Navržené úpravy na frontendu (aby se to „nedělo“ i z pohledu UX)
1) Zlepšit hlášení chyby u „Dokončit trénink“:
   - dnes se ukáže jen `error.message`. Doplníme:
     - krátké uživatelské sdělení („Něco v backendu se rozbilo…“)
     - technický detail skrytě (collapsible / “Detaily”) s konkrétním textem chyby a interním kódem operace
   - cílem je, aby příště šlo během 10 sekund poznat, jestli je to:
     - DB funkce (sloupce, RLS)
     - síť
     - validace vstupů

2) Bezpečnější postup po úspěšném RPC:
   - v `useCompleteTrainingAtomic` se po RPC dělají update dotazy do `training_participants` bez kontroly errorů.
   - upravit tak, aby:
     - chyby z tohoto „after-step“ neblokovaly dokončení tréninku (RPC už je hotové), ale současně se zaznamenaly a ukázalo se varování (např. „Trénink dokončen, ale nepodařilo se uložit platební metodu u účastníka“).

## Testovací postup (důsledné otestování ukládání i dokončování)
Po implementaci provedu kontrolu ve 3 úrovních:

### A) Databázová verifikace (automatická / rychlá)
- ověřit, že `rpc_complete_training_session` definice už nikde neobsahuje:
  - `budget_group_id`
  - `stored_balance`
- ověřit, že tabulky mají očekávané sloupce:
  - `credit_transactions.group_id`
  - `clients.credit_balance`

### B) Funkční test v aplikaci (to, co děláš ty)
1) Dokončit trénink pro 1 účastníka (např. Jiří Kokeš) s platbou kredit
2) Dokončit trénink pro 1 účastníka s hotovostí (mělo by skončit jako `pending_payment`, pokud to tak logika chce)
3) Dokončit trénink pro více účastníků (mix platebních metod, pokud používáte)
4) Ověřit, že po dokončení:
   - se změnil stav tréninku (`completed` / `pending_payment`)
   - vznikla transakce v přehledu transakcí
   - změnil se kredit klienta / skupiny dle očekávání

### C) Diagnostika při případném selhání
- pokud by to znovu spadlo:
  - okamžitě vytáhnu databázové logy poslední chyby (konkrétní SQL error), abychom nehádali
  - doplním cílenou opravu (RLS / chybějící sloupec / špatný join)

## Postup implementace (co přesně udělám po schválení)
1) Najdu a opravím DB funkci `public.rpc_complete_training_session` v nové migraci:
   - nahradím `budget_group_id` → `group_id`
   - nahradím `stored_balance` → `credit_balance`
   - případně sjednotím návratovou strukturu na `deductions` (a zároveň zachovám `results` kvůli zpětné kompatibilitě, pokud se někde používá)
2) Prohledám DB funkce/migrace na další výskyty `budget_group_id` a `stored_balance` a opravím je (aby se to neopakovalo jinde).
3) Zpřesním frontend error handling v `useCompleteTrainingAtomic`:
   - lepší toast zpráva + „detaily“
   - ošetření post-RPC update kroků (training_participants) tak, aby z toho nebyl „tvrdý fail“
4) Otestuju dokončení tréninku end-to-end v preview a zkontroluju, že:
   - žádný request nepadá
   - v databázi vznikají správné řádky
   - kredit se chová konzistentně

## Rizika a jak je eliminujeme
- Riziko: po opravě narazíme na další nesoulad schématu (typicky jiné názvy sloupců v dalších funkcích).
  - Mitigace: audit všech relevantních funkcí + přidání pojistek / sjednocení názvosloví.
- Riziko: RLS blokuje INSERT do `credit_transactions` z `SECURITY DEFINER` funkce (méně pravděpodobné, ale možné).
  - Mitigace: pokud by logy ukázaly RLS, upravíme policies nebo přístup v definované funkci.

## Co od tebe potřebuji teď
Nic technického: po implementaci tě požádám jen o opětovný pokus „Dokončit“ pro ty dnešní tréninky (Jiří Kokeš, Roman Lazinka, Iva Vanerová) a ověřit, že to prošlo bez chyby.
