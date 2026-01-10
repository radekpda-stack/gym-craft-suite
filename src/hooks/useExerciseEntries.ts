import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyClientsAboutTrainerPR, isTrainerClient, checkClientBeatTrainer } from '@/lib/trainerPRNotifications';
import { notifyAboutPR } from '@/lib/prNotifications';
import type { Json } from '@/integrations/supabase/types';
export interface ExerciseEntry {
  id: string;
  user_id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  date: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  is_bodyweight: boolean;
  time_seconds: number | null;
  /** High-precision time in milliseconds (preferred when available) */
  time_ms?: number | null;
  tempo: string | null;
  notes: string | null;
  is_pr: boolean;
  distance_meters: number | null;
  height_cm: number | null;
  // Extended metrics
  avg_watts: number | null;
  max_watts: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  pace_sec_per_500m: number | null;
  pace_sec_per_km: number | null;
  cadence_spm: number | null;
  strokes: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  rpe: number | null;
  leg_fatigue: boolean;
  is_test: boolean;
  incline_percent: number | null;
  level: number | null;
  resistance: number | null;
  calories_kcal: number | null;
  metrics_json?: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseEntryWithClient extends ExerciseEntry {
  clients?: {
    id: string;
    name: string;
  } | null;
}

export function useExerciseEntries(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['exercise-entries', clientId],
    queryFn: async () => {
      let query = supabase
        .from('exercise_entries')
        .select('*, clients(id, name)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as ExerciseEntryWithClient[];
    },
  });

  // Define input type with optional extended fields
  type CreateEntryInput = {
    client_id: string;
    exercise_id: string | null;
    exercise_name: string;
    date: string;
    sets: number;
    reps: number | null;
    weight_kg: number | null;
    is_bodyweight: boolean;
    time_seconds: number | null;
    time_ms?: number | null;
    tempo: string | null;
    notes: string | null;
    is_pr: boolean;
    distance_meters?: number | null;
    height_cm?: number | null;
    avg_watts?: number | null;
    max_watts?: number | null;
    avg_speed_kmh?: number | null;
    max_speed_kmh?: number | null;
    pace_sec_per_500m?: number | null;
    pace_sec_per_km?: number | null;
    cadence_spm?: number | null;
    strokes?: number | null;
    avg_heart_rate?: number | null;
    max_heart_rate?: number | null;
    rpe?: number | null;
    leg_fatigue?: boolean;
    is_test?: boolean;
    incline_percent?: number | null;
    level?: number | null;
    resistance?: number | null;
    calories_kcal?: number | null;
    metrics_json?: Json | null;
  };

  const createEntry = useMutation({
    mutationFn: async (entry: CreateEntryInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let isPR = false;
      let oldValue: number | undefined = undefined;
      
      // Check if this is a distance-based PR (higher is better - for jumps)
      if (entry.distance_meters && entry.distance_meters > 0) {
        const { data: existingEntries } = await supabase
          .from('exercise_entries')
          .select('distance_meters')
          .eq('client_id', entry.client_id)
          .eq('exercise_name', entry.exercise_name)
          .not('distance_meters', 'is', null)
          .order('distance_meters', { ascending: false })
          .limit(1);

        if (existingEntries?.length && existingEntries[0].distance_meters !== null) {
          oldValue = existingEntries[0].distance_meters;
          isPR = entry.distance_meters > oldValue;
        } else {
          isPR = true;
        }
      }
      // Check if this is a time-based PR (lower is better - for cardio)
      else if (entry.time_seconds && entry.time_seconds > 0) {
        const { data: existingEntries } = await supabase
          .from('exercise_entries')
          .select('time_seconds')
          .eq('client_id', entry.client_id)
          .eq('exercise_name', entry.exercise_name)
          .not('time_seconds', 'is', null)
          .order('time_seconds', { ascending: true })
          .limit(1);

        if (existingEntries?.length && existingEntries[0].time_seconds !== null) {
          oldValue = existingEntries[0].time_seconds;
          isPR = entry.time_seconds < oldValue;
        } else {
          isPR = true;
        }
      }
      // Check if this is a weight-based PR (higher is better - for strength)
      else if (entry.weight_kg && entry.weight_kg > 0) {
        const { data: existingEntries } = await supabase
          .from('exercise_entries')
          .select('weight_kg')
          .eq('client_id', entry.client_id)
          .eq('exercise_name', entry.exercise_name)
          .not('weight_kg', 'is', null)
          .order('weight_kg', { ascending: false })
          .limit(1);

        if (existingEntries?.length && existingEntries[0].weight_kg !== null) {
          oldValue = existingEntries[0].weight_kg;
          isPR = entry.weight_kg > oldValue;
        } else {
          isPR = true;
        }
      }

      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({ ...entry, user_id: user.id, is_pr: isPR })
        .select('*, clients(id, name)')
        .single();

      if (error) throw error;

      // Send PR notification to trainer (for client PRs)
      if (isPR && !isTrainerClient(entry.client_id)) {
        const clientName = (data as any).clients?.name || 'Klient';
        const metricType = entry.time_seconds ? 'time' : 'weight';
        const value = entry.time_seconds || entry.weight_kg || 0;
        const unit = entry.time_seconds ? 's' : 'kg';

        notifyAboutPR({
          trainerId: user.id,
          clientId: entry.client_id,
          clientName,
          exerciseName: entry.exercise_name,
          value,
          unit,
          metricType,
          oldValue: oldValue !== undefined && isPR && oldValue !== value ? oldValue : undefined,
          entryId: data.id,
          entryDate: entry.date
        }).catch(console.error);
      }

      // If this is a trainer's PR, notify clients who do the same exercise
      if (isPR && isTrainerClient(entry.client_id)) {
        notifyClientsAboutTrainerPR({
          exerciseName: entry.exercise_name,
          weightKg: entry.weight_kg ?? null,
          timeSeconds: entry.time_seconds ?? null,
          userId: user.id,
        }).catch(console.error); // Fire and forget
      }

      // If this is a client's PR, check if they beat the trainer
      if (isPR && !isTrainerClient(entry.client_id)) {
        checkClientBeatTrainer({
          clientId: entry.client_id,
          exerciseName: entry.exercise_name,
          weightKg: entry.weight_kg ?? null,
          timeSeconds: entry.time_seconds ?? null,
        }).catch(console.error); // Fire and forget
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-progress'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-client-comparison'] });
      toast({ title: 'Záznam přidán', description: 'Tréninkový záznam byl uložen.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se přidat záznam.', variant: 'destructive' });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExerciseEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercise_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      // Broad invalidation to refresh all screens that may show the edited entry
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-progress'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-client-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-entry', vars?.id] });

      toast({ title: 'Záznam aktualizován', description: 'Změny byly uloženy.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se uložit změny.', variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      toast({ title: 'Záznam smazán', description: 'Záznam byl odstraněn.' });
    },
    onError: () => {
      toast({ title: 'Chyba', description: 'Nepodařilo se smazat záznam.', variant: 'destructive' });
    },
  });

  // Get last entry for a specific exercise and client for pre-filling
  const getLastEntry = async (clientId: string, exerciseName: string) => {
    const { data } = await supabase
      .from('exercise_entries')
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
      .from('exercise_entries')
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

// Get progress data for charts
export function useExerciseProgress(clientId: string, exerciseName: string, period: 'week' | 'month' | '3months' | 'year' = 'month') {
  const periodMap = {
    week: 7,
    month: 30,
    '3months': 90,
    year: 365,
  };

  return useQuery({
    queryKey: ['exercise-progress', clientId, exerciseName, period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodMap[period]);

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('exercise_name', exerciseName)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ExerciseEntry[];
    },
    enabled: !!clientId && !!exerciseName,
  });
}
