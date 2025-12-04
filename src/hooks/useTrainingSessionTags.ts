import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tag } from "./useTags";

export interface TrainingSessionTag {
  id: string;
  training_session_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

// Fetch tags for a specific training session
export function useTrainingSessionTags(trainingSessionId: string | undefined) {
  return useQuery({
    queryKey: ["training_session_tags", trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return [];
      
      const { data, error } = await supabase
        .from("training_session_tags")
        .select(`
          id,
          training_session_id,
          tag_id,
          created_at,
          tags:tag_id (id, name, color)
        `)
        .eq("training_session_id", trainingSessionId);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        tag: item.tags as unknown as Tag
      })) as TrainingSessionTag[];
    },
    enabled: !!trainingSessionId,
  });
}

// Fetch all training sessions with their tags for a client
export function useClientTrainingHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_training_history", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch tags for all sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: tags, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          id,
          training_session_id,
          tag_id,
          tags:tag_id (id, name, color)
        `)
        .in("training_session_id", sessionIds);

      if (tagsError) throw tagsError;

      // Map tags to sessions
      return sessions.map(session => ({
        ...session,
        tags: tags
          .filter(t => t.training_session_id === session.id)
          .map(t => t.tags as unknown as Tag)
          .filter(Boolean)
      }));
    },
    enabled: !!clientId,
  });
}

// Add tags to a training session
export function useAddTrainingSessionTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingSessionId, 
      tagIds 
    }: { 
      trainingSessionId: string; 
      tagIds: string[];
    }) => {
      if (tagIds.length === 0) return [];

      const insertData = tagIds.map(tagId => ({
        training_session_id: trainingSessionId,
        tag_id: tagId,
      }));

      const { data, error } = await supabase
        .from("training_session_tags")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_session_tags", variables.trainingSessionId] });
      queryClient.invalidateQueries({ queryKey: ["client_training_history"] });
    },
    onError: (error) => {
      console.error("Error adding training session tags:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat štítky k tréninku.",
        variant: "destructive",
      });
    },
  });
}

// Update tags for a training session (replace all)
export function useUpdateTrainingSessionTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingSessionId, 
      tagIds 
    }: { 
      trainingSessionId: string; 
      tagIds: string[];
    }) => {
      // Delete existing tags
      const { error: deleteError } = await supabase
        .from("training_session_tags")
        .delete()
        .eq("training_session_id", trainingSessionId);

      if (deleteError) throw deleteError;

      // Insert new tags
      if (tagIds.length === 0) return [];

      const insertData = tagIds.map(tagId => ({
        training_session_id: trainingSessionId,
        tag_id: tagId,
      }));

      const { data, error } = await supabase
        .from("training_session_tags")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["training_session_tags", variables.trainingSessionId] });
      queryClient.invalidateQueries({ queryKey: ["client_training_history"] });
      toast({
        title: "Štítky aktualizovány",
        description: "Štítky tréninku byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating training session tags:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat štítky.",
        variant: "destructive",
      });
    },
  });
}

// Get tag statistics for a client
export function useClientTagStats(clientId: string | undefined, dateRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ["client_tag_stats", clientId, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!clientId) return [];

      let query = supabase
        .from("training_sessions")
        .select("id, date, status")
        .eq("client_id", clientId)
        .eq("status", "completed");

      if (dateRange) {
        query = query
          .gte("date", dateRange.start.toISOString())
          .lte("date", dateRange.end.toISOString());
      }

      const { data: sessions, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;

      if (sessions.length === 0) return [];

      const sessionIds = sessions.map(s => s.id);
      const { data: tagLinks, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          tag_id,
          tags:tag_id (id, name, color)
        `)
        .in("training_session_id", sessionIds);

      if (tagsError) throw tagsError;

      // Count tags
      const tagCounts: Record<string, { tag: Tag; count: number }> = {};
      tagLinks.forEach(link => {
        const tag = link.tags as unknown as Tag;
        if (tag) {
          if (!tagCounts[tag.id]) {
            tagCounts[tag.id] = { tag, count: 0 };
          }
          tagCounts[tag.id].count++;
        }
      });

      return Object.values(tagCounts).sort((a, b) => b.count - a.count);
    },
    enabled: !!clientId,
  });
}
