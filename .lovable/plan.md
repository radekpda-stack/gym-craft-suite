
# Plan: Add Recurring Training Feature to Calendar

## Problem Analysis

The recurring training feature is partially implemented but not fully connected:

- The database already supports recurrence fields (`recurrence_type`, `recurrence_end_date`, `parent_session_id`)
- The backend hook (`useCreateTrainingSession`) already generates child sessions for recurring trainings
- The form (`TrainingForm`) has the recurrence UI section
- **BUT** the `CalendarPage.handleCreateTraining` function ignores the recurrence fields when calling the mutation

## Solution Overview

Connect the existing recurrence UI to the backend by passing the recurrence parameters through the creation flow.

---

## Implementation Steps

### Step 1: Update CalendarPage Handler
Modify `handleCreateTraining` to pass recurrence fields to the mutation:
- Extract `is_recurring`, `recurrence_type`, and `recurrence_count` from form data
- Calculate `recurrence_end_date` from the count
- Pass these to `createTraining.mutateAsync()`

### Step 2: Show Toast with Count
Display a toast message showing how many trainings were created (e.g., "Vytvořeno 8 tréninků").

### Step 3: Verify Visual Indicators
Ensure the existing `Repeat` icon displays correctly on both parent and child sessions in the calendar agenda view.

---

## Technical Details

### File: `src/pages/CalendarPage.tsx`

Update the `handleCreateTraining` function:

```text
const handleCreateTraining = async (data: TrainingFormValues) => {
  // Calculate recurrence end date if recurring
  let recurrence_end_date: string | undefined;
  let recurrence_type: 'weekly' | 'biweekly' | 'monthly' | undefined;
  
  if (data.is_recurring && data.recurrence_type && data.recurrence_count) {
    const startDate = new Date(data.date);
    recurrence_type = data.recurrence_type;
    
    const endDate = new Date(startDate);
    switch (data.recurrence_type) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + (data.recurrence_count * 7));
        break;
      case 'biweekly':
        endDate.setDate(endDate.getDate() + (data.recurrence_count * 14));
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + data.recurrence_count);
        break;
    }
    recurrence_end_date = endDate.toISOString();
  }

  const result = await createTraining.mutateAsync({
    client_id: data.client_id,
    date: data.date,
    duration: data.duration,
    participant_count: data.participant_count,
    notes: data.notes,
    status: data.status,
    recurrence_type,         // ADD THIS
    recurrence_end_date,     // ADD THIS
    trainingPrices,
  });
  
  // Show toast with count
  if (result?.createdCount && result.createdCount > 1) {
    toast({ title: `Vytvořeno ${result.createdCount} tréninků` });
  }
  
  // ... rest of the function
};
```

---

## User Experience Flow

1. User opens Calendar and clicks "+" to create a new training
2. User selects client, date/time, and duration
3. User sees "Opakující se trénink" toggle in the form
4. When toggled ON, two fields appear:
   - **Frekvence**: Každý týden / Každé 2 týdny / Každý měsíc
   - **Počet opakování**: Number input (1-52)
5. User submits, system creates all sessions at once
6. Toast shows "Vytvořeno X tréninků"
7. In the calendar, recurring sessions show a repeat icon (already implemented)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CalendarPage.tsx` | Update `handleCreateTraining` to pass recurrence fields |

---

## Scope Clarification

This plan activates the **existing** recurrence feature that is already built into the form and backend. No new UI components need to be created - the recurrence section in `TrainingForm` is already fully functional but was not connected to the data flow.
