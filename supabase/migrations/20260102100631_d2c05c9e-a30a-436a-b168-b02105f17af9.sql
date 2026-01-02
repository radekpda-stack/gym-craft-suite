-- Add DELETE policies for clients on nutrition entry tables
-- Clients can only delete their own entries (within their sessions)

-- DELETE policy for nutrition_food_entries
CREATE POLICY "Clients can delete their own food entries"
ON public.nutrition_food_entries
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.nutrition_log_sessions
    WHERE client_id IN (
      SELECT client_id FROM public.client_accounts
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- DELETE policy for nutrition_drink_entries
CREATE POLICY "Clients can delete their own drink entries"
ON public.nutrition_drink_entries
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.nutrition_log_sessions
    WHERE client_id IN (
      SELECT client_id FROM public.client_accounts
      WHERE auth_user_id = auth.uid()
    )
  )
);

-- DELETE policy for nutrition_coffee_entries
CREATE POLICY "Clients can delete their own coffee entries"
ON public.nutrition_coffee_entries
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.nutrition_log_sessions
    WHERE client_id IN (
      SELECT client_id FROM public.client_accounts
      WHERE auth_user_id = auth.uid()
    )
  )
);