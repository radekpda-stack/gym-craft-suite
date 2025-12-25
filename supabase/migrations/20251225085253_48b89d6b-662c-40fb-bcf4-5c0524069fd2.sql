
-- Create a security definer function to check if a user has shared their calendar with the current user
CREATE OR REPLACE FUNCTION public.has_shared_calendar_with_me(training_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_shares
    WHERE owner_user_id = training_owner_id
      AND shared_with_user_id = auth.uid()
      AND status = 'accepted'
  )
$$;

-- Add RLS policy to allow viewing training sessions from users who have shared their calendar
CREATE POLICY "Users can view training sessions shared with them"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (public.has_shared_calendar_with_me(user_id));
