-- Fix function search_path for the new trigger function
CREATE OR REPLACE FUNCTION public.update_test_tables_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;