-- Add media_urls column to challenge_submissions
ALTER TABLE public.challenge_submissions 
ADD COLUMN IF NOT EXISTS media_urls TEXT[];

-- Add auto-award settings to challenges
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS auto_award_winners BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS winner_xp_1st INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS winner_xp_2nd INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS winner_xp_3rd INTEGER DEFAULT 25;

-- Create storage bucket for challenge media
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-media', 'challenge-media', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload challenge media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'challenge-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Users can view their own media
CREATE POLICY "Users can view own challenge media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'challenge-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Trainers can view all challenge media (via service role in edge functions)
-- For trainer app, we'll use signed URLs generated server-side

-- RLS policy: Users can delete their own media
CREATE POLICY "Users can delete own challenge media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'challenge-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);