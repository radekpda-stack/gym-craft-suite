import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientTrainingPhase {
  id: string;
  user_id: string;
  client_id: string;
  phase_name: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TRAINING_PHASES = [
  { value: 'adaptation', label: 'Adaptace', color: 'bg-blue-500' },
  { value: 'strength_base', label: 'Silová základna', color: 'bg-green-500' },
  { value: 'hypertrophy', label: 'Hypertrofie', color: 'bg-purple-500' },
  { value: 'max_strength', label: 'Maximální síla', color: 'bg-red-500' },
  { value: 'deload', label: 'Deload / Regenerace', color: 'bg-amber-500' },
] as const;

export type TrainingPhaseValue = typeof TRAINING_PHASES[number]['value'];

export function useClientTrainingPhases(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: phases = [], isLoading } = useQuery({
    queryKey: ['client-training-phases', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_training_phases')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as ClientTrainingPhase[];
    },
    enabled: !!clientId,
  });

  const createPhase = useMutation({
    mutationFn: async (phase: Omit<ClientTrainingPhase, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('client_training_phases')
        .insert({ ...phase, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-training-phases'] });
      toast({ title: 'Fáze vytvořena', description: 'Nová tréninková fáze byla přidána.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se vytvořit fázi.', variant: 'destructive' });
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientTrainingPhase> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_training_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-training-phases'] });
      toast({ title: 'Fáze aktualizována' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se aktualizovat fázi.', variant: 'destructive' });
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_training_phases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-training-phases'] });
      toast({ title: 'Fáze smazána' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat fázi.', variant: 'destructive' });
    },
  });

  // Get current phase
  const currentPhase = phases.find((p) => !p.end_date || new Date(p.end_date) >= new Date());

  // Calculate phase duration in weeks
  const getPhaseDurationWeeks = (phase: ClientTrainingPhase) => {
    const start = new Date(phase.start_date);
    const end = phase.end_date ? new Date(phase.end_date) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  };

  return {
    phases,
    currentPhase,
    isLoading,
    createPhase,
    updatePhase,
    deletePhase,
    getPhaseDurationWeeks,
  };
}
