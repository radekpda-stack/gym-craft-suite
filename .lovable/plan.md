
# Detail tréninku klienta v notifikacích

## Přehled problému

Při kliknutí na notifikaci "Klient cvičil" se nic neotevře - notifikace není klikatelná a trenér nevidí, co klient zapsal.

```text
AKTUÁLNÍ STAV:
┌─────────────────────────────────────────┐
│ 🏋️ Tréninky & Cvičení                  │
│ └─ Jana Nováková si zapsal/a vlastní   │
│    silový trénink.            Včera    │ ← Neklikatelné
└─────────────────────────────────────────┘

NOVÝ STAV:
┌─────────────────────────────────────────┐
│ 🏋️ Tréninky & Cvičení                  │
│ └─ Jana Nováková si zapsal/a vlastní   │
│    silový trénink.            Včera [>]│ ← Kliknutí otevře dialog
└─────────────────────────────────────────┘

DIALOG PO KLIKNUTÍ:
┌─────────────────────────────────────────────┐
│ 🏋️ Trénink klienta                    [✕] │
│ Jana Nováková • Úterý 28.1.2025            │
├─────────────────────────────────────────────┤
│                                             │
│ PŘEHLED                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ 💪 Silový trénink                       │ │
│ │ ⏱️ 45 minut                             │ │
│ │ ⚡ Energie: 6 → 8                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ CVIKY (3)                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. Bench Press                          │ │
│ │    3×10 @ 80 kg • RPE 8                 │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 2. Dřepy                                │ │
│ │    4×8 @ 100 kg • RPE 9                 │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 3. Mrtvý tah                            │ │
│ │    3×5 @ 120 kg • RPE 7                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ POZNÁMKY                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ Cítil jsem se skvěle, ale trochu       │ │
│ │ bolelo rameno u bench pressu.           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│ [Zobrazit celý deník]           [Zavřít]   │
└─────────────────────────────────────────────┘
```

---

## Technická implementace

### 1. Data dostupná v notifikaci

Notifikace `client_workout_logged` obsahuje:
- `client_id` - ID klienta
- `entity_type: 'workout_log'`
- `entity_id` - ID záznamu v `client_workout_logs`
- `message` - "{clientName} si zapsal/a vlastní {workoutType}."

### 2. Data v databázi

**client_workout_logs:**
- `id`, `client_id`, `trainer_id`
- `date` - datum tréninku
- `workout_type` - typ tréninku (silový, kardio, atd.)
- `duration_minutes` - délka v minutách
- `energy_before`, `energy_after` - energie před/po (1-10)
- `notes` - poznámky klienta
- `trainer_comment` - komentář trenéra

**client_workout_exercises:**
- `workout_log_id` - vazba na log
- `exercise_name` - název cviku
- `sets`, `reps` - série a opakování
- `weight_kg` - váha
- `rpe` - intenzita
- `duration_seconds`, `distance_meters` - pro kardio
- `notes` - poznámky ke cviku
- `side` - strana (left/right/both/none)

### 3. Nová komponenta - WorkoutLogDetailDialog

```typescript
interface WorkoutLogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}
```

Dialog:
1. Extrahuje `entity_id` z notifikace (= workout_log_id)
2. Načte data z `client_workout_logs` a `client_workout_exercises`
3. Zobrazí přehled tréninku a seznam cviků
4. Tlačítko pro navigaci na celý deník klienta

---

## Změny v souborech

| Soubor | Změna |
|--------|-------|
| `WorkoutLogDetailDialog.tsx` | **Nový** - Dialog pro zobrazení detailu tréninku |
| `NotificationCenter.tsx` | Přidat handler pro `client_workout_logged` notifikace |
| `UnifiedNotificationItem.tsx` | Přidat `onItemClick` i pro training kategorii |

---

## Detail dialogu - sekce

### Sekce PŘEHLED
- Ikona typu tréninku (💪 silový, 🏃 kardio, 🧘 mobilita, atd.)
- Typ tréninku (text)
- Délka tréninku (minuty)
- Energie před → po (vizuální indikátor)

### Sekce CVIKY
Pro každý cvik z `client_workout_exercises`:
- Číslo pořadí + název cviku
- Formát: `{sets}×{reps} @ {weight_kg} kg`
- RPE badge
- Pro kardio: `{duration_seconds}s` nebo `{distance_meters}m`
- Poznámky ke cviku (pokud existují)
- Strana (L/R badge pro jednostranné cviky)

### Sekce POZNÁMKY
- Poznámky klienta k celému tréninku
- Pokud prázdné, sekce se nezobrazí

### Prázdný stav
Pokud workout_log neexistuje nebo nebyl nalezen:
- "Záznam tréninku nebyl nalezen"
- Nabídnout přechod na profil klienta

---

## Integrace do NotificationCenter

### Přidat stav
```typescript
const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
const [selectedWorkoutNotification, setSelectedWorkoutNotification] = 
  useState<UnifiedNotification | null>(null);
```

### Přidat handler pro `client_workout_logged`
```typescript
const isWorkoutLogNotification = notification.type === 'client_workout_logged';

if (isWorkoutLogNotification && notification.entity_id) {
  setSelectedWorkoutNotification(notification);
  setWorkoutDialogOpen(true);
  setSheetOpen(false);
  return;
}
```

### Přidat handler pro agregované položky
```typescript
const handleWorkoutItemClick = useCallback((item: UnifiedNotification) => {
  if (!item.is_read && !item.id.startsWith('aggregated-')) {
    markRead.mutate(item.id);
  }
  setSelectedWorkoutNotification(item);
  setWorkoutDialogOpen(true);
}, [markRead]);
```

### Předat do UnifiedNotificationItem
```typescript
<UnifiedNotificationItem
  // ...
  onItemClick={
    category === 'nutrition' ? handleNutritionItemClick :
    category === 'training' ? handleWorkoutItemClick :
    undefined
  }
/>
```

---

## Formátování cviků

```text
Příklady zobrazení:

SILOVÝ CVIK:
┌─────────────────────────────────────────┐
│ 1. Bench Press                          │
│    3×10 @ 80 kg                    RPE 8│
└─────────────────────────────────────────┘

KARDIO CVIK:
┌─────────────────────────────────────────┐
│ 2. Běh na páse                          │
│    20 min • 3.5 km                      │
└─────────────────────────────────────────┘

JEDNOSTRANNÝ CVIK:
┌─────────────────────────────────────────┐
│ 3. Výpady                          [L]  │
│    3×12 @ 20 kg                    RPE 7│
│    Poznámka: Levá noha slabší           │
└─────────────────────────────────────────┘
```

---

## Ikony typů tréninku

| Typ | Ikona | Label |
|-----|-------|-------|
| strength / silový | 💪 | Silový trénink |
| cardio / kardio | 🏃 | Kardio |
| mobility / mobilita | 🧘 | Mobilita |
| hiit | ⚡ | HIIT |
| crossfit | 🏋️ | CrossFit |
| other / ostatní | 🎯 | Trénink |

---

## Implementační kroky

### Krok 1: WorkoutLogDetailDialog.tsx (nový soubor)
- Fetch logika pro `client_workout_logs` a `client_workout_exercises`
- UI pro přehled, cviky a poznámky
- Navigace na deník klienta

### Krok 2: NotificationCenter.tsx
- Přidat stavy pro dialog
- Přidat handler v `handleNotificationClick` pro `client_workout_logged`
- Přidat `handleWorkoutItemClick` pro agregované položky
- Předat `onItemClick` pro training kategorii
- Přidat `WorkoutLogDetailDialog` do JSX

---

## Časový odhad

| Úkol | Čas |
|------|-----|
| WorkoutLogDetailDialog | 35 min |
| NotificationCenter integrace | 15 min |
| **Celkem** | **~50 minut** |
