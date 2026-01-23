
# Plán: Notifikace pro sledování stravy klientů

## Současný stav

### ✅ Co funguje:
- Notifikace `client_nutrition_started` - trenér je upozorněn, když klient zahájí sledování stravy
- Infrastruktura notifikací je robustní s kategoriemi a UI v `NotificationCenter`

### ❌ Co CHYBÍ:
1. **Notifikace při novém záznamu jídla** - žádný trigger/kód pro upozornění trenéra
2. **Notifikace při neaktivitě 24h** - žádná scheduled funkce pro kontrolu

---

## Navrhované řešení

### 1. Nové typy notifikací

| Typ | Popis | Kdy se odešle |
|-----|-------|---------------|
| `nutrition_entry_added` | Klient zapsal jídlo | Po každém záznamu jídla |
| `nutrition_inactive` | Klient nezapisuje jídlo | Po 24h bez záznamu |

### 2. Implementace

#### A) Databáze - aktualizace constraint

```sql
-- Přidat nové typy notifikací do databáze
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'low_credit', 'negative_credit', 'birthday', 
  'milestone_100', 'milestone_500', 'milestone_1000',
  'incomplete_training', 'feedback_received', 'feedback_red_flag',
  'feedback_trend_alert', 'feedback_pending', 'client_anniversary',
  'client_profile_updated', 'client_nutrition_started',
  'pr_created', 'pr_updated', 'pr_achieved',
  'package_low', 'package_expiring', 'inactivity_warning',
  'training_streak', 'diagnostic_completed', 'pre_diagnostic_completed',
  -- NOVÉ:
  'nutrition_entry_added',
  'nutrition_inactive'
));
```

#### B) Hook pro přidání jídla - notifikace trenérovi

**Soubor:** `src/hooks/useClientPortalNutrition.ts`

Po úspěšném přidání záznamu (v `onSuccess` mutace) přidat notifikaci:

```typescript
// V useAddFoodEntry onSuccess:
onSuccess: async (data, { sessionId, clientId }) => {
  // Existující invalidace...
  
  // Notifikovat trenéra (pouze 1x denně, abychom nepřetěžovali)
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Zkontrolovat, zda už dnes nebyla odeslána notifikace
  const { data: existingToday } = await supabase
    .from('notifications')
    .select('id')
    .eq('client_id', clientId)
    .eq('type', 'nutrition_entry_added')
    .gte('created_at', `${today}T00:00:00`)
    .maybeSingle();
    
  if (!existingToday) {
    // Získat trainer_id a jméno klienta
    const { data: session } = await supabase
      .from('nutrition_log_sessions')
      .select('user_id, clients(name)')
      .eq('id', sessionId)
      .single();
    
    if (session?.user_id) {
      await supabase.from('notifications').insert({
        user_id: session.user_id,
        client_id: clientId,
        type: 'nutrition_entry_added',
        title: 'Klient zapisuje stravu',
        message: `${session.clients?.name || 'Klient'} dnes zapisuje stravu.`,
        entity_type: 'nutrition_session',
        entity_id: sessionId,
      });
    }
  }
}
```

**Důležité:** Notifikace se odešle **1× denně**, ne při každém záznamu (jinak by trenér byl zahlcen).

#### C) Edge funkce pro kontrolu neaktivity

**Nový soubor:** `supabase/functions/check-nutrition-inactivity/index.ts`

```typescript
// Kontroluje klienty s aktivní nutrition session, 
// kteří nezapsali jídlo 24+ hodin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Najít aktivní nutrition sessions
  const { data: activeSessions } = await supabase
    .from('nutrition_log_sessions')
    .select(`
      id, client_id, user_id,
      clients (name)
    `)
    .eq('status', 'active')
    .lte('start_date', now.toISOString().split('T')[0])
    .gte('end_date', now.toISOString().split('T')[0]);

  for (const session of activeSessions || []) {
    // Zjistit poslední záznam jídla
    const { data: lastEntry } = await supabase
      .from('nutrition_food_entries')
      .select('created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastEntryDate = lastEntry?.created_at 
      ? new Date(lastEntry.created_at) 
      : null;

    // Pokud není záznam nebo je starší než 24h
    if (!lastEntryDate || lastEntryDate < twentyFourHoursAgo) {
      // Zkontrolovat, zda už notifikace neexistuje (za posledních 24h)
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('client_id', session.client_id)
        .eq('type', 'nutrition_inactive')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .maybeSingle();

      if (!existingNotif) {
        await supabase.from('notifications').insert({
          user_id: session.user_id,
          client_id: session.client_id,
          type: 'nutrition_inactive',
          title: 'Klient nezapisuje stravu',
          message: `${session.clients?.name || 'Klient'} nezapsal stravu více než 24 hodin.`,
          entity_type: 'nutrition_session',
          entity_id: session.id,
          severity: 'warning',
        });
      }
    }
  }

  return new Response(JSON.stringify({ success: true }));
});
```

**Spouštění:** Tato funkce se bude volat pomocí pg_cron každých 6 hodin.

#### D) Aktualizace UI - NotificationCenter

**Soubor:** `src/hooks/useNotifications.ts`

```typescript
export type NotificationType = 
  // ... existující typy ...
  | 'nutrition_entry_added'
  | 'nutrition_inactive';
```

**Soubor:** `src/components/notifications/NotificationCenter.tsx`

```typescript
// Přidat ikony
const notificationIcons = {
  // ... existující ...
  nutrition_entry_added: Utensils,
  nutrition_inactive: AlertTriangle,
};

// Přidat barvy
const notificationColors = {
  // ... existující ...
  nutrition_entry_added: "text-success",
  nutrition_inactive: "text-warning",
};

// Přidat do kategorie "clients"
const NOTIFICATION_CATEGORIES = {
  clients: {
    label: "Klienti",
    types: [
      // ... existující ...
      "nutrition_entry_added",
      "nutrition_inactive",
    ],
  },
};
```

---

## Vizuální výsledek

### Notifikace v NotificationCenter:

```text
┌─────────────────────────────────────────┐
│ 🔔 Notifikace                           │
├─────────────────────────────────────────┤
│ 👤 Klienti                              │
│ ├─ 🍽️ Klient zapisuje stravu           │  ← NOVÁ (zelená)
│ │    Marie K. dnes zapisuje stravu.     │
│ │    před 2 hodinami                    │
│ │                                       │
│ ├─ ⚠️ Klient nezapisuje stravu         │  ← NOVÁ (oranžová)
│ │    Jan P. nezapsal stravu 24h+        │
│ │    před 1 hodinou                     │
│ └─────────────────────────────────────  │
└─────────────────────────────────────────┘
```

---

## Soubory k úpravě/vytvoření

| Soubor | Akce |
|--------|------|
| Databáze - SQL migrace | Přidat nové typy do constraint |
| `src/hooks/useClientPortalNutrition.ts` | Přidat notifikaci při záznamu (1× denně) |
| `supabase/functions/check-nutrition-inactivity/index.ts` | **NOVÝ** - scheduled funkce |
| `src/hooks/useNotifications.ts` | Přidat nové typy do TypeScript |
| `src/components/notifications/NotificationCenter.tsx` | Přidat ikony, barvy a kategorii |
| `supabase/config.toml` | Nastavit cron pro scheduled funkci |

---

## Důležité poznámky

1. **Omezení frekvence** - `nutrition_entry_added` se odesílá max 1× denně na klienta (jinak by trenér byl zahlcen)

2. **Scheduled funkce** - `check-nutrition-inactivity` běží každých 6 hodin přes pg_cron

3. **Deduplikace** - Obě notifikace kontrolují, zda už podobná neexistuje (24h window)

4. **Kliknutí na notifikaci** - Naviguje na kartu klienta se záložkou "Strava"

---

## Očekávaný výsledek

1. **Trenér vidí aktivitu** - Denní přehled, kteří klienti zapisují stravu
2. **Trenér vidí neaktivitu** - Upozornění, pokud klient přestane zapisovat
3. **Možnost kontaktovat** - Klik na notifikaci → karta klienta → chat/strava
