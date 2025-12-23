import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CardioEntry, CreateCardioEntryInput } from '@/types/exercise-entries';

export interface CardioEntryWithClient extends Omit<CardioEntry, 'entry_type'> {
  clients?: {
    id: string;
    name: string;
  } | null;
}

export function useCardioEntries(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['cardio-entries', clientId],
    queryFn: async () => {
      let query = supabase
        .from('cardio_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as CardioEntryWithClient[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (entry: CreateCardioEntryInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if this is a PR (best time for distance OR best distance for time)
      const isPR = await checkIfCardioIsPR(entry);

      const { data, error } = await supabase
        .from('cardio_entries')
        .insert({ ...entry, user_id: user.id, is_pr: isPR })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
      toast({ title: 'Cardio záznam přidán', description: 'Tréninkový záznam byl uložen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat záznam.', variant: 'destructive' });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CardioEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('cardio_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
      toast({ title: 'Záznam aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cardio_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
      toast({ title: 'Záznam smazán', description: 'Záznam byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat záznam.', variant: 'destructive' });
    },
  });

  // Get last entry for pre-filling
  const getLastEntry = async (clientId: string, exerciseName: string) => {
    const { data } = await supabase
      .from('cardio_entries')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercise_name', exerciseName)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data;
  };

  // Get PRs for a client
  const getPRs = async (clientId: string) => {
    const { data } = await supabase
      .from('cardio_entries')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_pr', true)
      .order('date', { ascending: false });
    
    return data || [];
  };

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    getLastEntry,
    getPRs,
  };
}

// PR detection for cardio: best time for a distance OR best distance for time
async function checkIfCardioIsPR(entry: CreateCardioEntryInput): Promise<boolean> {
  if (!entry.distance_meters || !entry.duration_seconds) return false;

  const { data: existingEntries } = await supabase
    .from('cardio_entries')
    .select('duration_seconds, distance_meters')
    .eq('client_id', entry.client_id)
    .eq('exercise_name', entry.exercise_name)
    .not('distance_meters', 'is', null)
    .order('created_at', { ascending: false });

  if (!existingEntries?.length) return true; // First entry is PR

  // Calculate pace (seconds per meter) for comparison
  const newPace = entry.duration_seconds / entry.distance_meters;
  
  // Find best existing pace
  const bestExistingPace = Math.min(
    ...existingEntries
      .filter(e => e.distance_meters && e.duration_seconds)
      .map(e => e.duration_seconds! / e.distance_meters!)
  );

  return newPace < bestExistingPace;
}

// Get cardio progress data for charts
export function useCardioProgress(clientId: string, exerciseName: string, period: 'week' | 'month' | '3months' | 'year' = 'month') {
  const periodMap = {
    week: 7,
    month: 30,
    '3months': 90,
    year: 365,
  };

  return useQuery({
    queryKey: ['cardio-progress', clientId, exerciseName, period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodMap[period]);

      const { data, error } = await supabase
        .from('cardio_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('exercise_name', exerciseName)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as CardioEntryWithClient[];
    },
    enabled: !!clientId && !!exerciseName,
  });
}

// Get cardio stats for a client
export function useCardioStats(clientId: string) {
  return useQuery({
    queryKey: ['cardio-stats', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cardio_entries')
        .select('exercise_name, duration_seconds, distance_meters, avg_watts, is_pr, date')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Group by exercise
      const byExercise = data.reduce((acc, entry) => {
        if (!acc[entry.exercise_name]) {
          acc[entry.exercise_name] = [];
        }
        acc[entry.exercise_name].push(entry);
        return acc;
      }, {} as Record<string, typeof data>);

      // Calculate stats per exercise
      const stats = Object.entries(byExercise).map(([name, entries]) => {
        const totalDuration = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
        const totalDistance = entries.reduce((sum, e) => sum + (e.distance_meters || 0), 0);
        const prCount = entries.filter(e => e.is_pr).length;
        const avgWatts = entries.filter(e => e.avg_watts).length > 0
          ? entries.reduce((sum, e) => sum + (e.avg_watts || 0), 0) / entries.filter(e => e.avg_watts).length
          : null;

        return {
          exercise_name: name,
          total_sessions: entries.length,
          total_duration_minutes: Math.round(totalDuration / 60),
          total_distance_km: Math.round(totalDistance / 100) / 10,
          pr_count: prCount,
          avg_watts: avgWatts ? Math.round(avgWatts) : null,
          last_session: entries[0]?.date,
        };
      });

      return stats;
    },
    enabled: !!clientId,
  });
}
