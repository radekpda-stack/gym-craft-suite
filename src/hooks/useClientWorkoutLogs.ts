import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkoutExercise {
  id?: string;
  exercise_id?: string | null;
  exercise_name: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  rpe?: number | null;
  notes?: string | null;
  sort_order: number;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  trainer_id: string;
  date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  exercises?: WorkoutExercise[];
  client?: { id: string; name: string } | null;
}

export interface CreateWorkoutLogInput {
  client_id: string;
  trainer_id: string;
  date: string;
  notes?: string;
  exercises: Omit<WorkoutExercise, 'id'>[];
}

// Hook for fetching workout logs for a specific client (used in client portal)
export function useClientWorkoutLogs(clientId: string | null) {
  return useQuery({
    queryKey: ['client-workout-logs', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_workout_logs')
        .select(`
          *,
          client_workout_exercises(*)
        `)
        .eq('client_id', clientId!)
        .order('date', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(log => ({
        ...log,
        exercises: log.client_workout_exercises || []
      })) as WorkoutLog[];
    },
  });
}

// Hook for fetching all workout logs (trainer view)
export function useAllClientWorkoutLogs() {
  return useQuery({
    queryKey: ['all-client-workout-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_workout_logs')
        .select(`
          *,
          client:clients(id, name),
          client_workout_exercises(*)
        `)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      return (data || []).map(log => ({
        ...log,
        exercises: log.client_workout_exercises || []
      })) as WorkoutLog[];
    },
  });
}

// Hook for creating a workout log
export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkoutLogInput) => {
      // Create the workout log
      const { data: log, error: logError } = await supabase
        .from('client_workout_logs')
        .insert({
          client_id: input.client_id,
          trainer_id: input.trainer_id,
          date: input.date,
          notes: input.notes,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Create exercises if any
      if (input.exercises.length > 0) {
        const exercisesToInsert = input.exercises.map((ex, idx) => ({
          workout_log_id: log.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          duration_seconds: ex.duration_seconds,
          distance_meters: ex.distance_meters,
          rpe: ex.rpe,
          notes: ex.notes,
          sort_order: idx,
        }));

        const { error: exercisesError } = await supabase
          .from('client_workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      return log;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      toast.success('Trénink byl zaznamenán');
    },
    onError: (error) => {
      console.error('Error creating workout log:', error);
      toast.error('Nepodařilo se uložit trénink');
    },
  });
}

// Hook for deleting a workout log
export function useDeleteWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, clientId }: { logId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_workout_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return { logId, clientId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      toast.success('Záznam byl smazán');
    },
    onError: (error) => {
      console.error('Error deleting workout log:', error);
      toast.error('Nepodařilo se smazat záznam');
    },
  });
}
