/**
 * Unified Diary Hook - Merges client workout logs + coached training sessions
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export type DiaryEntrySource = 'client_manual' | 'trainer_assigned' | 'coached_session';
export type DiaryEntryStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'reviewed';

export interface DiaryExercise {
  id: string;
  exercise_name: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
  time_seconds?: number | null;
  rpe?: number | null;
  notes?: string | null;
  is_personal_record?: boolean;
  is_pr?: boolean;
}

export interface DiaryTag {
  id: string;
  name: string;
  color: string;
  tag_type?: string;
}

export interface UnifiedDiaryEntry {
  id: string;
  date: string;
  source: DiaryEntrySource;
  status: DiaryEntryStatus;
  workout_type?: string | null;
  duration_minutes?: number | null;
  rpe?: number | null;
  notes?: string | null;
  energy_before?: number | null;
  energy_after?: number | null;
  trainer_comment?: string | null;
  trainer_commented_at?: string | null;
  scheduled_for?: string | null;
  exercises?: DiaryExercise[];
  tags?: DiaryTag[];
  // For coached sessions
  training_type?: string | null;
  training_goal?: string | null;
  // Metadata
  created_at: string;
  is_coached: boolean;
}

// Map training_sessions status to diary status
function mapSessionStatus(status: string): DiaryEntryStatus {
  switch (status) {
    case 'scheduled': return 'planned';
    case 'in_progress': return 'in_progress';
    case 'completed': return 'completed';
    case 'canceled':
    case 'cancelled': return 'draft'; // We won't show canceled sessions
    default: return 'completed';
  }
}

export function useUnifiedDiary() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['unified-diary', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<UnifiedDiaryEntry[]> => {
      if (!clientId) return [];

      // Fetch client workout logs (manual + trainer assigned)
      const { data: workoutLogs, error: logsError } = await supabase
        .from('client_workout_logs')
        .select(`
          id,
          date,
          source,
          status,
          workout_type,
          duration_minutes,
          rpe,
          notes,
          energy_before,
          energy_after,
          trainer_comment,
          trainer_commented_at,
          scheduled_for,
          created_at,
          client_workout_exercises(
            id,
            exercise_name,
            sets,
            reps,
            weight_kg,
            duration_seconds,
            rpe,
            notes,
            is_personal_record
          )
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      // Fetch coached training sessions with exercise_entries
      const { data: trainingSessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          duration,
          status,
          notes,
          training_type,
          training_goal,
          rpe,
          subjective_rating,
          trainer_went_well,
          trainer_problems,
          trainer_recommendations,
          created_at,
          exercise_entries(
            id,
            exercise_name,
            sets,
            reps,
            weight_kg,
            time_seconds,
            is_pr,
            rpe,
            notes
          )
        `)
        .eq('client_id', clientId)
        .in('status', ['completed', 'scheduled', 'in_progress'])
        .order('date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch tags for all sessions
      const sessionIds = (trainingSessions || []).map(s => s.id);
      let tagsBySession: Record<string, DiaryTag[]> = {};
      
      if (sessionIds.length > 0) {
        const { data: sessionTags } = await supabase
          .from('training_session_tags')
          .select('training_session_id, tag_id, tags(id, name, color, tag_type)')
          .in('training_session_id', sessionIds);

        if (sessionTags) {
          tagsBySession = sessionTags.reduce((acc, st) => {
            const tag = st.tags as unknown as DiaryTag;
            if (tag) {
              if (!acc[st.training_session_id]) acc[st.training_session_id] = [];
              acc[st.training_session_id].push(tag);
            }
            return acc;
          }, {} as Record<string, DiaryTag[]>);
        }
      }

      // Transform workout logs to unified format
      const diaryFromLogs: UnifiedDiaryEntry[] = (workoutLogs || []).map(log => ({
        id: log.id,
        date: log.date,
        source: (log.source as DiaryEntrySource) || 'client_manual',
        status: (log.status as DiaryEntryStatus) || 'completed',
        workout_type: log.workout_type,
        duration_minutes: log.duration_minutes,
        rpe: log.rpe,
        notes: log.notes,
        energy_before: log.energy_before,
        energy_after: log.energy_after,
        trainer_comment: log.trainer_comment,
        trainer_commented_at: log.trainer_commented_at,
        scheduled_for: log.scheduled_for,
        exercises: log.client_workout_exercises || [],
        tags: [], // Client logs don't have tags yet
        created_at: log.created_at,
        is_coached: false,
      }));

      // Transform training sessions to unified format
      const diaryFromSessions: UnifiedDiaryEntry[] = (trainingSessions || []).map(session => {
        // Map exercise_entries to DiaryExercise format
        const exercises: DiaryExercise[] = (session.exercise_entries || []).map((ex: any) => ({
          id: ex.id,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          duration_seconds: ex.time_seconds, // Map time_seconds to duration_seconds
          time_seconds: ex.time_seconds,
          rpe: ex.rpe,
          notes: ex.notes,
          is_personal_record: ex.is_pr,
          is_pr: ex.is_pr,
        }));

        return {
          id: `session-${session.id}`,
          date: typeof session.date === 'string' ? session.date.split('T')[0] : session.date,
          source: 'coached_session' as DiaryEntrySource,
          status: mapSessionStatus(session.status),
          workout_type: session.training_type || 'strength',
          duration_minutes: session.duration,
          rpe: session.rpe,
          notes: session.notes,
          energy_before: null,
          energy_after: session.subjective_rating,
          trainer_comment: [
            session.trainer_went_well ? `✅ ${session.trainer_went_well}` : null,
            session.trainer_problems ? `⚠️ ${session.trainer_problems}` : null,
            session.trainer_recommendations ? `💡 ${session.trainer_recommendations}` : null,
          ].filter(Boolean).join('\n') || null,
          trainer_commented_at: null,
          scheduled_for: null,
          training_type: session.training_type,
          training_goal: session.training_goal,
          exercises,
          tags: tagsBySession[session.id] || [],
          created_at: session.created_at,
          is_coached: true,
        };
      });

      // Merge and sort by date (descending)
      const merged = [...diaryFromLogs, ...diaryFromSessions];
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return merged;
    },
  });
}

// Hook for planned workouts only
export function usePlannedWorkouts() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['planned-workouts', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<UnifiedDiaryEntry[]> => {
      if (!clientId) return [];

      // Fetch planned workout logs from trainer
      const { data, error } = await supabase
        .from('client_workout_logs')
        .select(`
          id,
          date,
          source,
          status,
          workout_type,
          duration_minutes,
          rpe,
          notes,
          scheduled_for,
          created_at,
          client_workout_exercises(
            id,
            exercise_name,
            sets,
            reps,
            weight_kg,
            duration_seconds,
            rpe,
            notes
          )
        `)
        .eq('client_id', clientId)
        .eq('source', 'trainer_assigned')
        .in('status', ['planned', 'draft'])
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        date: log.date,
        source: 'trainer_assigned' as DiaryEntrySource,
        status: (log.status as DiaryEntryStatus) || 'planned',
        workout_type: log.workout_type,
        duration_minutes: log.duration_minutes,
        rpe: log.rpe,
        notes: log.notes,
        scheduled_for: log.scheduled_for,
        exercises: log.client_workout_exercises || [],
        created_at: log.created_at,
        is_coached: false,
        energy_before: null,
        energy_after: null,
        trainer_comment: null,
        trainer_commented_at: null,
      }));
    },
  });
}

// Hook for upcoming coached sessions
export function useUpcomingCoachedSessions() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['upcoming-coached-sessions', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) return [];

      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, duration, status, training_type, notes')
        .eq('client_id', clientId)
        .eq('status', 'scheduled')
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
}
