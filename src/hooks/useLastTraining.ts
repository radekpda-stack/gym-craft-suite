/**
 * Hook for fetching the last completed training for a client
 * with workout entries (exercises), feedback, and body part tags included
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag, TagType } from "./useTags";
import { GroupedWorkoutEntry, WorkoutEntry } from "./useWorkoutEntries";

export interface LastTrainingFeedback {
  soreness: number | null;
  energy_rating: number | null;
  body_feel: number | null;
  pain: number | null;
  session_fit: number | null;
  difficulty: number | null;
  comment: string | null;
  muscle_soreness: string[];
}

export interface LastTrainingData {
  id: string;
  date: string;
  duration: number;
  notes: string | null;
  subjective_rating: number | null;
  training_type: string | null;
  rpe: number | null;
  tags: Tag[];
  bodyPartTags: Tag[];
  exercises: GroupedWorkoutEntry[];
  feedback: LastTrainingFeedback | null;
}

// Tag from query may have undefined tag_type until mapped
interface RawTagFromQuery {
  id: string;
  name: string;
  color: string;
  tag_type?: TagType | null;
  is_system?: boolean;
  affects_load?: boolean;
  affects_credit?: boolean;
  created_at?: string;
  user_id?: string | null;
}

/**
 * Fetches the last completed training for a specific client
 * including tags (with body_part filtering), workout entries, and feedback
 */
export function useLastTraining(clientId: string | undefined) {
  return useQuery({
    queryKey: ["last-training", clientId],
    queryFn: async (): Promise<LastTrainingData | null> => {
      if (!clientId) return null;

      // Fetch last completed training for this client with training_type and rpe
      const { data: session, error: sessionError } = await supabase
        .from("training_sessions")
        .select("id, date, duration, notes, subjective_rating, training_type, rpe")
        .eq("client_id", clientId)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) return null;

      // Fetch tags for this training with tag_type for filtering
      const { data: tagLinks, error: tagsError } = await supabase
        .from("training_session_tags")
        .select(`
          tag_id,
          tags:tag_id (id, name, color, tag_type)
        `)
        .eq("training_session_id", session.id);

      if (tagsError) throw tagsError;

      const allTags: RawTagFromQuery[] = (tagLinks || [])
        .map((link) => link.tags as unknown as RawTagFromQuery)
        .filter(Boolean);

      // Separate body_part tags from other tags - keep full tag structure
      const tags: Tag[] = allTags
        .filter((t): t is RawTagFromQuery & { tag_type: TagType } => !!t.tag_type)
        .map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          tag_type: t.tag_type,
          is_system: t.is_system ?? false,
          affects_load: t.affects_load ?? false,
          affects_credit: t.affects_credit ?? false,
          created_at: t.created_at ?? '',
          user_id: t.user_id ?? null,
        }));
      
      const bodyPartTags: Tag[] = tags.filter((t) => t.tag_type === 'body_part');

      // Fetch workout entries for this training
      const { data: entries, error: entriesError } = await supabase
        .from("workout_entries")
        .select("*")
        .eq("training_session_id", session.id)
        .order("created_at", { ascending: true })
        .order("set_number", { ascending: true });

      if (entriesError) throw entriesError;

      // Fetch feedback for this training
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("training_feedback")
        .select("soreness, energy_rating, body_feel, pain, session_fit, difficulty, comment, muscle_soreness")
        .eq("training_session_id", session.id)
        .maybeSingle();

      if (feedbackError) throw feedbackError;

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

      // Map feedback data
      const feedback: LastTrainingFeedback | null = feedbackData
        ? {
            soreness: feedbackData.soreness ?? null,
            energy_rating: feedbackData.energy_rating ?? null,
            body_feel: feedbackData.body_feel ?? null,
            pain: feedbackData.pain ?? null,
            session_fit: feedbackData.session_fit ?? null,
            difficulty: feedbackData.difficulty ?? null,
            comment: feedbackData.comment ?? null,
            muscle_soreness: (feedbackData.muscle_soreness as string[]) ?? [],
          }
        : null;

      return {
        id: session.id,
        date: session.date,
        duration: session.duration,
        notes: session.notes,
        subjective_rating: session.subjective_rating,
        training_type: session.training_type ?? null,
        rpe: session.rpe ?? null,
        tags,
        bodyPartTags,
        exercises,
        feedback,
      };
    },
    enabled: !!clientId,
    staleTime: 60000, // Cache for 1 minute
  });
}
