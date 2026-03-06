

## Fix: Add `performed_at` to `client_confirmed_workouts` INSERT

### Problem
The `performed_at` column on `client_confirmed_workouts` is `NOT NULL` with no default value. The current `rpc_complete_training_session` INSERT omits it, causing the error.

### Solution
One database migration to recreate the function, changing the INSERT from:

```sql
INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, confirmed_by)
VALUES (v_participant.client_id, p_session_id, v_session_record.date::date, 'trainer')
```

to:

```sql
INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, performed_at, confirmed_by)
VALUES (v_participant.client_id, p_session_id, v_session_record.date::date, NOW(), 'trainer')
```

### Scope
- Single migration to drop and recreate `rpc_complete_training_session` with the added `performed_at` column
- No frontend changes needed

