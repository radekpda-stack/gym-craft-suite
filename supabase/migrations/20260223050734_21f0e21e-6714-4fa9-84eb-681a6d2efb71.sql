
-- Add public stats columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_stats_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_stats_slug text;

-- Add unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_public_stats_slug 
  ON public.profiles (public_stats_slug) 
  WHERE public_stats_slug IS NOT NULL;

-- Allow public read of slug/enabled for the edge function lookup
CREATE POLICY "Public can read public stats slug"
  ON public.profiles
  FOR SELECT
  USING (public_stats_enabled = true);
