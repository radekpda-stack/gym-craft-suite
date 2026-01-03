import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AssignedWorkout {
  id: string;
  clientId: string;
  templateId: string | null;
  trainerId: string;
  title: string;
  description: string | null;
  exercises: any[];
  scheduledFor: string | null;
  dueDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt: string | null;
  clientNotes: string | null;
  trainerNotes: string | null;
  createdAt: string;
}

export function useClientAssignedWorkouts(clientId: string | undefined) {
  return useQuery({
    queryKey: ['assigned-workouts', clientId],
    queryFn: async (): Promise<AssignedWorkout[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_assigned_workouts')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_for', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map(w => ({
        id: w.id,
        clientId: w.client_id,
        templateId: w.template_id,
        trainerId: w.trainer_id,
        title: w.title,
        description: w.description,
        exercises: w.exercises as any[],
        scheduledFor: w.scheduled_for,
        dueDate: w.due_date,
        status: w.status as AssignedWorkout['status'],
        completedAt: w.completed_at,
        clientNotes: w.client_notes,
        trainerNotes: w.trainer_notes,
        createdAt: w.created_at,
      }));
    },
    enabled: !!clientId,
  });
}

export function useTrainerAssignedWorkouts() {
  return useQuery({
    queryKey: ['trainer-assigned-workouts'],
    queryFn: async (): Promise<(AssignedWorkout & { clientName: string })[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('client_assigned_workouts')
        .select(`
          *,
          clients (name)
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((w: any) => ({
        id: w.id,
        clientId: w.client_id,
        templateId: w.template_id,
        trainerId: w.trainer_id,
        title: w.title,
        description: w.description,
        exercises: w.exercises as any[],
        scheduledFor: w.scheduled_for,
        dueDate: w.due_date,
        status: w.status as AssignedWorkout['status'],
        completedAt: w.completed_at,
        clientNotes: w.client_notes,
        trainerNotes: w.trainer_notes,
        createdAt: w.created_at,
        clientName: w.clients?.name || 'Neznámý klient',
      }));
    },
  });
}

export function useAssignWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      clientId: string;
      templateId?: string;
      title: string;
      description?: string;
      exercises: any[];
      scheduledFor?: string;
      dueDate?: string;
      trainerNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_assigned_workouts')
        .insert({
          client_id: input.clientId,
          template_id: input.templateId || null,
          trainer_id: user.id,
          title: input.title,
          description: input.description || null,
          exercises: input.exercises,
          scheduled_for: input.scheduledFor || null,
          due_date: input.dueDate || null,
          trainer_notes: input.trainerNotes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-workouts', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['trainer-assigned-workouts'] });
      toast.success('Trénink přiřazen klientovi');
    },
    onError: () => {
      toast.error('Nepodařilo se přiřadit trénink');
    },
  });
}

export function useUpdateAssignedWorkoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      clientNotes 
    }: { 
      id: string; 
      status: AssignedWorkout['status']; 
      clientNotes?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      if (clientNotes !== undefined) {
        updateData.client_notes = clientNotes;
      }

      const { error } = await supabase
        .from('client_assigned_workouts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assigned-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-assigned-workouts'] });
      toast.success('Stav tréninku aktualizován');
    },
    onError: () => {
      toast.error('Nepodařilo se aktualizovat stav');
    },
  });
}
