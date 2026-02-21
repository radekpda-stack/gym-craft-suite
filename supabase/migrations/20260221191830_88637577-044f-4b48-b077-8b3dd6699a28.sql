-- Allow trainers to insert portal activity for their clients
CREATE POLICY "Trainers can insert client activity"
ON public.client_portal_activity
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);
