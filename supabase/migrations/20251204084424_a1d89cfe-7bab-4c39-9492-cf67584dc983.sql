-- Create storage buckets for client media
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('client-audio', 'client-audio', true);

-- Storage policies for photos
CREATE POLICY "Anyone can view client photos" ON storage.objects FOR SELECT USING (bucket_id = 'client-photos');
CREATE POLICY "Anyone can upload client photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-photos');
CREATE POLICY "Anyone can update client photos" ON storage.objects FOR UPDATE USING (bucket_id = 'client-photos');
CREATE POLICY "Anyone can delete client photos" ON storage.objects FOR DELETE USING (bucket_id = 'client-photos');

-- Storage policies for audio
CREATE POLICY "Anyone can view client audio" ON storage.objects FOR SELECT USING (bucket_id = 'client-audio');
CREATE POLICY "Anyone can upload client audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-audio');
CREATE POLICY "Anyone can update client audio" ON storage.objects FOR UPDATE USING (bucket_id = 'client-audio');
CREATE POLICY "Anyone can delete client audio" ON storage.objects FOR DELETE USING (bucket_id = 'client-audio');

-- Create client_media table for photos and voice notes
CREATE TABLE public.client_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  body_area TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_media ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all operations on client_media" ON public.client_media FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_client_media_updated_at
  BEFORE UPDATE ON public.client_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_client_media_client_id ON public.client_media(client_id);
CREATE INDEX idx_client_media_type ON public.client_media(type);
CREATE INDEX idx_client_media_date ON public.client_media(date DESC);