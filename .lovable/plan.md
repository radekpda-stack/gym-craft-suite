
# Oprava notifikačního centra - Persistentní dismissal a respektování preferencí

## Shrnutí problému

Trenér hlásí tři klíčové problémy:
1. Notifikace "Chybí trénink" a "Nízký kredit" se objevují opakovaně i po odmítnutí
2. Důležité notifikace (feedback, strava) nejsou viditelné kvůli přeplnění méně důležitými
3. Chybí možnost tyto "Smart Alerts" trvale vypnout

## Analýza příčin

### 1. Dočasný dismissal (pouze 24h)
Smart Alerts používají `localStorage` s 24-hodinovou expirací:
```javascript
// src/hooks/useSmartAlerts.ts, řádek 14-16
const valid = Object.entries(data).filter(
  ([_, ts]) => now - (ts as number) < 24 * 60 * 60 * 1000 // 24h expiruje
);
```
Po uplynutí 24 hodin se alert znovu vypočítá a zobrazí.

### 2. Smart Alerts ignorují uživatelské preference
Hook `useSmartAlerts` nekontroluje nastavení z `app_settings.notification_preferences`. I když má trenér vypnuté "lowCreditAlerts", Smart Alerts pro nízký kredit se stále generují.

### 3. Chybějící nastavení pro "No Training" alerty
V `InlineNotificationSettings` a `NotificationSettings` chybí toggle pro typ `noTrainingAlerts`, takže trenér nemá jak tyto notifikace vypnout.

---

## Navrhované řešení

### Krok 1: Prodloužit expiraci dismissed alertů na 7 dní

**Soubor:** `src/hooks/useSmartAlerts.ts`

Změna expirace z 24 hodin na 7 dní (nebo neomezeně pro specifické typy):

```text
Před:  24 * 60 * 60 * 1000 (24 hodin)
Po:    7 * 24 * 60 * 60 * 1000 (7 dní)
```

### Krok 2: Přidat kontrolu preferencí do useSmartAlerts

**Soubor:** `src/hooks/useSmartAlerts.ts`

Přidat načítání `notification_preferences` a filtrování alertů podle nich:

```text
1. Načíst app_settings.notification_preferences
2. Přidat mapování: 
   - low_credit → lowCreditAlerts
   - no_training_scheduled → noTrainingAlerts (nová preference)
   - birthdays_this_month → birthdayAlerts
3. Filtrovat generované alerty podle preferencí
```

### Krok 3: Přidat chybějící nastavení

**Soubory:**
- `src/components/notifications/InlineNotificationSettings.tsx`
- `src/components/settings/NotificationSettings.tsx`

Přidat toggle pro:
- `noTrainingAlerts` - "Chybějící tréninky" (aby trenér mohl tyto alerty vypnout)

### Krok 4: Změnit prioritu Smart Alerts

**Soubor:** `src/hooks/useAggregatedNotifications.ts`

Přidat mapování typu `no_training_scheduled` na prioritu `info` místo výchozí hodnoty, aby se tyto alerty zobrazovaly až pod důležitějšími.

---

## Technické detaily implementace

### useSmartAlerts.ts - Hlavní změny

```javascript
// 1. Prodloužit expiraci na 7 dní
const DISMISSAL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dní

// 2. Načíst preference
const { data: settingsData } = await supabase
  .from('app_settings')
  .select('value')
  .eq('key', 'notification_preferences')
  .maybeSingle();

const prefs = settingsData?.value as Record<string, boolean> | null;

// 3. Podmíněně generovat alerty
const alerts = [];

if (prefs?.noTrainingAlerts !== false) {
  alerts.push(...await getClientsWithoutTraining(userId));
}

if (prefs?.lowCreditAlerts !== false) {
  alerts.push(...await getClientsWithLowCredit(userId));
}
// ... atd.
```

### InlineNotificationSettings.tsx - Přidat toggle

```javascript
const QUICK_SETTINGS = [
  { key: 'chatNotifications', label: 'Zprávy', icon: '💬' },
  { key: 'lowCreditAlerts', label: 'Finance & balíčky', icon: '💰' },
  { key: 'noTrainingAlerts', label: 'Chybějící tréninky', icon: '📅' }, // NOVÉ
  { key: 'prAlerts', label: 'Osobní rekordy', icon: '🏆' },
  { key: 'birthdayAlerts', label: 'Narozeniny & výročí', icon: '🎂' },
  { key: 'feedbackAlerts', label: 'Zpětná vazba', icon: '📝' },
];
```

### NotificationSettings.tsx - Přidat do kategorií

```javascript
// V kategorii "Tréninky"
{
  key: "noTrainingAlerts",
  label: "Chybějící tréninky tento týden",
  description: "Upozornění na klienty bez naplánovaného tréninku",
}
```

### useAggregatedNotifications.ts - Upravit priority

```javascript
const TYPE_PRIORITY = {
  // ... existující
  no_training_scheduled: 'info', // Snížit prioritu na Info (modrá)
};
```

---

## Výsledek po implementaci

| Problém | Řešení |
|---------|--------|
| Alerty se znovu objevují po 24h | Expirace prodloužena na 7 dní |
| Ignorují se uživatelské preference | Smart Alerts kontrolují `notification_preferences` |
| Chybí toggle pro "chybějící tréninky" | Přidán `noTrainingAlerts` toggle |
| Méně důležité alerty přeplňují inbox | Priorita `no_training_scheduled` snížena na "Info" |

## Ovlivněné soubory

| Soubor | Změna |
|--------|-------|
| `src/hooks/useSmartAlerts.ts` | Prodloužit expiraci, přidat kontrolu preferencí |
| `src/hooks/useAggregatedNotifications.ts` | Přidat mapování priority pro `no_training_scheduled` |
| `src/components/notifications/InlineNotificationSettings.tsx` | Přidat `noTrainingAlerts` toggle |
| `src/components/settings/NotificationSettings.tsx` | Přidat `noTrainingAlerts` do interface a kategorie |
