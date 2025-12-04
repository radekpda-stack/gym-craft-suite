-- Remove overly permissive policies from client-photos bucket
DROP POLICY IF EXISTS "Anyone can view client photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload client photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update client photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete client photos" ON storage.objects;

-- Remove overly permissive policies from client-audio bucket
DROP POLICY IF EXISTS "Anyone can view client audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload client audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update client audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete client audio" ON storage.objects;