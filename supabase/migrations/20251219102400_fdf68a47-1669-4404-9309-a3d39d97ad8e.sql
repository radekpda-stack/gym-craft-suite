-- Add admin role for radek.pda@gmail.com
INSERT INTO user_roles (user_id, role) 
VALUES ('ec31b7f8-001f-4fb4-8dc4-b7bb8be9311b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own feature_usage" ON feature_usage;

-- Create new policy: admin sees all, others see only their own
CREATE POLICY "Users can view feature_usage" ON feature_usage
FOR SELECT USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);