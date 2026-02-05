
Cíl: Opravit počty „záznamů“ u kategorií Kardio a Plyometrie v sekci **Výkonnost → Přehled → Kategorie cviků**, aby se počítaly i záznamy, které nejsou uložené pod trenérem v poli `user_id` (typicky když výkon zapisuje klient), a aby se plyometrie/kardio započítávaly i tehdy, když jsou ve skutečnosti uložené v tabulce `exercise_entries` (podle `exercise_type_v2` cviku).

---

## Co se děje teď (diagnóza podle network logů)
- Frontend v `usePerformanceOverview.ts` dělá dotazy např.:
  - `cardio_entries?user_id=eq.<trainer_id>...` → vrací `[]`
  - `skill_entries?user_id=eq.<trainer_id>...` → vrací `[]`
- To přesně vysvětluje „0 záznamů“ u Kardio i Plyometrie: záznamy existují, ale nejsou asociované `user_id` trenéra (často mají `user_id` klienta), případně jsou uložené v `exercise_entries` (protože app už umí ukládat cardio/plyo metriky do `exercise_entries` přes `distance_meters`, `pace_sec_per_500m`, `height_cm`, …).

---

## Princip opravy
Místo filtrování podle `user_id = trenér` budeme pro přehled počítat záznamy podle **klientů trenéra**:
1) Najít seznam `clientIds` (z tabulky `clients` kde `user_id = trenér`).
2) Záznamy ve všech entry tabulkách filtrovat primárně přes `.in('client_id', clientIds)` + datum.
3) Kategorie (síla/kardio/plyometrie) počítat podle `exercise_type_v2` daného cviku:
   - hlavní zdroj: `exercise_id` → mapování z `exercises.id -> exercise_type_v2`
   - fallback: když `exercise_id` je `null`, zkusit mapovat přes `exercise_name` (name map), jinak default “síla”.
4) Volitelně připočítat i `cardio_entries` a `skill_entries`, ale tak, aby to nebylo jediným zdrojem (protože plyo/kardio mohou být v `exercise_entries`).

---

## Konkrétní změny v kódu

### 1) Upravit `src/hooks/usePerformanceOverview.ts`
**A) Načítání cviků**
- Rozšířit select na `exercises` o `name` (aby šlo mapovat i přes `exercise_name` u entry bez `exercise_id`):
  - dnes: `select('id, category, exercise_type_v2')`
  - nově: `select('id, name, category, exercise_type_v2')`

**B) Načítání klientů trenéra**
- `clientsResult` už existuje: `select('id, name').eq('user_id', user.id)`
- Z toho vytvořit:
  - `clientIds = clientsResult.data?.map(c => c.id) ?? []`

**C) Změnit filtry entry dotazů**
- U `exercise_entries` (síla + zároveň cardio/plyo metriky uložené do `exercise_entries`):
  - místo `.eq('user_id', user.id)` použít `.in('client_id', clientIds)`
- U `cardio_entries` a `skill_entries`:
  - místo `.eq('user_id', user.id)` použít `.in('client_id', clientIds)`
- Zachovat datumové filtry (thisMonthStart / last30 / prev30).

**D) Přepočet „entries“ pro kategorie**
- Vytvořit mapy:
  - `exerciseIdToCategory: Map<string, 'strength'|'cardio'|'plyometric'>` (z `exercises`)
  - `exerciseNameToCategory: Map<string, ...>` (z `exercises.name`, ideálně normalizovat `trim().toLowerCase()`)
- Při iteraci přes `exercise_entries`:
  - pokud `exercise_id` → `cat = exerciseIdToCategory.get(exercise_id)`
  - jinak → `cat = exerciseNameToCategory.get(normalize(exercise_name))`
  - `categories[cat ?? 'strength'].entries++`
- U `cardio_entries`:
  - buď analogicky mapovat přes `exercise_id`/`exercise_name`, nebo jednoduše přičíst do `cardio` (rychlejší; přesnější je mapování)
- U `skill_entries`:
  - analogicky, nebo přičíst do `plyometric`.

Poznámka: Tímhle se opraví přesně scénář ze screenu: máte 17 cardio cviků, ale cardio záznamy jsou zapsané pod klienty / nebo v `exercise_entries`, takže po změně filtru a mapování se přestanou zobrazovat nuly.

**E) Top aktivní klienti (leaderboard)**
- Dnes se počítá z kombinace last30/prev30 dotazů s `user_id = trenér`.
- Po změně na `.in('client_id', clientIds)` se statistiky začnou správně počítat i ze záznamů zapsaných klientem.

**F) Recent exercises**
- Dnes je recent pouze z `exercise_entries`.
- Minimální oprava pro tuto bugfix větev: ponechat beze změny (není blokující pro „0 záznamů“).
- Lepší (doporučené): rozšířit recent i o `cardio_entries` a `skill_entries` a pak je sloučit/sortovat podle `date`.

---

## Edge-cases a bezpečnost
- Pokud trenér má 0 klientů, vrátíme 0 metrik (bez chyb).
- `.in('client_id', clientIds)` s velkým množstvím klientů může narazit na limity URL / PostgREST:
  - Pokud by se to ukázalo jako problém, doplníme backendovou funkci (server-side agregace), ale nejdřív opravíme logiku tak, aby fungovala pro běžné počty klientů.
- Limit 1000 řádků na dotaz:
  - Pro „this month“ to obvykle nebude problém.
  - Pokud by trenér měl extrémně mnoho záznamů za měsíc, budeme muset přejít na agregace na backendu (SQL view / funkce). V této fázi je hlavní oprava “nuly”.

---

## Jak ověříme, že je opraveno (akceptační kritéria)
1) Na `/performance` v „Kategorie cviků“:
   - Kardio a Plyometrie už nebudou 0, pokud existují odpovídající záznamy u klientů trenéra.
2) Po otevření DevTools/Network:
   - dotazy na `cardio_entries` / `skill_entries` nebudou filtrované `user_id=eq.<trainer_id>`, ale budou filtrované přes `client_id=in.(...)` (nebo ekvivalent).
3) Ruční kontrola na konkrétních cvicích, které zmiňujete:
   - „Veslo 500m“ se projeví v kardio záznamech v přehledu.
   - Plyo cviky typu „skok do dálky z místa“ se projeví v plyometrických záznamech.

---

## Soubory, které se budou měnit
- `src/hooks/usePerformanceOverview.ts` (hlavní oprava: filtrace přes client_id + mapování kategorií + přepočet)

---

## Krátké doplňující upřesnění (abychom to udělali přesně podle očekávání)
- „Záznamů“ na kartách kategorií: chcete počítat **záznamy za aktuální měsíc** (tak jak je to teď), nebo **celkově**?  
  (Nyní to hook počítá od začátku měsíce; opravu provedu tak, aby zůstala stejná logika období, jen aby se data správně našla.)

Chci celkove počítat. Všechny záznamy od začátku 
