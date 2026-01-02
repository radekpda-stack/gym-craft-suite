
-- Add RLS policy to allow clients to insert feedback for themselves via client portal
CREATE POLICY "Clients can insert feedback for themselves via portal"
ON training_feedback
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT ca.client_id 
    FROM client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);

-- Also allow clients to view their own feedback
CREATE POLICY "Clients can view their own feedback"
ON training_feedback
FOR SELECT
USING (
  client_id IN (
    SELECT ca.client_id 
    FROM client_accounts ca 
    WHERE ca.auth_user_id = auth.uid()
  )
);
