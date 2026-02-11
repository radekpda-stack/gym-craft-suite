
# Oprava chyb nalezených v logu aplikace

## Nalezené chyby

### 1. app_events - chybí INSERT RLS politika (KRITICKÉ)
Tabulka `app_events` má pouze SELECT politiku. Analytický kód (sledování výkonu, chyb) se pokouší zapisovat do této tabulky každých 5 sekund, ale zápis je blokován RLS. Toto generuje desítky chyb za minutu v databázových logách.

**Dopad:** Zbytečná zátěž databáze, žádná analytická data se neukládají.

### 2. client_portal_activity - chybí INSERT politika pro klientský portál
Stávající politika `Clients can view and create own activity` používá `cmd: ALL`, ale `qual` podmínka (`client_id = get_client_id_for_user(auth.uid())`) se pravděpodobně neaplikuje správně jako `WITH CHECK` pro INSERT. Klientský portál tak nemůže zapisovat aktivitu.

**Dopad:** Žádná data o aktivitě klientů na portálu se neukládají.

### 3. Select.Item s prázdnou hodnotou na stránce /performance
Chyba z logu: *"A Select.Item must have a value prop that is not an empty string."* Na stránce výkonu se vykreslují cviky v Select komponentě, kde některý cvik může mít prázdné ID.

**Dopad:** Crash komponenty na stránce výkonu.

### 4. "Rendered more hooks" v WorkoutExerciseManager (vyřešeno)
Tato chyba je z 2. února a po kontrole kódu vypadá, že hooks jsou nyní volány korektně (nepodmíněně). Pravděpodobně již opraveno předchozí změnou.

---

## Plán oprav

### Krok 1: Přidat INSERT RLS politiku pro app_events
SQL migrace:
```sql
CREATE POLICY "Users can insert own events"
ON public.app_events FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Krok 2: Opravit client_portal_activity RLS
Rozdělit `ALL` politiku na specifické SELECT a INSERT politiky s korektním `WITH CHECK`:
```sql
-- Drop the combined ALL policy
DROP POLICY "Clients can view and create own activity" ON public.client_portal_activity;

-- Separate SELECT policy
CREATE POLICY "Clients can view own activity"
ON public.client_portal_activity FOR SELECT
USING (client_id = get_client_id_for_user(auth.uid()));

-- Separate INSERT policy with WITH CHECK
CREATE POLICY "Clients can insert own activity"
ON public.client_portal_activity FOR INSERT
WITH CHECK (client_id = get_client_id_for_user(auth.uid()));
```

### Krok 3: Ochrana proti prázdným hodnotám v Select na /performance
V souboru `src/components/performance/AddPerformanceSheet.tsx` přidat filtr, aby cviky s prázdným ID nebyly vykreslovány jako SelectItem:
```tsx
{activeExercises
  .filter(exercise => exercise.id) // Odfiltrovat prázdné ID
  .map((exercise) => (
    <SelectItem key={exercise.id} value={exercise.id}>
```

---

## Upravené soubory

| Soubor | Změna |
|--------|-------|
| Databázová migrace | INSERT politika pro `app_events`, oprava `client_portal_activity` |
| `src/components/performance/AddPerformanceSheet.tsx` | Filtr prázdných exercise ID v SelectItem |

## Očekávaný výsledek
- Databázové logy přestanou být zahlceny RLS chybami (desítky za minutu zmizí)
- Analytická data se budou správně ukládat
- Klientský portál bude korektně zapisovat aktivitu
- Stránka /performance přestane padat při prázdných cvicích
