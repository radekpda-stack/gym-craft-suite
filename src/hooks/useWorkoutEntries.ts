import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { prepareEntryWithPR, recomputePRsAfterChange } from '@/lib/prEngine';

export interface WorkoutEntry {
  id: string;
  training_session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  created_at: string;
  user_id: string | null;
  // Participant tracking for group trainings
  participant_client_id: string | null;
  // Time fields - use time_ms for precision, time_seconds for legacy
  time_seconds: number | null;
  time_ms?: number | null;
  distance_meters: number | null;
  calories: number | null;
  watts: number | null;
  is_pr: boolean;
  // Optional cardio fields (may not exist in DB response)
  heart_rate_zone?: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  pace_per_500m?: number | null;
  pace_per_500m_ms?: number | null;
  // Rower/SkiErg specific
  level?: number | null;
  resistance?: number | null;
  // Assistance bands for pull-ups/dips
  assistance_bands?: string[] | null;
}

export interface WorkoutEntryInput {
  exercise_id?: string | null;
  exercise_name: string;
  set_number?: number;
  weight_kg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  notes?: string | null;
  // Participant tracking for group trainings
  participant_client_id?: string | null;
  // New fields
  time_seconds?: number | null;
  distance_meters?: number | null;
  calories?: number | null;
  watts?: number | null;
  is_pr?: boolean;
  // Cardio machine specific fields
  heart_rate_zone?: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  pace_per_500m?: number | null;
  pace_per_500m_ms?: number | null;
  time_ms?: number | null;
  // Rower/SkiErg specific
  level?: number | null;
  resistance?: number | null;
  // Assistance bands for pull-ups/dips
  assistance_bands?: string[] | null;
}

export interface GroupedWorkoutEntry {
  exercise_id: string | null;
  exercise_name: string;
  sets: WorkoutEntry[];
  participant_client_id: string | null;
}

// Grouped by participant (for group trainings)
export interface ParticipantGroupedEntries {
  participant_client_id: string | null;
  participant_name?: string;
  exercises: GroupedWorkoutEntry[];
}

/**
 * Hook for fetching workout entries for a specific training session
 */
export function useWorkoutEntries(trainingSessionId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['workout-entries', trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return [];

      const { data, error } = await supabase
        .from('workout_entries')
        .select('*')
        .eq('training_session_id', trainingSessionId)
        .order('created_at', { ascending: true })
        .order('set_number', { ascending: true });

      if (error) throw error;
      // Map DB response to WorkoutEntry, providing defaults for optional fields
      return (data || []).map(entry => ({
        ...entry,
        heart_rate_zone: (entry as any).heart_rate_zone ?? null,
        avg_heart_rate: (entry as any).avg_heart_rate ?? null,
        max_heart_rate: (entry as any).max_heart_rate ?? null,
        pace_per_500m: (entry as any).pace_per_500m ?? null,
        pace_per_500m_ms: (entry as any).pace_per_500m_ms ?? null,
        level: (entry as any).level ?? null,
        resistance: (entry as any).resistance ?? null,
        assistance_bands: (entry as any).assistance_bands ?? null,
      })) as WorkoutEntry[];
    },
    enabled: !!trainingSessionId,
  });

  // Group entries by exercise AND participant
  const groupedEntries: GroupedWorkoutEntry[] = entries.reduce((acc, entry) => {
    const existing = acc.find(
      g => g.exercise_name === entry.exercise_name && 
           g.exercise_id === entry.exercise_id &&
           g.participant_client_id === entry.participant_client_id
    );
    if (existing) {
      existing.sets.push(entry);
    } else {
      acc.push({
        exercise_id: entry.exercise_id,
        exercise_name: entry.exercise_name,
        sets: [entry],
        participant_client_id: entry.participant_client_id,
      });
    }
    return acc;
  }, [] as GroupedWorkoutEntry[]);

  const createEntry = useMutation({
    mutationFn: async (input: WorkoutEntryInput & { training_session_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get max set number for this exercise in this training
      const { data: existingSets } = await supabase
        .from('workout_entries')
        .select('set_number')
        .eq('training_session_id', input.training_session_id)
        .eq('exercise_name', input.exercise_name)
        .order('set_number', { ascending: false })
        .limit(1);

      const nextSetNumber = existingSets && existingSets.length > 0 
        ? existingSets[0].set_number + 1 
        : 1;

      const { data, error } = await supabase
        .from('workout_entries')
        .insert({
          ...input,
          set_number: input.set_number || nextSetNumber,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-entries', trainingSessionId] });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přidat cvik.',
        variant: 'destructive',
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkoutEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('workout_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-entries', trainingSessionId] });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se aktualizovat cvik.',
        variant: 'destructive',
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workout_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-entries', trainingSessionId] });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat cvik.',
        variant: 'destructive',
      });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async ({ exerciseName, exerciseId }: { exerciseName: string; exerciseId: string | null }) => {
      let query = supabase
        .from('workout_entries')
        .delete()
        .eq('training_session_id', trainingSessionId!)
        .eq('exercise_name', exerciseName);
      
      if (exerciseId) {
        query = query.eq('exercise_id', exerciseId);
      } else {
        query = query.is('exercise_id', null);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-entries', trainingSessionId] });
      toast({
        title: 'Cvik odebrán',
        description: 'Cvik byl odebrán z tréninku.',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se odebrat cvik.',
        variant: 'destructive',
      });
    },
  });

  return {
    entries,
    groupedEntries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    deleteExercise,
  };
}

/**
 * Standalone function to sync workout entries to exercise_entries for client statistics
 * Can be called directly (e.g., from training completion) without hooks
 */
export async function syncWorkoutEntriesToStats({
  trainingSessionId,
  clientId,
  trainingDate,
}: {
  trainingSessionId: string;
  clientId: string;
  trainingDate: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get all workout entries for this training
  const { data: workoutEntries, error: fetchError } = await supabase
    .from('workout_entries')
    .select('*')
    .eq('training_session_id', trainingSessionId);

  if (fetchError) throw fetchError;
  if (!workoutEntries || workoutEntries.length === 0) return;

  // Group by exercise AND participant_client_id
  // This ensures each participant's exercises are synced to their own stats
  const exerciseGroups = workoutEntries.reduce((acc, entry) => {
    // Use participant_client_id if set, otherwise fall back to main clientId
    const targetClientId = entry.participant_client_id || clientId;
    const key = `${entry.exercise_name}|${entry.exercise_id || 'null'}|${targetClientId}`;
    if (!acc[key]) {
      acc[key] = {
        exercise_id: entry.exercise_id,
        exercise_name: entry.exercise_name,
        target_client_id: targetClientId,
        entries: [],
      };
    }
    acc[key].entries.push(entry as WorkoutEntry);
    return acc;
  }, {} as Record<string, { exercise_id: string | null; exercise_name: string; target_client_id: string; entries: WorkoutEntry[] }>);

  // For each exercise group (per participant), find the best set and create/update exercise_entries
  // CRITICAL: Process sequentially to avoid race conditions
  for (const group of Object.values(exerciseGroups)) {
    // Verify we have a valid target client
    if (!group.target_client_id) {
      console.error('Missing target_client_id for exercise group:', group.exercise_name);
      continue;
    }

    // Check if this is a time-based exercise
    const hasTimeData = group.entries.some(e => e.time_seconds && e.time_seconds > 0);
    const isTimeBased = hasTimeData;

    let bestSet = group.entries[0];
    
    if (isTimeBased) {
      // For time-based: find lowest time
      let bestTime = bestSet.time_seconds || Infinity;
      for (const entry of group.entries) {
        if (entry.time_seconds && entry.time_seconds > 0 && entry.time_seconds < bestTime) {
          bestSet = entry;
          bestTime = entry.time_seconds;
        }
      }
    } else {
      // For strength: find highest weight × reps
      let bestVolume = (bestSet.weight_kg || 0) * (bestSet.reps || 0);
      for (const entry of group.entries) {
        const volume = (entry.weight_kg || 0) * (entry.reps || 0);
        if (volume > bestVolume) {
          bestSet = entry;
          bestVolume = volume;
        }
      }
    }

    // Use the participant_client_id from the best set if available, ensuring correct attribution
    const finalClientId = bestSet.participant_client_id || group.target_client_id;

    // First delete any existing entry for this exercise in this session for this client
    await supabase
      .from('exercise_entries')
      .delete()
      .eq('training_session_id', trainingSessionId)
      .eq('exercise_name', group.exercise_name)
      .eq('client_id', finalClientId)
      .eq('user_id', user.id);

    // Use PR Engine to prepare entry with computed fields
    const { fields } = await prepareEntryWithPR({
      client_id: finalClientId,
      exercise_id: group.exercise_id,
      exercise_name: group.exercise_name,
      weight_kg: bestSet.weight_kg,
      time_seconds: bestSet.time_seconds,
      distance_meters: bestSet.distance_meters,
      avg_watts: (bestSet as any).watts,
      reps: bestSet.reps,
    });

    // Create exercise entry for client stats with training_session_id
    const { error: insertError } = await supabase
      .from('exercise_entries')
      .insert({
        client_id: finalClientId,
        exercise_id: group.exercise_id,
        exercise_name: group.exercise_name,
        sets: group.entries.length,
        reps: bestSet.reps,
        weight_kg: bestSet.weight_kg,
        time_seconds: bestSet.time_seconds,
        time_ms: (bestSet as any).time_ms,
        distance_meters: bestSet.distance_meters,
        is_pr: fields.is_pr,
        metric_key: fields.metric_key,
        side_scope: fields.side_scope,
        pr_scope_key: fields.pr_scope_key,
        date: trainingDate.split('T')[0],
        user_id: user.id,
        notes: bestSet.notes || '',
        training_session_id: trainingSessionId,
        avg_watts: (bestSet as any).watts,
        level: (bestSet as any).level,
        resistance: (bestSet as any).resistance,
      });

    if (insertError) {
      console.error('Error syncing exercise entry for client', finalClientId, ':', insertError);
    }

    // Recompute PRs for the affected scope to ensure consistency
    await recomputePRsAfterChange({
      client_id: finalClientId,
      exercise_id: group.exercise_id,
      exercise_name: group.exercise_name,
      weight_kg: bestSet.weight_kg,
      time_seconds: bestSet.time_seconds,
      distance_meters: bestSet.distance_meters,
      avg_watts: (bestSet as any).watts,
      reps: bestSet.reps,
    });
  }
}

/**
 * Hook to sync workout entries to exercise_entries for client statistics
 */
export function useSyncToClientStats() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      trainingSessionId: string;
      clientId: string;
      trainingDate: string;
    }) => {
      await syncWorkoutEntriesToStats(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
      queryClient.invalidateQueries({ queryKey: ['client-exercise-prs'] });
      toast({
        title: 'Statistiky aktualizovány',
        description: 'Data byla synchronizována s profily klientů.',
      });
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast({
        title: 'Chyba synchronizace',
        description: 'Nepodařilo se synchronizovat data s profily klientů.',
        variant: 'destructive',
      });
    },
  });
}
