import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyClientsAboutTrainerPR, isTrainerClient, checkClientBeatTrainer } from '@/lib/trainerPRNotifications';
import { notifyAboutPR } from '@/lib/prNotifications';
import { prepareEntryWithPR, recomputePRsAfterChange } from '@/lib/prEngine';
import type { Json } from '@/integrations/supabase/types';
export type ExerciseEntrySide = 'left' | 'right' | 'both' | 'none';

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
  /** Side for unilateral exercises */
  side: ExerciseEntrySide | null;
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
    side?: ExerciseEntrySide | null;
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

      // Use PR Engine to prepare entry with computed fields
      const { fields, oldValue } = await prepareEntryWithPR({
        client_id: entry.client_id,
        exercise_id: entry.exercise_id,
        exercise_name: entry.exercise_name,
        side: entry.side,
        weight_kg: entry.weight_kg,
        height_cm: entry.height_cm,
        distance_meters: entry.distance_meters,
        time_seconds: entry.time_seconds,
        avg_watts: entry.avg_watts,
        pace_sec_per_500m: entry.pace_sec_per_500m,
        is_bodyweight: entry.is_bodyweight,
        reps: entry.reps,
      });

      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({ 
          ...entry, 
          user_id: user.id, 
          is_pr: fields.is_pr,
          metric_key: fields.metric_key,
          side_scope: fields.side_scope,
          pr_scope_key: fields.pr_scope_key,
        })
        .select('*, clients(id, name)')
        .single();

      if (error) throw error;

      // Send PR notification to trainer (for client PRs)
      if (fields.is_pr && !isTrainerClient(entry.client_id)) {
        const clientName = (data as any).clients?.name || 'Klient';
        const metricType = entry.time_seconds ? 'time' : 'weight';
        const value = entry.time_seconds || entry.weight_kg || entry.distance_meters || entry.height_cm || 0;
        const unit = entry.time_seconds ? 's' : entry.distance_meters ? 'm' : entry.height_cm ? 'cm' : 'kg';

        notifyAboutPR({
          trainerId: user.id,
          clientId: entry.client_id,
          clientName,
          exerciseName: entry.exercise_name,
          value,
          unit,
          metricType,
          oldValue: oldValue !== null && fields.is_pr && oldValue !== value ? oldValue : undefined,
          entryId: data.id,
          entryDate: entry.date
        }).catch(console.error);
      }

      // If this is a trainer's PR, notify clients who do the same exercise
      if (fields.is_pr && isTrainerClient(entry.client_id)) {
        notifyClientsAboutTrainerPR({
          exerciseName: entry.exercise_name,
          weightKg: entry.weight_kg ?? null,
          timeSeconds: entry.time_seconds ?? null,
          userId: user.id,
        }).catch(console.error);
      }

      // If this is a client's PR, check if they beat the trainer
      if (fields.is_pr && !isTrainerClient(entry.client_id)) {
        checkClientBeatTrainer({
          clientId: entry.client_id,
          exerciseName: entry.exercise_name,
          weightKg: entry.weight_kg ?? null,
          timeSeconds: entry.time_seconds ?? null,
        }).catch(console.error);
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
      // First, get the current entry to know the scope for PR recomputation
      const { data: oldEntry } = await supabase
        .from('exercise_entries')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('exercise_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Recompute PRs for the affected scope after update
      if (oldEntry) {
        await recomputePRsAfterChange({
          client_id: oldEntry.client_id,
          exercise_id: oldEntry.exercise_id,
          exercise_name: oldEntry.exercise_name,
          side: oldEntry.side,
          weight_kg: data.weight_kg,
          time_seconds: data.time_seconds,
          distance_meters: data.distance_meters,
          height_cm: data.height_cm,
          avg_watts: data.avg_watts,
          is_bodyweight: data.is_bodyweight,
          reps: data.reps,
        });
      }

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
      // First, get the entry to know the scope for PR recomputation
      const { data: entryToDelete } = await supabase
        .from('exercise_entries')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase.from('exercise_entries').delete().eq('id', id);
      if (error) throw error;

      // Recompute PRs for the affected scope after delete
      if (entryToDelete) {
        await recomputePRsAfterChange({
          client_id: entryToDelete.client_id,
          exercise_id: entryToDelete.exercise_id,
          exercise_name: entryToDelete.exercise_name,
          side: entryToDelete.side,
          weight_kg: entryToDelete.weight_kg,
          time_seconds: entryToDelete.time_seconds,
          distance_meters: entryToDelete.distance_meters,
          height_cm: entryToDelete.height_cm,
          avg_watts: entryToDelete.avg_watts,
          is_bodyweight: entryToDelete.is_bodyweight,
          reps: entryToDelete.reps,
        });
      }
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
