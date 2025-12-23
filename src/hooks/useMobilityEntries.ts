import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MobilityEntry, CreateMobilityEntryInput } from '@/types/exercise-entries';

export interface MobilityEntryWithClient extends Omit<MobilityEntry, 'entry_type'> {
  clients?: {
    id: string;
    name: string;
  } | null;
}

export function useMobilityEntries(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['mobility-entries', clientId],
    queryFn: async () => {
      let query = supabase
        .from('mobility_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as MobilityEntryWithClient[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (entry: CreateMobilityEntryInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mobility_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobility-entries'] });
      toast({ title: 'Mobilita přidána', description: 'Záznam byl uložen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat záznam.', variant: 'destructive' });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MobilityEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('mobility_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobility-entries'] });
      toast({ title: 'Záznam aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mobility_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobility-entries'] });
      toast({ title: 'Záznam smazán', description: 'Záznam byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat záznam.', variant: 'destructive' });
    },
  });

  const getLastEntry = async (clientId: string, exerciseName: string) => {
    const { data } = await supabase
      .from('mobility_entries')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercise_name', exerciseName)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data;
  };

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    getLastEntry,
  };
}
