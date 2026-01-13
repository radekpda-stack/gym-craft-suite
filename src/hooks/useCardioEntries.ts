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

      // Auto-submit to matching active challenges
      await autoSubmitToChallenge(
        entry.client_id,
        entry.exercise_name,
        entry.distance_meters || 0,
        entry.duration_seconds,
        entry.notes
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
      queryClient.invalidateQueries({ queryKey: ['client-active-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions'] });
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

// PR detection for cardio: best time for a given distance (fixed distance cardio)
async function checkIfCardioIsPR(entry: CreateCardioEntryInput): Promise<boolean> {
  if (!entry.distance_meters || !entry.duration_seconds) return false;

  const { data: existingEntries } = await supabase
    .from('cardio_entries')
    .select('duration_seconds')
    .eq('client_id', entry.client_id)
    .eq('exercise_name', entry.exercise_name)
    .eq('distance_meters', entry.distance_meters)
    .not('duration_seconds', 'is', null)
    .order('duration_seconds', { ascending: true })
    .limit(1);

  // First entry for this exercise + distance is a PR
  if (!existingEntries?.length) return true;

  // New time is better (lower) than the best existing time
  const bestExistingTime = existingEntries[0].duration_seconds;
  return entry.duration_seconds < bestExistingTime;
}

// Auto-submit cardio result to matching active challenges
async function autoSubmitToChallenge(
  clientId: string,
  exerciseName: string,
  distanceMeters: number,
  durationSeconds: number,
  notes?: string | null
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Find active challenges that match this exercise type
    const exerciseKeywords = getExerciseKeywords(exerciseName);
    
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, scoring_type, primary_metric, allow_multiple_attempts')
      .eq('status', 'published')
      .lte('start_at', now)
      .gte('end_at', now);

    if (!challenges?.length) return;

    // Find matching challenge based on exercise name and distance
    const matchingChallenge = challenges.find(c => {
      const titleLower = c.title.toLowerCase();
      // Check if title contains exercise keyword and distance
      const hasExercise = exerciseKeywords.some(kw => titleLower.includes(kw));
      const hasDistance = titleLower.includes(String(distanceMeters)) || 
                          titleLower.includes(`${distanceMeters / 1000}k`) ||
                          titleLower.includes(`${distanceMeters}m`);
      return hasExercise && (hasDistance || distanceMeters === 500); // Default 500m for rowing
    });

    if (!matchingChallenge) return;

    // Check if client already has a submission for this challenge
    const { data: existingSubmission } = await supabase
      .from('challenge_submissions')
      .select('id, score_primary')
      .eq('challenge_id', matchingChallenge.id)
      .eq('client_id', clientId)
      .order('score_primary', { ascending: true })
      .limit(1);

    const isTimeBased = matchingChallenge.scoring_type === 'time_lower_better';
    const newScore = durationSeconds;

    // If no existing submission, create one
    if (!existingSubmission?.length) {
      await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: matchingChallenge.id,
          client_id: clientId,
          score_primary: newScore,
          note: notes || null,
          status: 'approved',
          submitted_at: now,
        });
      console.log('Auto-submitted new challenge entry for', matchingChallenge.title);
      return;
    }

    // If better score (or multiple attempts allowed), update/insert
    const existingScore = existingSubmission[0].score_primary;
    const isBetter = isTimeBased ? newScore < existingScore : newScore > existingScore;

    if (isBetter) {
      if (matchingChallenge.allow_multiple_attempts) {
        // Insert new submission (multiple attempts allowed)
        await supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: matchingChallenge.id,
            client_id: clientId,
            score_primary: newScore,
            note: notes || null,
            status: 'approved',
            submitted_at: now,
          });
      } else {
        // Update existing submission
        await supabase
          .from('challenge_submissions')
          .update({
            score_primary: newScore,
            note: notes || null,
            submitted_at: now,
          })
          .eq('id', existingSubmission[0].id);
      }
      console.log('Updated challenge submission with better score for', matchingChallenge.title);
    }
  } catch (error) {
    console.error('Failed to auto-submit to challenge:', error);
    // Don't throw - this is a secondary action
  }
}

// Get keywords to match exercise names to challenge titles
function getExerciseKeywords(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase();
  
  if (name.includes('veslo') || name.includes('row') || name.includes('erg')) {
    return ['row', 'veslo', 'erg', 'rowing'];
  }
  if (name.includes('běh') || name.includes('run')) {
    return ['run', 'běh', 'running'];
  }
  if (name.includes('bike') || name.includes('kolo')) {
    return ['bike', 'kolo', 'cycling'];
  }
  
  return [name];
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
