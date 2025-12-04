/**
 * Training Session Tags Hook
 * 
 * Provides React Query hooks for managing tags associated with training sessions.
 * Includes functionality for:
 * - Fetching tags for a specific training session
 * - Fetching training history with tags for a client
 * - Adding/updating tags on training sessions
 * - Getting tag statistics for analytics
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tag } from "./useTags";

// ============================================================================
// Types
// ============================================================================

/** Represents a tag linked to a training session */
export interface TrainingSessionTag {
  id: string;
  training_session_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

/** Training session with associated tags for history display */
export interface TrainingWithTags {
  id: string;
  client_id: string;
  date: string;
  duration: number;
  status: string;
  notes: string | null;
  subjective_rating: number | null;
  participant_count: number | null;
  tags: Tag[];
}

/** Tag statistics for analytics */
export interface TagStatistic {
  tag: Tag;
  count: number;
}

/** Date range for filtering statistics */
export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Query Keys (for consistent cache management)
// ============================================================================

export const trainingTagsKeys = {
  all: ["training_session_tags"] as const,
  session: (sessionId: string) => ["training_session_tags", sessionId] as const,
  clientHistory: (clientId: string) => ["client_training_history", clientId] as const,
  clientStats: (clientId: string, dateRange?: DateRange) => [
    "client_tag_stats", 
    clientId, 
    dateRange?.start?.toISOString(), 
    dateRange?.end?.toISOString()
  ] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetches tags for a specific training session
 * @param trainingSessionId - The ID of the training session
 * @returns Query result with array of TrainingSessionTag
 */
export function useTrainingSessionTags(trainingSessionId: string | undefined) {
  return useQuery({
    queryKey: trainingTagsKeys.session(trainingSessionId || ""),
    queryFn: async (): Promise<TrainingSessionTag[]> => {
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
      
      // Transform nested tags relation to flat structure
      return data.map(item => ({
        ...item,
        tag: item.tags as unknown as Tag
      }));
    },
    enabled: !!trainingSessionId,
  });
}

/**
 * Fetches complete training history with tags for a client
 * Optimized to fetch all data in two queries instead of N+1
 * @param clientId - The client ID to fetch history for
 * @returns Query result with array of TrainingWithTags
 */
export function useClientTrainingHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: trainingTagsKeys.clientHistory(clientId || ""),
    queryFn: async (): Promise<TrainingWithTags[]> => {
      if (!clientId) return [];
      
      // Fetch all training sessions for the client
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      if (sessionsError) throw sessionsError;
      if (sessions.length === 0) return [];

      // Batch fetch all tags for all sessions (avoids N+1 queries)
      const sessionIds = sessions.map(s => s.id);
      const { data: tagLinks, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          id,
          training_session_id,
          tag_id,
          tags:tag_id (id, name, color)
        `)
        .in("training_session_id", sessionIds);

      if (tagsError) throw tagsError;

      // Map tags to their respective sessions
      return sessions.map(session => ({
        ...session,
        tags: tagLinks
          .filter(link => link.training_session_id === session.id)
          .map(link => link.tags as unknown as Tag)
          .filter(Boolean)
      }));
    },
    enabled: !!clientId,
  });
}

/**
 * Adds tags to a training session
 * @returns Mutation for adding tags
 */
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
      // Invalidate relevant caches
      queryClient.invalidateQueries({ 
        queryKey: trainingTagsKeys.session(variables.trainingSessionId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: trainingTagsKeys.all 
      });
    },
    onError: (error) => {
      console.error("Failed to add training session tags:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat štítky k tréninku.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Updates (replaces) all tags for a training session
 * Uses delete + insert pattern for atomic replacement
 * @returns Mutation for updating tags
 */
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
      // Delete all existing tags for this session
      const { error: deleteError } = await supabase
        .from("training_session_tags")
        .delete()
        .eq("training_session_id", trainingSessionId);

      if (deleteError) throw deleteError;

      // Insert new tags if any
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
      // Invalidate all related caches
      queryClient.invalidateQueries({ 
        queryKey: trainingTagsKeys.session(variables.trainingSessionId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: trainingTagsKeys.all 
      });
      
      toast({
        title: "Štítky aktualizovány",
        description: "Štítky tréninku byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Failed to update training session tags:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat štítky.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Fetches tag usage statistics for a client within an optional date range
 * Used for training analytics and recommendations
 * @param clientId - The client ID
 * @param dateRange - Optional date range to filter by
 * @returns Query result with array of TagStatistic sorted by count descending
 */
export function useClientTagStats(clientId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: trainingTagsKeys.clientStats(clientId || "", dateRange),
    queryFn: async (): Promise<TagStatistic[]> => {
      if (!clientId) return [];

      // Build query for completed training sessions
      let query = supabase
        .from("training_sessions")
        .select("id, date, status")
        .eq("client_id", clientId)
        .eq("status", "completed");

      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte("date", dateRange.start.toISOString())
          .lte("date", dateRange.end.toISOString());
      }

      const { data: sessions, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;
      if (sessions.length === 0) return [];

      // Fetch all tags for these sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: tagLinks, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          tag_id,
          tags:tag_id (id, name, color)
        `)
        .in("training_session_id", sessionIds);

      if (tagsError) throw tagsError;

      // Aggregate tag counts
      const tagCounts: Record<string, TagStatistic> = {};
      
      tagLinks.forEach(link => {
        const tag = link.tags as unknown as Tag;
        if (tag) {
          if (!tagCounts[tag.id]) {
            tagCounts[tag.id] = { tag, count: 0 };
          }
          tagCounts[tag.id].count++;
        }
      });

      // Return sorted by count (highest first)
      return Object.values(tagCounts).sort((a, b) => b.count - a.count);
    },
    enabled: !!clientId,
  });
}
