import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface TrackedExercise {
  id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  display_order: number;
  trainer_id: string;
}

// Fetch tracked exercises for a client
export function useClientTrackedExercisesAdmin(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-tracked-exercises-admin', clientId],
    queryFn: async () => {
      if (!clientId || !user?.id) return [];

      const { data, error } = await supabase
        .from('client_tracked_exercises')
        .select('*')
        .eq('client_id', clientId)
        .eq('trainer_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as TrackedExercise[];
    },
    enabled: !!clientId && !!user?.id,
  });
}

// Add tracked exercise for client
export function useAddTrackedExercise() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      exerciseId, 
      exerciseName 
    }: { 
      clientId: string; 
      exerciseId: string | null; 
      exerciseName: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current max order
      const { data: existing } = await supabase
        .from('client_tracked_exercises')
        .select('display_order')
        .eq('client_id', clientId)
        .eq('trainer_id', user.id)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { data, error } = await supabase
        .from('client_tracked_exercises')
        .insert({
          client_id: clientId,
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          trainer_id: user.id,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-tracked-exercises-admin', clientId] });
      toast({ title: 'Cvik přidán do sledování' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Remove tracked exercise
export function useRemoveTrackedExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_tracked_exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-tracked-exercises-admin', clientId] });
      toast({ title: 'Cvik odebrán ze sledování' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Per-client visibility settings
export interface ClientPortalSettings {
  progressMetrics?: {
    weight?: boolean;
    bodyFat?: boolean;
    trackedExercises?: boolean;
    rowing500m?: boolean;
    rowing1000m?: boolean;
    running500m?: boolean;
    running1000m?: boolean;
  };
}

export function useClientPortalSettings(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-portal-settings', clientId],
    queryFn: async () => {
      if (!clientId || !user?.id) return null;

      const { data, error } = await supabase
        .from('client_accounts')
        .select('portal_settings')
        .eq('client_id', clientId)
        .eq('trainer_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data?.portal_settings || {}) as ClientPortalSettings;
    },
    enabled: !!clientId && !!user?.id,
  });
}

export function useUpdateClientPortalSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, settings }: { clientId: string; settings: ClientPortalSettings }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('client_accounts')
        .update({ 
          portal_settings: settings as any,
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', clientId)
        .eq('trainer_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-settings', clientId] });
      toast({ title: 'Nastavení uloženo' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
