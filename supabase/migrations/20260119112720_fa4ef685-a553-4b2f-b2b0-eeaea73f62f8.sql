-- Fix basal_metabolism column type from integer to numeric to support decimal values
ALTER TABLE public.measurements 
ALTER COLUMN basal_metabolism TYPE numeric USING basal_metabolism::numeric;