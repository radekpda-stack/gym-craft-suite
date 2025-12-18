-- Make storage buckets public for displaying photos
UPDATE storage.buckets SET public = true WHERE id = 'client-photos';
UPDATE storage.buckets SET public = true WHERE id = 'client-audio';