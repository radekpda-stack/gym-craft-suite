-- Extend profiles table with trainer personalization fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to trainer profile photo';
COMMENT ON COLUMN public.profiles.bio IS 'Trainer biography/description';
COMMENT ON COLUMN public.profiles.specializations IS 'Array of specialization areas';
COMMENT ON COLUMN public.profiles.certifications IS 'Array of certifications/qualifications';
COMMENT ON COLUMN public.profiles.experience_years IS 'Years of experience as trainer';
COMMENT ON COLUMN public.profiles.social_links IS 'JSON object with social media links (instagram, facebook, linkedin, website)';
COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number';