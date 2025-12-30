-- Add RLS policies for client portal users to INSERT their own measurements and cardio entries

-- Policy: Clients can insert measurements for themselves
CREATE POLICY "Clients can insert own measurements"
ON public.measurements
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_client_id_for_user(auth.uid())
);

-- Policy: Clients can insert cardio entries for themselves  
CREATE POLICY "Clients can insert own cardio entries"
ON public.cardio_entries
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = get_client_id_for_user(auth.uid())
);

-- Policy: Clients can view their own cardio entries
CREATE POLICY "Clients can view own cardio entries"
ON public.cardio_entries
FOR SELECT
TO authenticated
USING (
  client_id = get_client_id_for_user(auth.uid())
);