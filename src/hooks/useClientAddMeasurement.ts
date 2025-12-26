import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface AddMeasurementInput {
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  notes?: string;
}

interface AddCardioInput {
  date: string;
  exercise_name: string;
  duration_seconds: number;
  distance_meters: number;
  notes?: string;
}

export function useClientAddMeasurement() {
  const { clientId, clientAccount } = useClientPortal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddMeasurementInput) => {
      if (!clientId || !clientAccount?.trainer_id) {
        throw new Error('Missing client or trainer ID');
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert({
          client_id: clientId,
          user_id: clientAccount.trainer_id,
          date: input.date,
          weight: input.weight || null,
          body_fat_percentage: input.body_fat_percentage || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['client-weight-progress', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-bodyfat-progress', clientId] });
    },
  });
}

export function useClientAddCardio() {
  const { clientId, clientAccount } = useClientPortal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddCardioInput) => {
      if (!clientId || !clientAccount?.trainer_id) {
        throw new Error('Missing client or trainer ID');
      }

      const { data, error } = await supabase
        .from('cardio_entries')
        .insert({
          client_id: clientId,
          user_id: clientAccount.trainer_id,
          date: input.date,
          exercise_name: input.exercise_name,
          duration_seconds: input.duration_seconds,
          distance_meters: input.distance_meters,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate cardio progress queries
      queryClient.invalidateQueries({ queryKey: ['client-cardio-progress', clientId] });
    },
  });
}
