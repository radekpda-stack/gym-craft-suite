-- Fix RLS policy to allow clients to create notifications for their trainers
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can create their own notifications" ON notifications;

-- Create a new policy that allows:
-- 1. Users creating notifications for themselves (trainers)
-- 2. Clients creating notifications for their trainers via client_accounts
CREATE POLICY "Users and clients can create notifications"
ON notifications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM client_accounts ca
    WHERE ca.auth_user_id = auth.uid()
    AND ca.trainer_id = notifications.user_id
    AND ca.is_active = true
  )
);