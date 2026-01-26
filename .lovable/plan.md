
# Refaktoring Notifikačního centra pro trenéra

## Shrnutí požadavků

Uživatel chce:
1. **Odstranit Smart Alerts** z notifikačního centra (nízký kredit, chybějící tréninky, narozeniny atd.) - tyto informace už jsou na dashboardu
2. **Zobrazovat pouze akce klientů** - co klient přidal, změnil nebo dokončil
3. **Logické kategorizování** notifikací pro přehlednost
4. **Jednoduchý a přehledný systém**

---

## Současný stav vs. Cílový stav

| Současný stav | Cílový stav |
|---------------|-------------|
| Smart Alerts + DB notifikace smíchané | Pouze DB notifikace od klientů |
| Kategorie: Urgent/Important/Info | Kategorie podle typu akce klienta |
| Agregace 3+ podobných notifikací | Zachovat agregaci pro přehlednost |
| Smart Alerts zabírají místo | Čistý feed akcí klientů |

---

## Nové kategorie notifikací

Místo priorit (Urgent/Important/Info) navrhujeme kategorie podle **typu aktivity klienta**:

```text
┌─────────────────────────────────────────────────┐
│  📬 NOTIFIKAČNÍ CENTRUM                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  🏋️ TRÉNINKY & CVIČENÍ                          │
│  ├─ client_workout_logged (Klient cvičil)       │
│  ├─ pr_created/updated/achieved (Osobní rekord) │
│  └─ training_streak (Milestone dosažen)         │
│                                                 │
│  🍎 VÝŽIVA & ZDRAVÍ                             │
│  ├─ nutrition_entry_added (Zapisuje stravu)     │
│  ├─ client_nutrition_started (Začal výživu)     │
│  ├─ client_weight_added (Přidal váhu)           │
│  └─ nutrition_inactive (Nezapisuje stravu)      │
│                                                 │
│  📝 FORMULÁŘE & ZPĚTNÁ VAZBA                    │
│  ├─ feedback_received (Zpětná vazba)            │
│  ├─ feedback_red_flag (Kritická zpětná vazba)   │
│  ├─ diagnostic_completed (Diagnostika)          │
│  ├─ pre_diagnostic_completed (Pre-diagnostika)  │
│  └─ client_profile_updated (Aktualizace profilu)│
│                                                 │
│  💰 ADMINISTRATIVA (volitelně skryté)           │
│  ├─ package_low (Nízký balíček)                 │
│  ├─ package_expiring (Končící balíček)          │
│  └─ inactivity_warning (Neaktivní klient)       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Plán implementace

### Krok 1: Odpojit Smart Alerts z NotificationCenter

**Soubor:** `src/hooks/useAggregatedNotifications.ts`

Změny:
- Přestat volat `useSmartAlerts()` 
- Nebo přidat filtr, který Smart Alerts vylučuje z agregace
- Ponechat pouze databázové notifikace (`notifications` tabulka)

```text
PŘED:
const { data: smartAlerts = [] } = useSmartAlerts();
const alertNotifications = smartAlerts.map(convertSmartAlert);
merged = [...dbNotifications, ...alertNotifications];

PO:
// Smart Alerts NEPŘIDÁVAT - jsou na dashboardu
const merged = dbNotifications;
```

### Krok 2: Změnit kategorizaci z priorit na typy aktivit

**Soubor:** `src/hooks/useAggregatedNotifications.ts`

Nové mapování typů na kategorie:

```typescript
type NotificationCategory = 'training' | 'nutrition' | 'forms' | 'admin';

const TYPE_CATEGORY: Record<string, NotificationCategory> = {
  // Tréninky & Cvičení
  client_workout_logged: 'training',
  pr_created: 'training',
  pr_updated: 'training', 
  pr_achieved: 'training',
  training_streak: 'training',
  
  // Výživa & Zdraví
  nutrition_entry_added: 'nutrition',
  client_nutrition_started: 'nutrition',
  client_weight_added: 'nutrition',
  nutrition_inactive: 'nutrition',
  
  // Formuláře & Zpětná vazba
  feedback_received: 'forms',
  feedback_red_flag: 'forms',
  diagnostic_completed: 'forms',
  pre_diagnostic_completed: 'forms',
  client_profile_updated: 'forms',
  
  // Administrativa (může být skrytá)
  package_low: 'admin',
  package_expiring: 'admin',
  inactivity_warning: 'admin',
  incomplete_training: 'admin',
};
```

### Krok 3: Upravit NotificationCenter UI

**Soubor:** `src/components/notifications/NotificationCenter.tsx`

Změny:
1. Nahradit sekce `urgent/important/info` sekcemi `training/nutrition/forms`
2. Přidat ikony a barvy pro každou kategorii
3. Zobrazovat "Administrativa" jako sbalitelnou sekci (nebo úplně skrýt)

```text
KATEGORIE UI:
┌──────────────────────────────────┐
│ 🏋️ Tréninky (3 nové)      ▼     │
│   ├─ Jan cvičil - před 2h       │
│   ├─ Eva: Nové PR! 80kg         │
│   └─ Martin cvičil              │
├──────────────────────────────────┤
│ 🍎 Výživa (1 nová)        ▶     │
├──────────────────────────────────┤
│ 📝 Formuláře (0 nových)   ▶     │
└──────────────────────────────────┘
```

### Krok 4: Přidat nastavení pro skrytí kategorií

**Soubor:** `src/components/notifications/InlineNotificationSettings.tsx`

Přidat přepínače pro jednotlivé kategorie:
- ✅ Tréninky & Cvičení
- ✅ Výživa & Zdraví  
- ✅ Formuláře & Zpětná vazba
- ☐ Administrativa (defaultně vypnutá)

### Krok 5: Zachovat zprávy jako samostatnou sekci

Nepřečtené zprávy (chat) zůstanou v horní sekci jako nyní - jsou oddělené od notifikací.

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useAggregatedNotifications.ts` | Odstranit Smart Alerts, přidat kategorizaci |
| `src/components/notifications/NotificationCenter.tsx` | Nové UI s kategoriemi místo priorit |
| `src/components/notifications/UnifiedNotificationItem.tsx` | Přidat ikony pro kategorie |
| `src/components/notifications/InlineNotificationSettings.tsx` | Přepínače pro kategorie |

---

## Vedlejší efekty

### Co zůstane zachováno:
- Smart Alerts zůstanou na dashboardu (`SmartAlertsPanel`)
- Toast notifikace pro nové Smart Alerts (pokud jsou povoleny)
- Realtime aktualizace notifikací

### Co bude odstraněno:
- Smart Alerts z notifikačního centra
- Míchání klient-side a server-side notifikací

---

## Časový odhad

| Krok | Čas |
|------|-----|
| Odpojení Smart Alerts | 5 min |
| Nová kategorizace | 15 min |
| Úprava UI NotificationCenter | 20 min |
| Nastavení kategorií | 10 min |
| Testování | 10 min |
| **Celkem** | **~60 min** |
