-- Create function to sync latest weight from measurements to clients table
CREATE OR REPLACE FUNCTION public.sync_weight_to_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the new measurement has a weight value
  IF NEW.weight IS NOT NULL THEN
    -- Check if this is the most recent measurement for the client
    -- We update only if there's no newer measurement with weight
    UPDATE public.clients
    SET weight = NEW.weight,
        updated_at = now()
    WHERE id = NEW.client_id
    AND NOT EXISTS (
      SELECT 1 FROM public.measurements m
      WHERE m.client_id = NEW.client_id
      AND m.weight IS NOT NULL
      AND m.date > NEW.date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on measurements table
DROP TRIGGER IF EXISTS sync_weight_on_measurement ON public.measurements;

CREATE TRIGGER sync_weight_on_measurement
AFTER INSERT OR UPDATE ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.sync_weight_to_client();

-- Backfill: Update all clients with their latest measurement weight
UPDATE public.clients c
SET weight = (
  SELECT m.weight
  FROM public.measurements m
  WHERE m.client_id = c.id
  AND m.weight IS NOT NULL
  ORDER BY m.date DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.measurements m
  WHERE m.client_id = c.id
  AND m.weight IS NOT NULL
);