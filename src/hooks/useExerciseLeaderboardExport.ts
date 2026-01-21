import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInYears } from 'date-fns';

export interface LeaderboardEntry {
  rank: number;
  clientName: string;
  clientId: string;
  value: number;
  displayValue: string;
  gender: 'male' | 'female' | null;
  age: number | null;
  date: string;
}

export interface ExerciseForExport {
  id: string;
  name: string;
  category: string | null;
  exerciseType: 'strength' | 'cardio';
}

export type AgeFilter = 'all' | 'under30' | '30-40' | '40-50' | 'over50';

/**
 * Fetch all exercises available for leaderboard export
 */
export function useExercisesForExport() {
  return useQuery({
    queryKey: ['exercises-for-export'],
    queryFn: async (): Promise<ExerciseForExport[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get exercises that have at least one entry
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('exercise_id, exercise_name, exercises(id, name, category)')
        .eq('user_id', user.id)
        .not('exercise_id', 'is', null);

      if (!entries) return [];

      // Deduplicate by exercise_id
      const exerciseMap = new Map<string, ExerciseForExport>();
      
      entries.forEach((entry: any) => {
        if (entry.exercise_id && entry.exercises && !exerciseMap.has(entry.exercise_id)) {
          exerciseMap.set(entry.exercise_id, {
            id: entry.exercise_id,
            name: entry.exercises.name || entry.exercise_name,
            category: entry.exercises.category,
            exerciseType: 'strength', // Default, will be overwritten
          });
        }
      });

      // Get cardio entries to identify cardio exercises
      const { data: cardioEntries } = await supabase
        .from('cardio_entries')
        .select('exercise_id, exercise_name, exercises(id, name, category)')
        .eq('user_id', user.id)
        .not('exercise_id', 'is', null);

      cardioEntries?.forEach((entry: any) => {
        if (entry.exercise_id && entry.exercises) {
          exerciseMap.set(entry.exercise_id, {
            id: entry.exercise_id,
            name: entry.exercises.name || entry.exercise_name,
            category: entry.exercises.category,
            exerciseType: 'cardio',
          });
        }
      });

      return Array.from(exerciseMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Format time from milliseconds to mm:ss or hh:mm:ss
 */
function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Fetch leaderboard data for a specific exercise
 */
export function useExerciseLeaderboardExport(
  exerciseId: string | null,
  exerciseType: 'strength' | 'cardio',
  ageFilter: AgeFilter = 'all'
) {
  return useQuery({
    queryKey: ['exercise-leaderboard-export', exerciseId, exerciseType, ageFilter],
    queryFn: async (): Promise<{
      exerciseName: string;
      unit: string;
      maleEntries: LeaderboardEntry[];
      femaleEntries: LeaderboardEntry[];
    } | null> => {
      if (!exerciseId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();

      // Get exercise name
      const { data: exercise } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId)
        .single();

      if (!exercise) return null;

      if (exerciseType === 'cardio') {
        // Fetch cardio entries
        const { data: entries } = await supabase
          .from('cardio_entries')
          .select(`
            id,
            client_id,
            duration_ms,
            duration_seconds,
            distance_meters,
            date,
            is_pr,
            clients(id, name, first_name, last_name, gender, birth_date)
          `)
          .eq('exercise_id', exerciseId)
          .eq('user_id', user.id)
          .not('duration_ms', 'is', null);

        if (!entries || entries.length === 0) return null;

        // Group by client and get best time
        const clientBestMap = new Map<string, {
          clientId: string;
          clientName: string;
          gender: 'male' | 'female' | null;
          age: number | null;
          bestTimeMs: number;
          date: string;
        }>();

        entries.forEach((entry: any) => {
          if (!entry.clients || !entry.duration_ms) return;
          
          const client = entry.clients;
          const clientId = client.id;
          const age = client.birth_date 
            ? differenceInYears(now, new Date(client.birth_date)) 
            : null;

          // Apply age filter
          if (ageFilter !== 'all' && age !== null) {
            if (ageFilter === 'under30' && age >= 30) return;
            if (ageFilter === '30-40' && (age < 30 || age >= 40)) return;
            if (ageFilter === '40-50' && (age < 40 || age >= 50)) return;
            if (ageFilter === 'over50' && age < 50) return;
          }

          const existing = clientBestMap.get(clientId);
          if (!existing || entry.duration_ms < existing.bestTimeMs) {
            clientBestMap.set(clientId, {
              clientId,
              clientName: client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
              gender: client.gender as 'male' | 'female' | null,
              age,
              bestTimeMs: entry.duration_ms,
              date: entry.date,
            });
          }
        });

        // Convert to arrays and sort
        const allEntries = Array.from(clientBestMap.values())
          .sort((a, b) => a.bestTimeMs - b.bestTimeMs);

        const maleEntries: LeaderboardEntry[] = allEntries
          .filter(e => e.gender === 'male')
          .map((e, idx) => ({
            rank: idx + 1,
            clientName: e.clientName,
            clientId: e.clientId,
            value: e.bestTimeMs,
            displayValue: formatTimeMs(e.bestTimeMs),
            gender: e.gender,
            age: e.age,
            date: e.date,
          }));

        const femaleEntries: LeaderboardEntry[] = allEntries
          .filter(e => e.gender === 'female')
          .map((e, idx) => ({
            rank: idx + 1,
            clientName: e.clientName,
            clientId: e.clientId,
            value: e.bestTimeMs,
            displayValue: formatTimeMs(e.bestTimeMs),
            gender: e.gender,
            age: e.age,
            date: e.date,
          }));

        return {
          exerciseName: exercise.name,
          unit: 'čas',
          maleEntries,
          femaleEntries,
        };
      } else {
        // Fetch strength entries
        const { data: entries } = await supabase
          .from('exercise_entries')
          .select(`
            id,
            client_id,
            weight_kg,
            reps,
            date,
            is_pr,
            clients(id, name, first_name, last_name, gender, birth_date)
          `)
          .eq('exercise_id', exerciseId)
          .eq('user_id', user.id)
          .not('weight_kg', 'is', null);

        if (!entries || entries.length === 0) return null;

        // Group by client and get max weight
        const clientBestMap = new Map<string, {
          clientId: string;
          clientName: string;
          gender: 'male' | 'female' | null;
          age: number | null;
          maxWeight: number;
          date: string;
        }>();

        entries.forEach((entry: any) => {
          if (!entry.clients || !entry.weight_kg) return;
          
          const client = entry.clients;
          const clientId = client.id;
          const age = client.birth_date 
            ? differenceInYears(now, new Date(client.birth_date)) 
            : null;

          // Apply age filter
          if (ageFilter !== 'all' && age !== null) {
            if (ageFilter === 'under30' && age >= 30) return;
            if (ageFilter === '30-40' && (age < 30 || age >= 40)) return;
            if (ageFilter === '40-50' && (age < 40 || age >= 50)) return;
            if (ageFilter === 'over50' && age < 50) return;
          }

          const existing = clientBestMap.get(clientId);
          if (!existing || entry.weight_kg > existing.maxWeight) {
            clientBestMap.set(clientId, {
              clientId,
              clientName: client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
              gender: client.gender as 'male' | 'female' | null,
              age,
              maxWeight: entry.weight_kg,
              date: entry.date,
            });
          }
        });

        // Convert to arrays and sort (highest weight first)
        const allEntries = Array.from(clientBestMap.values())
          .sort((a, b) => b.maxWeight - a.maxWeight);

        const maleEntries: LeaderboardEntry[] = allEntries
          .filter(e => e.gender === 'male')
          .map((e, idx) => ({
            rank: idx + 1,
            clientName: e.clientName,
            clientId: e.clientId,
            value: e.maxWeight,
            displayValue: `${e.maxWeight} kg`,
            gender: e.gender,
            age: e.age,
            date: e.date,
          }));

        const femaleEntries: LeaderboardEntry[] = allEntries
          .filter(e => e.gender === 'female')
          .map((e, idx) => ({
            rank: idx + 1,
            clientName: e.clientName,
            clientId: e.clientId,
            value: e.maxWeight,
            displayValue: `${e.maxWeight} kg`,
            gender: e.gender,
            age: e.age,
            date: e.date,
          }));

        return {
          exerciseName: exercise.name,
          unit: 'kg',
          maleEntries,
          femaleEntries,
        };
      }
    },
    enabled: !!exerciseId,
    staleTime: 2 * 60 * 1000,
  });
}
