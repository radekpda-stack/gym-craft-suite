-- Add coffee_name column to nutrition_coffee_entries table
-- This allows clients to specify what exactly they drank when selecting "other" (Jiné)

ALTER TABLE public.nutrition_coffee_entries 
ADD COLUMN IF NOT EXISTS coffee_name TEXT;