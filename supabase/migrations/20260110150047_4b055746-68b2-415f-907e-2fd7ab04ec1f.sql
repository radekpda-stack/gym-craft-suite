-- Create trainer_notes table
CREATE TABLE public.trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trainer_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notes" ON public.trainer_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON public.trainer_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.trainer_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.trainer_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trainer_notes_user_id ON public.trainer_notes(user_id);
CREATE INDEX idx_trainer_notes_client_id ON public.trainer_notes(client_id);
CREATE INDEX idx_trainer_notes_created_at ON public.trainer_notes(created_at DESC);
CREATE INDEX idx_trainer_notes_is_pinned ON public.trainer_notes(is_pinned) WHERE is_pinned = true;

-- Create trainer_note_media table
CREATE TABLE public.trainer_note_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.trainer_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'audio')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trainer_note_media ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own note media" ON public.trainer_note_media
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own note media" ON public.trainer_note_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note media" ON public.trainer_note_media
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_trainer_note_media_note_id ON public.trainer_note_media(note_id);

-- Updated_at trigger
CREATE TRIGGER update_trainer_notes_updated_at
  BEFORE UPDATE ON public.trainer_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for note media
INSERT INTO storage.buckets (id, name, public)
VALUES ('trainer-note-media', 'trainer-note-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own note media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trainer-note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own note media"
ON storage.objects FOR SELECT
USING (bucket_id = 'trainer-note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own note media"
ON storage.objects FOR DELETE
USING (bucket_id = 'trainer-note-media' AND auth.uid()::text = (storage.foldername(name))[1]);