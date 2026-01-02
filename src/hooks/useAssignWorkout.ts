/**
 * Hook for trainer to assign planned workouts to clients
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AssignWorkoutInput {
  client_id: string;
  template_id?: string;
  scheduled_for: string;
  workout_type?: string;
  duration_minutes?: number;
  notes?: string;
  exercises?: {
    exercise_name: string;
    exercise_id?: string | null;
    sets?: number | null;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    rpe?: number | null;
    notes?: string | null;
  }[];
}

export function useAssignWorkoutToClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignWorkoutInput) => {
      if (!user) throw new Error('Nepřihlášen');

      // If template_id provided, fetch template exercises
      let exercises = input.exercises || [];
      
      if (input.template_id && exercises.length === 0) {
        const { data: templateExercises, error: templateError } = await supabase
          .from('training_template_exercises')
          .select('*')
          .eq('template_id', input.template_id)
          .order('sort_order');

        if (templateError) throw templateError;

        exercises = (templateExercises || []).map(ex => ({
          exercise_name: ex.exercise_name,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps_min || ex.reps_max,
          weight_kg: null,
          duration_seconds: ex.time_seconds,
          rpe: ex.rpe,
          notes: ex.notes,
        }));
      }

      // Create planned workout log
      const { data: log, error: logError } = await supabase
        .from('client_workout_logs')
        .insert({
          client_id: input.client_id,
          trainer_id: user.id,
          date: input.scheduled_for.split('T')[0],
          scheduled_for: input.scheduled_for,
          source: 'trainer_assigned',
          status: 'planned',
          workout_type: input.workout_type || 'strength',
          duration_minutes: input.duration_minutes,
          notes: input.notes,
          template_id: input.template_id || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Insert exercises if any
      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex, idx) => ({
          workout_log_id: log.id,
          exercise_name: ex.exercise_name,
          exercise_id: ex.exercise_id || null,
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight_kg: ex.weight_kg || null,
          duration_seconds: ex.duration_seconds || null,
          rpe: ex.rpe || null,
          notes: ex.notes || null,
          sort_order: idx,
        }));

        const { error: exercisesError } = await supabase
          .from('client_workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      // Create notification for client
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('client_id', input.client_id)
        .single();

      if (clientAccount) {
        await supabase.from('client_portal_notifications').insert({
          client_id: input.client_id,
          type: 'workout_assigned',
          title: 'Nový naplánovaný trénink',
          message: `Trenér vám přidělil nový trénink na ${new Date(input.scheduled_for).toLocaleDateString('cs-CZ')}`,
          action_url: '/client/diary?tab=plan',
          metadata: {
            workout_log_id: log.id,
            scheduled_for: input.scheduled_for,
            workout_type: input.workout_type,
          },
        });
      }

      return log;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['planned-workouts', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      toast.success('Trénink byl naplánován');
    },
    onError: (error) => {
      console.error('Error assigning workout:', error);
      toast.error('Nepodařilo se naplánovat trénink');
    },
  });
}

// Hook to mark planned workout as completed (client side)
export function useCompleteAssignedWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      logId, 
      clientId,
      duration_minutes,
      rpe,
      notes,
      energy_before,
      energy_after,
    }: { 
      logId: string; 
      clientId: string;
      duration_minutes?: number;
      rpe?: number;
      notes?: string;
      energy_before?: number;
      energy_after?: number;
    }) => {
      const { error } = await supabase
        .from('client_workout_logs')
        .update({
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          duration_minutes,
          rpe,
          notes,
          energy_before,
          energy_after,
        })
        .eq('id', logId);

      if (error) throw error;

      // Get trainer_id for notification
      const { data: log } = await supabase
        .from('client_workout_logs')
        .select('trainer_id, workout_type')
        .eq('id', logId)
        .single();

      // Create notification for trainer (using regular notifications table)
      if (log?.trainer_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .single();

        await supabase.from('notifications').insert({
          user_id: log.trainer_id,
          type: 'workout_completed',
          title: 'Klient splnil naplánovaný trénink',
          message: `${client?.name || 'Klient'} dokončil naplánovaný trénink`,
          is_read: false,
          client_id: clientId,
        });
      }

      return { logId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['planned-workouts', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['unified-diary', variables.clientId] });
      toast.success('Trénink byl označen jako splněný');
    },
    onError: (error) => {
      console.error('Error completing workout:', error);
      toast.error('Nepodařilo se označit trénink jako splněný');
    },
  });
}

// Hook for trainer to mark workout as reviewed
export function useReviewWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      logId, 
      clientId,
      comment,
    }: { 
      logId: string; 
      clientId: string;
      comment?: string;
    }) => {
      const { error } = await supabase
        .from('client_workout_logs')
        .update({
          status: 'reviewed',
          trainer_comment: comment,
          trainer_commented_at: comment ? new Date().toISOString() : null,
        })
        .eq('id', logId);

      if (error) throw error;

      // Create notification for client if there's a comment
      if (comment) {
        await supabase.from('client_portal_notifications').insert({
          client_id: clientId,
          type: 'trainer_comment',
          title: 'Trenér okomentoval váš trénink',
          message: comment.length > 100 ? comment.substring(0, 100) + '...' : comment,
          action_url: '/client/diary',
          metadata: {
            workout_log_id: logId,
          },
        });
      }

      return { logId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-workout-logs', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-workout-logs'] });
      toast.success('Trénink byl zkontrolován');
    },
    onError: (error) => {
      console.error('Error reviewing workout:', error);
      toast.error('Nepodařilo se uložit kontrolu');
    },
  });
}
