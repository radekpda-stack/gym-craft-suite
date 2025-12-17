-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Allow authenticated users to upload their own company logos
CREATE POLICY "Users can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own company logos
CREATE POLICY "Users can update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own company logos
CREATE POLICY "Users can delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to company logos (for PDF generation)
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');