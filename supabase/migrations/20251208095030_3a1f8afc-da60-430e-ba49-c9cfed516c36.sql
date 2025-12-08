-- Create storage bucket for measurement files (PDF, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'measurement-files', 
  'measurement-files', 
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
);

-- RLS policies for measurement-files bucket
CREATE POLICY "Users can upload their own measurement files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'measurement-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own measurement files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'measurement-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own measurement files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'measurement-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add source_file_url column to measurements table
ALTER TABLE public.measurements 
ADD COLUMN IF NOT EXISTS source_file_url TEXT;