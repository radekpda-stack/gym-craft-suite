/**
 * Hook for fetching the last completed training for a client
 * with workout entries (exercises) included
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "./useTags";
import { GroupedWorkoutEntry, WorkoutEntry } from "./useWorkoutEntries";

export interface LastTrainingData {
  id: string;
  date: string;
  duration: number;
  notes: string | null;
  subjective_rating: number | null;
  tags: Tag[];
  exercises: GroupedWorkoutEntry[];
}

/**
 * Fetches the last completed training for a specific client
 * including tags and workout entries
 */
export function useLastTraining(clientId: string | undefined) {
  return useQuery({
    queryKey: ["last-training", clientId],
    queryFn: async (): Promise<LastTrainingData | null> => {
      if (!clientId) return null;

      // Fetch last completed training for this client
      const { data: session, error: sessionError } = await supabase
        .from("training_sessions")
        .select("id, date, duration, notes, subjective_rating")
        .eq("client_id", clientId)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) return null;

      // Fetch tags for this training
      const { data: tagLinks, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          tag_id,
          tags:tag_id (id, name, color)
        `)
        .eq("training_session_id", session.id);

      if (tagsError) throw tagsError;

      const tags: Tag[] = (tagLinks || [])
        .map((link) => link.tags as unknown as Tag)
        .filter(Boolean);

      // Fetch workout entries for this training
      const { data: entries, error: entriesError } = await supabase
        .from("workout_entries")
        .select("*")
        .eq("training_session_id", session.id)
        .order("created_at", { ascending: true })
        .order("set_number", { ascending: true });

      if (entriesError) throw entriesError;

      // Group entries by exercise
      const exercises: GroupedWorkoutEntry[] = (entries || []).reduce(
        (acc, entry) => {
          // Map DB entry to WorkoutEntry with optional field defaults
          const mappedEntry: WorkoutEntry = {
            ...entry,
            heart_rate_zone: (entry as any).heart_rate_zone ?? null,
            avg_heart_rate: (entry as any).avg_heart_rate ?? null,
            max_heart_rate: (entry as any).max_heart_rate ?? null,
            pace_per_500m: (entry as any).pace_per_500m ?? null,
          };
          
          const existing = acc.find(
            (g) =>
              g.exercise_name === entry.exercise_name &&
              g.exercise_id === entry.exercise_id &&
              g.participant_client_id === (entry as any).participant_client_id
          );
          if (existing) {
            existing.sets.push(mappedEntry);
          } else {
            acc.push({
              exercise_id: entry.exercise_id,
              exercise_name: entry.exercise_name,
              sets: [mappedEntry],
              participant_client_id: (entry as any).participant_client_id ?? null,
            });
          }
          return acc;
        },
        [] as GroupedWorkoutEntry[]
      );

      return {
        id: session.id,
        date: session.date,
        duration: session.duration,
        notes: session.notes,
        subjective_rating: session.subjective_rating,
        tags,
        exercises,
      };
    },
    enabled: !!clientId,
    staleTime: 60000, // Cache for 1 minute
  });
}
