import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type MediaType = 'photo' | 'audio';

export interface ClientMedia {
  id: string;
  client_id: string;
  diagnostic_id: string | null;
  type: MediaType;
  file_url: string;
  file_name: string;
  description: string;
  tags: string[];
  category: string;
  body_area: string | null;
  date: string;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface CreateMediaInput {
  client_id: string;
  type: MediaType;
  file: File;
  description?: string;
  tags?: string[];
  category?: string;
  body_area?: string;
  date?: string;
  duration_seconds?: number;
  diagnostic_id?: string;
}

export interface UpdateMediaInput {
  id: string;
  description?: string;
  tags?: string[];
  category?: string;
  body_area?: string;
  date?: string;
  diagnostic_id?: string | null;
}

export const BODY_AREA_OPTIONS = [
  { value: 'front', label: 'Přední strana' },
  { value: 'back', label: 'Zadní strana' },
  { value: 'left', label: 'Levá strana' },
  { value: 'right', label: 'Pravá strana' },
  { value: 'head', label: 'Hlava' },
  { value: 'torso', label: 'Trup' },
  { value: 'arms', label: 'Paže' },
  { value: 'legs', label: 'Nohy' },
  { value: 'posture', label: 'Postura' },
];

export const CATEGORY_OPTIONS = [
  { value: 'diagnostic', label: 'Diagnostika' },
  { value: 'progress', label: 'Pokrok' },
  { value: 'training', label: 'Trénink' },
  { value: 'injury', label: 'Zranění' },
  { value: 'general', label: 'Obecné' },
];

export function useClientMedia(clientId?: string, type?: MediaType, diagnosticId?: string) {
  return useQuery({
    queryKey: ["client-media", clientId, type, diagnosticId],
    queryFn: async () => {
      let query = supabase
        .from("client_media")
        .select("*")
        .order("date", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      if (type) {
        query = query.eq("type", type);
      }
      if (diagnosticId) {
        query = query.eq("diagnostic_id", diagnosticId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ClientMedia[];
    },
    enabled: !!clientId,
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMediaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const bucket = input.type === 'photo' ? 'client-photos' : 'client-audio';
      const fileExt = input.file.name.split('.').pop();
      // Use user.id as the folder prefix for storage policies
      const fileName = `${user.id}/${input.client_id}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, input.file);

      if (uploadError) throw uploadError;

      // Get signed URL (buckets are now private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      // Create database record
      const { data, error } = await supabase
        .from("client_media")
        .insert({
          client_id: input.client_id,
          type: input.type,
          file_url: fileName, // Store file path instead of public URL
          file_name: input.file.name,
          description: input.description || "",
          tags: input.tags || [],
          category: input.category || "general",
          body_area: input.body_area,
          date: input.date || new Date().toISOString().split('T')[0],
          duration_seconds: input.duration_seconds,
          diagnostic_id: input.diagnostic_id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, signedUrl: urlData.signedUrl };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-media", variables.client_id] });
      toast({
        title: variables.type === 'photo' ? "Fotografie nahrána" : "Hlasová poznámka nahrána",
        description: "Soubor byl úspěšně uložen.",
      });
    },
    onError: (error) => {
      console.error("Error uploading media:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nahrát soubor.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMediaInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("client_media")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-media"] });
      toast({
        title: "Uloženo",
        description: "Změny byly uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating media:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fileUrl, type }: { id: string; fileUrl: string; type: MediaType }) => {
      const bucket = type === 'photo' ? 'client-photos' : 'client-audio';
      
      // fileUrl now contains the file path directly
      await supabase.storage.from(bucket).remove([fileUrl]);

      const { error } = await supabase
        .from("client_media")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-media"] });
      toast({
        title: "Smazáno",
        description: "Soubor byl odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting media:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat soubor.",
        variant: "destructive",
      });
    },
  });
}

// Helper hook to get signed URLs for media
export function useSignedUrl(filePath: string | undefined, type: MediaType) {
  return useQuery({
    queryKey: ["signed-url", filePath, type],
    queryFn: async () => {
      if (!filePath) return null;
      const bucket = type === 'photo' ? 'client-photos' : 'client-audio';
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 1000 * 60 * 50, // 50 minutes (refresh before 1 hour expiry)
  });
}
