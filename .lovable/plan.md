
# Oprava notifikačního systému - Kompletní propojení

## Přehled nalezených problémů

### 1. Výročí spolupráce (client_anniversary)
**Problém**: Hook `useClientAnniversaryNotifier` používá `created_at` (datum přidání klienta do systému), nikoli `training_start_date` (skutečný začátek spolupráce).

**Dopad**: Většina klientů má `training_start_date` odlišné od `created_at`, takže výročí se nikdy nespustí správně.

### 2. Klient zapisuje stravu (nutrition_entry_added)
**Problém**: Logika v `useClientPortalNutrition.ts` existuje, ale notifikace se do DB nedostávají (0 záznamů).

**Možná příčina**: Chyba v kontrole duplicit nebo RLS blokuje insert.

### 3. Klient přidal váhu (client_weight_added)
**Problém**: Migrace definuje funkci `notify_trainer_on_client_weight()`, ale trigger není připojen k tabulce `measurements`.

**Dopad**: Váha se nenotifikuje vůbec.

### 4. Klient zapsal vlastní trénink
**Problém**: Hook `useCreateWorkoutLog` neobsahuje žádnou notifikační logiku pro trenéra.

**Dopad**: Trenér neví, že klient cvičil sám.

### 5. Závislost na načtení aplikace
**Problém**: Narozeniny a výročí se kontrolují pouze při načtení `Layout.tsx` - pokud trenér neotevře aplikaci v daný den, notifikace se nevytvoří.

---

## Implementační plán

### Fáze 1: Oprava výročí spolupráce
Upravit `useClientAnniversaryNotifier` aby používal `training_start_date` jako prioritní datum:

```typescript
// Změna v src/hooks/useClientAnniversaries.ts
const startDate = client.training_start_date 
  ? parseISO(client.training_start_date)
  : parseISO(client.created_at);
```

### Fáze 2: Oprava notifikace o váze
Vytvořit databázový trigger na tabulce `measurements`:

```sql
CREATE TRIGGER on_measurement_weight_added
AFTER INSERT OR UPDATE ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.notify_trainer_on_client_weight();
```

### Fáze 3: Přidat notifikaci pro klientský trénink
Upravit `useCreateWorkoutLog` v `useClientWorkoutLogs.ts`:
- Po úspěšném vytvoření záznamu odeslat notifikaci trenérovi
- Typ: `client_workout_logged` (nový typ)
- Přidat typ do DB constraintu

### Fáze 4: Debug nutrition_entry_added
Prověřit hook `useClientPortalNutrition.ts`:
- Zkontrolovat RLS na tabulce notifications
- Ověřit, že session obsahuje správné `user_id`
- Přidat lepší error logging

### Fáze 5: Přidat scheduled job pro narozeniny/výročí
Vytvořit edge function pro kontrolu narozenin/výročí jednou denně:
- Nezávisí na načtení aplikace trenérem
- Běží každý den v 6:00

---

## Technické detaily

### Nový typ notifikace
```sql
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  -- existující typy...
  'client_workout_logged'  -- nový typ
));
```

### Soubory k úpravě
1. `src/hooks/useClientAnniversaries.ts` - oprava výročí
2. `src/hooks/useClientWorkoutLogs.ts` - přidání notifikace
3. `src/hooks/useClientPortalNutrition.ts` - debug + oprava
4. `src/components/notifications/NotificationCenter.tsx` - přidat ikonu pro nový typ
5. `src/hooks/useNotifications.ts` - přidat nový typ
6. Nová migrace - trigger pro váhu + constraint update
7. Nová edge function - `check-birthdays-anniversaries`

### Výsledek po opravě
| Typ notifikace | Stav | Trigger |
|----------------|------|---------|
| Narozeniny | ✅ Funkční + backup cron | Daily cron + frontend hook |
| Výročí | ✅ Opraveno | Daily cron + frontend hook |
| Klient přidal váhu | ✅ Opraveno | DB trigger na measurements |
| Klient zapisuje stravu | ✅ Opraveno | Frontend hook |
| Klient zapsal trénink | ✅ Nové | Frontend hook |
| PR záznamy | ✅ Beze změny | Frontend hook |
| Feedback | ✅ Beze změny | Edge function |
