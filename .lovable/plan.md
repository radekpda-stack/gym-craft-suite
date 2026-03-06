

## Fix: Remove `user_id` from `client_confirmed_workouts` INSERT

### Problem
Line 126 of `rpc_complete_training_session` inserts into `client_confirmed_workouts` with a `user_id` column that doesn't exist on the table. The table only has: `id, client_id, performed_at, performed_date, workout_type, confirmed_by, xp, training_session_id, notes, created_at`.

### Solution
One database migration to replace the function, changing:

```sql
-- FROM:
INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, user_id)
VALUES (v_participant.client_id, p_session_id, v_session_record.date::date, p_trainer_id)

-- TO:
INSERT INTO client_confirmed_workouts (client_id, training_session_id, performed_date, confirmed_by)
VALUES (v_participant.client_id, p_session_id, v_session_record.date::date, 'trainer')
```

This uses the existing `confirmed_by` text column (which accepts 'trainer' or 'client') instead of a non-existent `user_id` column.

### Scope
- Single migration dropping and recreating `rpc_complete_training_session` with the corrected INSERT statement
- No frontend changes needed

