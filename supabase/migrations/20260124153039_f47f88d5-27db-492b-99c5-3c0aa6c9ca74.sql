-- Drop existing constraint if exists and add new one with expanded types
ALTER TABLE client_media 
DROP CONSTRAINT IF EXISTS client_media_type_check;

ALTER TABLE client_media 
ADD CONSTRAINT client_media_type_check 
CHECK (type IN ('photo', 'audio', 'video', 'document'));

-- Create storage buckets for videos and documents
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('client-videos', 'client-videos', false),
  ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client-videos bucket
CREATE POLICY "Users can view own client videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload client videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own client videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own client videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for client-documents bucket
CREATE POLICY "Users can view own client documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own client documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own client documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);