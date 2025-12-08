-- Add visceral_fat column to measurements table for PDF import feature
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS visceral_fat integer NULL;