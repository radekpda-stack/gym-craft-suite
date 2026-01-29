
# Refaktoring notifikačního centra pro trenéry

## Analýza současného stavu

### Aktuálně zobrazované typy notifikací:

| Kategorie | Typy notifikací | Akce při kliknutí |
|-----------|----------------|-------------------|
| **Výživa** | `nutrition_entry_added`, `client_nutrition_started`, `client_weight_added` | Otevře dialog/navigace na deník |
| **Formuláře** | `feedback_received`, `feedback_red_flag`, `client_profile_updated`, `diagnostic_completed` | Otevře dialog zpětné vazby / profil |
| **Tréninky** | `client_workout_logged`, `pr_achieved`, `pr_created`, `pr_updated` | Otevře dialog s tréninkem |
| **Admin** (skryté) | `birthday`, `low_credit`, `client_anniversary`, `milestone_*`, `inactivity_warning` | Navigace na profil klienta |

### Identifikované problémy:

1. **Narozeniny jsou v sekci Admin** - která je ve výchozím stavu skrytá, takže trenér narozeniny neuvidí
2. **Některé notifikace nejsou klikatelné** - např. `feedback_pending` nemá správný handler
3. **Fallback navigace** - pokud chybí speciální handler, naviguje se na profil klienta, což není vždy užitečné
4. **Příliš mnoho typů** - některé typy jako `milestone_*`, `training_streak` nejsou pro trenéra tak důležité

---

## Navrhované změny

### 1. Zjednodušená kategorizace - pouze 3 důležité kategorie

```text
NOVÁ STRUKTURA:
┌─────────────────────────────────────────┐
│ 🔔 Notifikace                           │
├─────────────────────────────────────────┤
│                                         │
│ 📨 ZPRÁVY (nepřečtené konverzace)      │ ← Zůstává stejné
│                                         │
│ 🍎 KLIENTSKÁ AKTIVITA                  │ ← NOVÁ kategorie
│ • Jídlo zapisují                        │
│ • Trénink zapisují                      │
│ • Profil aktualizují                    │
│ • Váha přidána                          │
│                                         │
│ 📋 ZPĚTNÁ VAZBA & FORMULÁŘE            │
│ • Feedback přijat                       │
│ • Red flag                              │
│ • Diagnostika dokončena                 │
│                                         │
│ 🎂 DŮLEŽITÉ UDÁLOSTI                   │ ← Přesunuté z Admin
│ • Narozeniny                            │
│ • Výročí spolupráce                     │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Vyřazené notifikace (přesunuty pouze na Dashboard)

Tyto notifikace by se měly zobrazovat **pouze na dashboardu**, ne v notifikačním centru:
- `low_credit` / `negative_credit` - Smart Alert na dashboardu
- `package_low` / `package_expiring` - Smart Alert  
- `inactivity_warning` - Smart Alert
- `milestone_100/500/1000` - Nepodstatné pro workflow
- `training_streak` - Nepodstatné
- `pr_achieved/created/updated` - Méně důležité, ale ponecháme v případě zájmu

### 3. Povinné click handlery pro všechny typy

```text
NOTIFIKACE → AKCE PŘI KLIKNUTÍ:
──────────────────────────────────────────────────
nutrition_entry_added     → NutritionEntryDetailDialog
client_workout_logged     → WorkoutLogDetailDialog
client_profile_updated    → ProfileUpdateDetailDialog
feedback_received         → FeedbackDetailDialog
feedback_red_flag         → FeedbackDetailDialog
diagnostic_completed      → Navigace /clients/{id}?tab=profile
pre_diagnostic_completed  → Navigace /clients/{id}?tab=profile
birthday                  → BirthdayDetailDialog (NOVÝ)
client_anniversary        → AnniversaryDetailDialog (NOVÝ)
client_weight_added       → Navigace /clients/{id}?tab=progress (NOVÝ handler)
client_nutrition_started  → Navigace /nutrition/client/{id}
```

### 4. Nové komponenty pro speciální události

#### 4.1 `BirthdayDetailDialog`
```text
┌─────────────────────────────────────────┐
│ 🎂 Narozeniny                           │
├─────────────────────────────────────────┤
│                                         │
│  Jana Nováková                          │
│  Dnes slaví 35. narozeniny!             │
│                                         │
│  📅 Začátek spolupráce: 15.3.2024       │
│  📊 Počet tréninků: 48                  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 💬 Poslat přání přes chat        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Zavřít]        [Zobrazit profil]      │
│                                         │
└─────────────────────────────────────────┘
```

#### 4.2 `AnniversaryDetailDialog`
```text
┌─────────────────────────────────────────┐
│ 🎉 Výročí spolupráce                    │
├─────────────────────────────────────────┤
│                                         │
│  Petr Svoboda                           │
│  2 roky společného tréninku!            │
│                                         │
│  📅 Od: 29.1.2024                       │
│  📊 Celkem tréninků: 156                │
│  💪 Pokrok: +15kg na bench pressu       │
│                                         │
│  [Zavřít]        [Zobrazit profil]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technické změny

### Soubory k úpravě:

| Soubor | Změna |
|--------|-------|
| `src/hooks/useAggregatedNotifications.ts` | Nová kategorizace, filtrování nepodstatných typů |
| `src/components/notifications/NotificationCenter.tsx` | Nové handlery, nové dialogy, nová struktura sekcí |
| `src/components/notifications/BirthdayDetailDialog.tsx` | **NOVÝ** - detail narozenin s akcí |
| `src/components/notifications/AnniversaryDetailDialog.tsx` | **NOVÝ** - detail výročí |

### Změna v `useAggregatedNotifications.ts`:

```typescript
// NOVÁ kategorizace
const TYPE_CATEGORY: Record<string, NotificationCategory> = {
  // Klientská aktivita (priorita 1)
  nutrition_entry_added: 'activity',
  client_nutrition_started: 'activity',
  client_workout_logged: 'activity',
  client_profile_updated: 'activity',
  client_weight_added: 'activity',
  
  // Zpětná vazba & Formuláře (priorita 2)
  feedback_received: 'forms',
  feedback_red_flag: 'forms',
  diagnostic_completed: 'forms',
  pre_diagnostic_completed: 'forms',
  
  // Důležité události (priorita 3)
  birthday: 'events',
  client_anniversary: 'events',
};

// VYŘAZENÉ z notifikačního centra (pouze dashboard):
const EXCLUDED_TYPES = [
  'low_credit', 'negative_credit',
  'package_low', 'package_expiring',
  'inactivity_warning',
  'milestone_100', 'milestone_500', 'milestone_1000',
  'training_streak',
  'incomplete_training',
  'nutrition_inactive',
  'pr_achieved', 'pr_created', 'pr_updated', // PRs zůstávají na klientském profilu
  'feedback_pending', 'feedback_trend_alert',
];
```

### Změna v `NotificationCenter.tsx`:

```typescript
// Přidání handleru pro narozeniny
const isBirthdayNotification = notification.type === 'birthday';
const isAnniversaryNotification = notification.type === 'client_anniversary';
const isWeightNotification = notification.type === 'client_weight_added';

// Birthday → BirthdayDetailDialog
if (isBirthdayNotification && clientId) {
  setSelectedBirthdayNotification(notification);
  setBirthdayDialogOpen(true);
  setSheetOpen(false);
  return;
}

// Anniversary → AnniversaryDetailDialog  
if (isAnniversaryNotification && clientId) {
  setSelectedAnniversaryNotification(notification);
  setAnniversaryDialogOpen(true);
  setSheetOpen(false);
  return;
}

// Weight → Navigate to progress tab
if (isWeightNotification && clientId) {
  setSheetOpen(false);
  navigate(`/clients/${clientId}?tab=progress`);
  return;
}
```

---

## Shrnutí klíčových změn

1. **Zjednodušení na 3 kategorie** - Klientská aktivita, Zpětná vazba, Důležité události

2. **Narozeniny viditelné ve výchozím stavu** - přesunuty z Admin do nové kategorie "Události"

3. **Každá notifikace je akciovatelná** - kliknutí otevře relevantní detail dialog

4. **Vyřazení nepodstatných notifikací** - kredity, milníky, streaky zůstávají pouze na dashboardu

5. **Nové dialogy pro události** - BirthdayDetailDialog a AnniversaryDetailDialog s rychlými akcemi

6. **Konzistentní UX** - všechny notifikace fungují stejným způsobem (kliknutí = detail)
