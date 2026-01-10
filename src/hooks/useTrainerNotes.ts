import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TrainerNote {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
  } | null;
  media?: TrainerNoteMedia[];
}

export interface TrainerNoteMedia {
  id: string;
  note_id: string;
  user_id: string;
  type: 'photo' | 'video' | 'audio';
  file_path: string;
  file_name: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  created_at: string;
  url?: string;
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  client_id?: string | null;
  is_pinned?: boolean;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  client_id?: string | null;
  is_pinned?: boolean;
}

// Fetch all trainer notes
export function useTrainerNotes(options?: {
  clientId?: string;
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  pinnedFirst?: boolean;
}) {
  const { user } = useAuth();
  const { clientId, searchQuery, sortBy = 'created_at', sortOrder = 'desc', pinnedFirst = true } = options || {};

  return useQuery({
    queryKey: ['trainer-notes', user?.id, clientId, searchQuery, sortBy, sortOrder, pinnedFirst],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('trainer_notes')
        .select(`
          *,
          client:clients!client_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      // Filter by client
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      // Search in title and content
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // Sorting
      if (pinnedFirst) {
        query = query.order('is_pinned', { ascending: false });
      }
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TrainerNote[];
    },
    enabled: !!user?.id,
  });
}

// Fetch single note with media
export function useTrainerNote(noteId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trainer-note', noteId],
    queryFn: async () => {
      if (!noteId || !user?.id) return null;

      const { data: note, error: noteError } = await supabase
        .from('trainer_notes')
        .select(`
          *,
          client:clients!client_id (
            id,
            name
          )
        `)
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (noteError) throw noteError;

      // Fetch media for this note
      const { data: media, error: mediaError } = await supabase
        .from('trainer_note_media')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (mediaError) throw mediaError;

      // Generate signed URLs for media
      const mediaWithUrls = await Promise.all(
        (media || []).map(async (m) => {
          const { data: signedUrl } = await supabase.storage
            .from('trainer-note-media')
            .createSignedUrl(m.file_path, 3600);
          return { ...m, url: signedUrl?.signedUrl };
        })
      );

      return { ...note, media: mediaWithUrls } as TrainerNote;
    },
    enabled: !!noteId && !!user?.id,
  });
}

// Fetch media for a note
export function useTrainerNoteMedia(noteId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trainer-note-media', noteId],
    queryFn: async () => {
      if (!noteId || !user?.id) return [];

      const { data, error } = await supabase
        .from('trainer_note_media')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Generate signed URLs
      const mediaWithUrls = await Promise.all(
        (data || []).map(async (m) => {
          const { data: signedUrl } = await supabase.storage
            .from('trainer-note-media')
            .createSignedUrl(m.file_path, 3600);
          return { ...m, url: signedUrl?.signedUrl } as TrainerNoteMedia;
        })
      );

      return mediaWithUrls;
    },
    enabled: !!noteId && !!user?.id,
  });
}

// Create note
export function useCreateTrainerNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trainer_notes')
        .insert({
          user_id: user.id,
          title: input.title || null,
          content: input.content,
          client_id: input.client_id || null,
          is_pinned: input.is_pinned || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TrainerNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] });
    },
  });
}

// Update note
export function useUpdateTrainerNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.client_id !== undefined) updateData.client_id = input.client_id;
      if (input.is_pinned !== undefined) updateData.is_pinned = input.is_pinned;

      const { data, error } = await supabase
        .from('trainer_notes')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as TrainerNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-note', variables.id] });
    },
  });
}

// Delete note
export function useDeleteTrainerNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // First, delete associated media files from storage
      const { data: media } = await supabase
        .from('trainer_note_media')
        .select('file_path')
        .eq('note_id', noteId);

      if (media && media.length > 0) {
        const filePaths = media.map((m) => m.file_path);
        await supabase.storage.from('trainer-note-media').remove(filePaths);
      }

      // Delete the note (media records will be cascade deleted)
      const { error } = await supabase
        .from('trainer_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] });
    },
  });
}

// Upload media to note
export function useUploadNoteMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, file, type }: { noteId: string; file: File; type: 'photo' | 'video' | 'audio' }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${noteId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('trainer-note-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('trainer_note_media')
        .insert({
          note_id: noteId,
          user_id: user.id,
          type,
          file_path: filePath,
          file_name: file.name,
        })
        .select()
        .single();

      if (error) throw error;

      // Get signed URL
      const { data: signedUrl } = await supabase.storage
        .from('trainer-note-media')
        .createSignedUrl(filePath, 3600);

      return { ...data, url: signedUrl?.signedUrl } as TrainerNoteMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-note', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['trainer-note-media', variables.noteId] });
    },
  });
}

// Delete media from note
export function useDeleteNoteMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, filePath, noteId }: { mediaId: string; filePath: string; noteId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Delete from storage
      await supabase.storage.from('trainer-note-media').remove([filePath]);

      // Delete database record
      const { error } = await supabase
        .from('trainer_note_media')
        .delete()
        .eq('id', mediaId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-note', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['trainer-note-media', variables.noteId] });
    },
  });
}

// Toggle pin status
export function useToggleNotePin() {
  const updateNote = useUpdateTrainerNote();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return updateNote.mutateAsync({ id, is_pinned: !isPinned });
    },
  });
}
