import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface ExerciseLeaderboardEntry {
  rank: number;
  nickname: string;
  client_id: string;
  best_value: number;
  display_value: string;
  achieved_at: string;
  is_anonymous: boolean;
}

export interface ExerciseForLeaderboard {
  exercise_name: string;
  exercise_id: string | null;
  entry_count: number;
  exercise_type: 'strength' | 'cardio';
}

export type GenderFilter = 'all' | 'male' | 'female';

// Fetch all exercises for comparison (no limits)
export function useExercisesForComparison(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['exercises-for-comparison', trainerId],
    queryFn: async () => {
      if (!trainerId) return { strength: [], cardio: [] };

      // Get strength exercises with most entries
      const { data: strengthData } = await supabase
        .from('exercise_entries')
        .select('exercise_name, exercise_id')
        .eq('user_id', trainerId)
        .not('weight_kg', 'is', null);

      // Get cardio exercises with most entries
      const { data: cardioData } = await supabase
        .from('cardio_entries')
        .select('exercise_name, exercise_id')
        .eq('user_id', trainerId);

      // Count occurrences for strength
      const strengthCounts = new Map<string, { count: number; exercise_id: string | null }>();
      (strengthData || []).forEach((e: { exercise_name: string; exercise_id: string | null }) => {
        const key = e.exercise_name.toLowerCase().trim();
        const existing = strengthCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          strengthCounts.set(key, { count: 1, exercise_id: e.exercise_id });
        }
      });

      const cardioCounts = new Map<string, { count: number; exercise_id: string | null }>();
      (cardioData || []).forEach((e: { exercise_name: string; exercise_id: string | null }) => {
        const key = e.exercise_name.toLowerCase().trim();
        const existing = cardioCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          cardioCounts.set(key, { count: 1, exercise_id: e.exercise_id });
        }
      });

      // Convert to arrays and sort by count - NO LIMITS
      const strengthExercises: ExerciseForLeaderboard[] = Array.from(strengthCounts.entries())
        .map(([name, data]) => ({
          exercise_name: name,
          exercise_id: data.exercise_id,
          entry_count: data.count,
          exercise_type: 'strength' as const,
        }))
        .filter(e => e.entry_count >= 1) // At least 1 entry
        .sort((a, b) => b.entry_count - a.entry_count);

      const cardioExercises: ExerciseForLeaderboard[] = Array.from(cardioCounts.entries())
        .map(([name, data]) => ({
          exercise_name: name,
          exercise_id: data.exercise_id,
          entry_count: data.count,
          exercise_type: 'cardio' as const,
        }))
        .filter(e => e.entry_count >= 1) // At least 1 entry
        .sort((a, b) => b.entry_count - a.entry_count);

      return { strength: strengthExercises, cardio: cardioExercises };
    },
    enabled: !!trainerId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch leaderboard for a specific strength exercise (by max weight)
export function useStrengthExerciseLeaderboard(
  exerciseName: string | null,
  trainerId: string | undefined,
  genderFilter: GenderFilter = 'all'
) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['strength-exercise-leaderboard', exerciseName, trainerId, genderFilter],
    queryFn: async () => {
      if (!exerciseName || !trainerId) return null;

      // Get all exercise entries for this exercise
      const { data: entries, error } = await supabase
        .from('exercise_entries')
        .select('client_id, weight_kg, date')
        .eq('user_id', trainerId)
        .ilike('exercise_name', exerciseName)
        .not('weight_kg', 'is', null)
        .order('weight_kg', { ascending: false });

      if (error || !entries?.length) return null;

      // Get unique clients and their best performance
      const clientBests = new Map<string, { weight: number; date: string }>();
      (entries as { client_id: string; weight_kg: number | null; date: string }[]).forEach(e => {
        const existing = clientBests.get(e.client_id);
        if (!existing || (e.weight_kg && e.weight_kg > existing.weight)) {
          clientBests.set(e.client_id, { weight: e.weight_kg!, date: e.date });
        }
      });

      const clientIds = Array.from(clientBests.keys());
      if (clientIds.length < 1) return null;

      // Get client names and leaderboard settings
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, gender')
        .in('id', clientIds);

      const { data: settings } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds);

      const settingsMap = new Map((settings || []).map(s => [s.client_id, s]));
      const clientsMap = new Map((clients || []).map(c => [c.id, c]));

      // Filter by gender if needed
      const filteredClientIds = genderFilter === 'all' 
        ? clientIds 
        : clientIds.filter(cid => {
            const client = clientsMap.get(cid);
            return client?.gender === genderFilter;
          });

      if (filteredClientIds.length < 1) return null;

      // Build leaderboard
      const leaderboard: ExerciseLeaderboardEntry[] = filteredClientIds
        .map(cid => {
          const data = clientBests.get(cid)!;
          const client = clientsMap.get(cid);
          const setting = settingsMap.get(cid);
          const isVisible = setting?.leaderboard_visible === true;

          return {
            client_id: cid,
            nickname: isVisible 
              ? (setting?.leaderboard_nickname || client?.name || 'Anonym')
              : `Účastník ${cid.slice(-4).toUpperCase()}`,
            best_value: data.weight,
            display_value: `${data.weight} kg`,
            achieved_at: data.date,
            is_anonymous: !isVisible,
            rank: 0,
          };
        })
        .sort((a, b) => b.best_value - a.best_value);

      // Assign ranks
      leaderboard.forEach((e, i) => { e.rank = i + 1; });

      // Find current client's position
      const clientEntry = leaderboard.find(e => e.client_id === clientId);
      const clientPercentile = clientEntry 
        ? ((leaderboard.length - clientEntry.rank) / leaderboard.length) * 100
        : null;

      return {
        leaderboard: leaderboard.slice(0, 15),
        total_participants: leaderboard.length,
        client_rank: clientEntry?.rank || null,
        client_percentile: clientPercentile,
        exercise_name: exerciseName,
        metric: 'weight',
        unit: 'kg',
        gender_filter: genderFilter,
      };
    },
    enabled: !!exerciseName && !!trainerId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch leaderboard for a specific cardio exercise (by distance or time)
export function useCardioExerciseLeaderboard(
  exerciseName: string | null,
  trainerId: string | undefined,
  metric: 'distance' | 'duration' = 'distance',
  genderFilter: GenderFilter = 'all'
) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['cardio-exercise-leaderboard', exerciseName, trainerId, metric, genderFilter],
    queryFn: async () => {
      if (!exerciseName || !trainerId) return null;

      // Get all cardio entries for this exercise
      const { data: entries, error } = await supabase
        .from('cardio_entries')
        .select('client_id, distance_meters, duration_seconds, date')
        .eq('user_id', trainerId)
        .ilike('exercise_name', exerciseName);

      if (error || !entries?.length) return null;

      // Get unique clients and their best performance
      const clientBests = new Map<string, { value: number; date: string }>();
      
      (entries as { client_id: string; distance_meters: number | null; duration_seconds: number; date: string }[]).forEach(e => {
        const value = metric === 'distance' 
          ? (e.distance_meters || 0) 
          : (e.duration_seconds || 0);
        
        if (value <= 0) return;
        
        const existing = clientBests.get(e.client_id);
        const isBetter = metric === 'distance'
          ? value > (existing?.value || 0)
          : !existing || value < existing.value;
        
        if (isBetter) {
          clientBests.set(e.client_id, { value, date: e.date });
        }
      });

      const clientIds = Array.from(clientBests.keys());
      if (clientIds.length < 1) return null;

      // Get client names and leaderboard settings
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, gender')
        .in('id', clientIds);

      const { data: settings } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds);

      const settingsMap = new Map((settings || []).map(s => [s.client_id, s]));
      const clientsMap = new Map((clients || []).map(c => [c.id, c]));

      // Filter by gender if needed
      const filteredClientIds = genderFilter === 'all' 
        ? clientIds 
        : clientIds.filter(cid => {
            const client = clientsMap.get(cid);
            return client?.gender === genderFilter;
          });

      if (filteredClientIds.length < 1) return null;

      // Build leaderboard
      const leaderboard: ExerciseLeaderboardEntry[] = filteredClientIds
        .map(cid => {
          const data = clientBests.get(cid)!;
          const client = clientsMap.get(cid);
          const setting = settingsMap.get(cid);
          const isVisible = setting?.leaderboard_visible === true;

          let displayValue: string;
          if (metric === 'distance') {
            displayValue = data.value >= 1000 
              ? `${(data.value / 1000).toFixed(2)} km` 
              : `${data.value} m`;
          } else {
            const mins = Math.floor(data.value / 60);
            const secs = data.value % 60;
            displayValue = `${mins}:${secs.toString().padStart(2, '0')}`;
          }

          return {
            client_id: cid,
            nickname: isVisible 
              ? (setting?.leaderboard_nickname || client?.name || 'Anonym')
              : `Účastník ${cid.slice(-4).toUpperCase()}`,
            best_value: data.value,
            display_value: displayValue,
            achieved_at: data.date,
            is_anonymous: !isVisible,
            rank: 0,
          };
        })
        .sort((a, b) => metric === 'distance' 
          ? b.best_value - a.best_value
          : a.best_value - b.best_value
        );

      // Assign ranks
      leaderboard.forEach((e, i) => { e.rank = i + 1; });

      // Find current client's position
      const clientEntry = leaderboard.find(e => e.client_id === clientId);
      const clientPercentile = clientEntry 
        ? ((leaderboard.length - clientEntry.rank) / leaderboard.length) * 100
        : null;

      return {
        leaderboard: leaderboard.slice(0, 15),
        total_participants: leaderboard.length,
        client_rank: clientEntry?.rank || null,
        client_percentile: clientPercentile,
        exercise_name: exerciseName,
        metric,
        unit: metric === 'distance' ? 'm' : 's',
        gender_filter: genderFilter,
      };
    },
    enabled: !!exerciseName && !!trainerId,
    staleTime: 2 * 60 * 1000,
  });
}
