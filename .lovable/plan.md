
# Oprava notifikačního centra - zobrazení jmen a klikatelnost

## Identifikované problémy

| Problém | Příčina | Řešení |
|---------|---------|--------|
| Agregované položky nezobrazují jména klientů | Zobrazuje se `item.title` ("Klient cvičil") místo `item.message` ("Honza Kynzl si zapsal...") | Extrahovat jméno z message nebo použít client_id pro lookup |
| Zpětné vazby nejsou klikatelné | `onItemClick` je předáván pouze pro kategorii `activity`, ne pro `forms` | Přidat handler pro `forms` kategorii |
| Chybí navigace po kliknutí na položku feedbacku | Není implementován `handleFeedbackItemClick` | Vytvořit handler podobný `handleWorkoutItemClick` |

---

## Technické řešení

### 1. Vylepšení zobrazení jmen v agregovaných položkách

V souboru `src/components/notifications/UnifiedNotificationItem.tsx` změnit zobrazení rozbalených položek:

**Aktuálně (řádek 259):**
```typescript
<span className="flex-1 truncate">{item.title}</span>
```

**Nově:**
```typescript
// Extrahovat jméno klienta z message (např. "Honza Kynzl si zapsal...")
const getClientNameFromMessage = (message: string): string => {
  // Pattern pro workout: "Jméno si zapsal/a..."
  const workoutMatch = message.match(/^(.+?)\s+si zapsal/);
  if (workoutMatch) return workoutMatch[1];
  
  // Pattern pro feedback: "Jméno: 💪 Svalovka..."
  const feedbackMatch = message.match(/^(.+?):\s+💪/);
  if (feedbackMatch) return feedbackMatch[1];
  
  return message.split(':')[0] || message;
};

// V renderování:
<span className="flex-1 truncate font-medium">
  {getClientNameFromMessage(item.message)}
</span>
```

### 2. Přidání handleru pro kliknutí na feedback

V souboru `src/components/notifications/NotificationCenter.tsx`:

```typescript
// Nový handler pro feedback položky
const handleFeedbackItemClick = useCallback(async (item: UnifiedNotification) => {
  // Mark as read
  if (!item.is_read && !item.id.startsWith('aggregated-')) {
    markRead.mutate(item.id);
  }
  
  // Fetch feedback data a zobrazit dialog
  const trainingId = item.entity_id;
  if (trainingId) {
    setLoadingFeedback(true);
    try {
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('training_session_id', trainingId)
        .order('created_at', { ascending: false })
        .limit(1);

      const feedback = feedbacks?.[0];
      if (feedback) {
        // ... fetch client name and training date
        setSelectedFeedback(feedback);
        setFeedbackMeta({ clientName, trainingDate });
        setFeedbackDialogOpen(true);
      }
    } finally {
      setLoadingFeedback(false);
    }
  }
}, [markRead]);
```

### 3. Předání handleru pro forms kategorii

Změnit v `renderCategorySection`:

**Aktuálně (řádky 402-412):**
```typescript
onItemClick={
  category === 'activity' 
    ? (item) => { ... }
    : undefined
}
```

**Nově:**
```typescript
onItemClick={(item: UnifiedNotification) => {
  if (category === 'activity') {
    if (item.type === 'client_workout_logged') {
      handleWorkoutItemClick(item);
    } else {
      handleNutritionItemClick(item);
    }
  } else if (category === 'forms') {
    handleFeedbackItemClick(item);
  } else if (category === 'events') {
    // Narozeniny, výročí - použít existující handlery
    handleNotificationClick(item);
  }
}}
```

---

## Vylepšení UI agregovaných položek

### Vizuální změny v UnifiedNotificationItem.tsx

1. **Zobrazit ikonu typu tréninku** u workout položek (💪, 🏃, 🧘)
2. **Přidat chevron** pro indikaci, že položka je klikatelná
3. **Zobrazit náhled feedbacku** u zpětných vazeb (např. "Svalovka: 8/10")

```text
PŘED (rozbalená agregovaná notifikace):
┌────────────────────────────────────────────────────────────┐
│ Klient cvičil                                       Včera >│
│ Klient cvičil                                       Včera >│
│ Klient cvičil                                  před 1 dnem>│
└────────────────────────────────────────────────────────────┘

PO (vylepšená verze):
┌────────────────────────────────────────────────────────────┐
│ 💪 Honza Kynzl                               cycling  >    │
│ 🏃 Milan Dolák                               run      >    │
│ 🧘 Eva Nováková                              other    >    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 📬 Honza Kynzl         Svalovka 8 | Pocit 5         Včera >│
│ 📬 Milan Dolák         Svalovka 3 | Pocit 5         Včera >│
│ 📬 Zuzka K.            Svalovka 6 | Pocit 10        Včera >│
└────────────────────────────────────────────────────────────┘
```

---

## Soubory k úpravě

| Soubor | Změny |
|--------|-------|
| `src/components/notifications/UnifiedNotificationItem.tsx` | Extrakce jména z message, lepší zobrazení položek |
| `src/components/notifications/NotificationCenter.tsx` | Přidání handleFeedbackItemClick, rozšíření onItemClick pro všechny kategorie |
| `src/hooks/useAggregatedNotifications.ts` | Vylepšit agregovanou message tak, aby obsahovala skutečná jména |

---

## Shrnutí změn

1. **Zobrazení jmen** - Agregované položky budou zobrazovat jména klientů místo generického "Klient cvičil"
2. **Klikatelnost** - Všechny rozbalené položky budou klikatelné a otevřou příslušný dialog
3. **Lepší UX** - Přidání ikon a náhledů metrik přímo v seznamu
4. **Konzistence** - Stejný handler pattern pro všechny kategorie notifikací

### Očekávaný výsledek
- Trenér vidí KDO cvičil/dal zpětnou vazbu přímo v seznamu
- Kliknutím na položku se otevře detail (WorkoutLogDetailDialog nebo FeedbackDetailDialog)
- Všechny notifikace jsou actionable
