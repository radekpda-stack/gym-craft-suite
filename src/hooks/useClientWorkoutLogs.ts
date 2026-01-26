import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  is_personal_record?: boolean;
  side?: 'left' | 'right' | 'both' | 'none' | null;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  trainer_id: string;
  date: string;
  notes?: string | null;
  workout_type?: string | null;
  duration_minutes?: number | null;
  energy_before?: number | null;
  energy_after?: number | null;
  trainer_comment?: string | null;
  trainer_commented_at?: string | null;
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
  workout_type?: string;
  duration_minutes?: number;
  energy_before?: number;
  energy_after?: number;
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
          workout_type: input.workout_type,
          duration_minutes: input.duration_minutes,
          energy_before: input.energy_before,
          energy_after: input.energy_after,
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
          side: ex.side || 'none',
        }));

        const { error: exercisesError } = await supabase
          .from('client_workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      return log;
    },
    onSuccess: async (log, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      toast.success('Trénink byl zaznamenán');
      
      // Notify trainer about client workout (max 1x per day per client)
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Check if notification already sent today for this client
        const { data: existingToday } = await supabase
          .from('notifications')
          .select('id')
          .eq('client_id', variables.client_id)
          .eq('type', 'client_workout_logged')
          .gte('created_at', `${today}T00:00:00`)
          .maybeSingle();
          
        if (!existingToday) {
          // Get client name and trainer_id
          const { data: client } = await supabase
            .from('clients')
            .select('name, user_id')
            .eq('id', variables.client_id)
            .single();
          
          if (client?.user_id) {
            const clientName = client.name || 'Klient';
            const workoutType = variables.workout_type || 'trénink';
            
            await supabase.from('notifications').insert({
              user_id: client.user_id,
              client_id: variables.client_id,
              type: 'client_workout_logged',
              title: '🏋️ Klient cvičil',
              message: `${clientName} si zapsal/a vlastní ${workoutType}.`,
              entity_type: 'workout_log',
              entity_id: log.id,
            });
          }
        }
      } catch (error) {
        console.error('[useCreateWorkoutLog] Failed to create notification:', error);
      }
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
      queryClient.invalidateQueries({ queryKey: ['unified-diary'] });
      toast.success('Záznam byl smazán');
    },
    onError: (error) => {
      console.error('Error deleting workout log:', error);
      toast.error('Nepodařilo se smazat záznam');
    },
  });
}

// Hook for updating a workout log
export interface UpdateWorkoutLogInput {
  logId: string;
  clientId: string;
  date?: string;
  notes?: string | null;
  workout_type?: string | null;
  duration_minutes?: number | null;
  energy_before?: number | null;
  energy_after?: number | null;
  exercises?: Omit<WorkoutExercise, 'id'>[];
}

export function useUpdateWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkoutLogInput) => {
      // Update the workout log
      const { error: logError } = await supabase
        .from('client_workout_logs')
        .update({
          date: input.date,
          notes: input.notes,
          workout_type: input.workout_type,
          duration_minutes: input.duration_minutes,
          energy_before: input.energy_before,
          energy_after: input.energy_after,
        })
        .eq('id', input.logId);

      if (logError) throw logError;

      // If exercises provided, replace them
      if (input.exercises !== undefined) {
        // Delete existing exercises
        const { error: deleteError } = await supabase
          .from('client_workout_exercises')
          .delete()
          .eq('workout_log_id', input.logId);

        if (deleteError) throw deleteError;

        // Insert new exercises
        if (input.exercises.length > 0) {
          const exercisesToInsert = input.exercises.map((ex, idx) => ({
            workout_log_id: input.logId,
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
            side: ex.side || 'none',
          }));

          const { error: insertError } = await supabase
            .from('client_workout_exercises')
            .insert(exercisesToInsert);

          if (insertError) throw insertError;
        }
      }

      return input;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['unified-diary'] });
      toast.success('Trénink byl upraven');
    },
    onError: (error) => {
      console.error('Error updating workout log:', error);
      toast.error('Nepodařilo se upravit trénink');
    },
  });
}

// Hook for adding trainer comment
export function useAddTrainerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, comment }: { logId: string; comment: string }) => {
      const { error } = await supabase
        .from('client_workout_logs')
        .update({
          trainer_comment: comment,
          trainer_commented_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs'] });
      toast.success('Komentář byl přidán');
    },
    onError: (error) => {
      console.error('Error adding trainer comment:', error);
      toast.error('Nepodařilo se přidat komentář');
    },
  });
}
