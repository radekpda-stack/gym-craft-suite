import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface LatestPR {
  id: string;
  exerciseName: string;
  value: number;
  unit: string;
  date: string;
  type: 'strength' | 'cardio';
  reps?: number;
  sets?: number;
  duration_seconds?: number;
  distance_meters?: number;
}

export function useClientLatestProgress() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-portal-latest-progress', clientId],
    queryFn: async (): Promise<LatestPR | null> => {
      if (!clientId) return null;

      // Fetch latest strength PR (approved entries only)
      const { data: strengthPR } = await supabase
        .from('exercise_entries')
        .select(`
          id, 
          date, 
          weight_kg, 
          reps, 
          sets, 
          is_pr,
          exercise_id,
          exercises:exercise_id (name)
        `)
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .or('status.is.null,status.eq.approved')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch latest cardio PR
      const { data: cardioPR } = await supabase
        .from('cardio_entries')
        .select('id, date, exercise_name, duration_seconds, distance_meters, is_pr')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine which PR is more recent
      if (!strengthPR && !cardioPR) return null;

      const strengthDate = strengthPR?.date ? new Date(strengthPR.date) : new Date(0);
      const cardioDate = cardioPR?.date ? new Date(cardioPR.date) : new Date(0);

      if (strengthDate >= cardioDate && strengthPR) {
        const exerciseName = (strengthPR.exercises as any)?.name || 'Cvik';
        return {
          id: strengthPR.id,
          exerciseName,
          value: strengthPR.weight_kg ?? 0,
          unit: 'kg',
          date: strengthPR.date,
          type: 'strength',
          reps: strengthPR.reps ?? undefined,
          sets: strengthPR.sets ?? undefined,
        };
      }

      if (cardioPR) {
        return {
          id: cardioPR.id,
          exerciseName: cardioPR.exercise_name,
          value: cardioPR.duration_seconds,
          unit: 's',
          date: cardioPR.date,
          type: 'cardio',
          duration_seconds: cardioPR.duration_seconds,
          distance_meters: cardioPR.distance_meters ?? undefined,
        };
      }

      return null;
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get multiple recent PRs
export function useClientRecentPRs(limit = 3) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-portal-recent-prs', clientId, limit],
    queryFn: async (): Promise<LatestPR[]> => {
      if (!clientId) return [];

      // Fetch latest strength PRs
      const { data: strengthPRs } = await supabase
        .from('exercise_entries')
        .select(`
          id, 
          date, 
          weight_kg, 
          reps, 
          sets,
          exercises:exercise_id (name)
        `)
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .or('status.is.null,status.eq.approved')
        .order('date', { ascending: false })
        .limit(limit);

      // Fetch latest cardio PRs
      const { data: cardioPRs } = await supabase
        .from('cardio_entries')
        .select('id, date, exercise_name, duration_seconds, distance_meters')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(limit);

      const results: LatestPR[] = [];

      // Add strength PRs
      (strengthPRs ?? []).forEach(pr => {
        const exerciseName = (pr.exercises as any)?.name || 'Cvik';
        results.push({
          id: pr.id,
          exerciseName,
          value: pr.weight_kg ?? 0,
          unit: 'kg',
          date: pr.date,
          type: 'strength',
          reps: pr.reps ?? undefined,
          sets: pr.sets ?? undefined,
        });
      });

      // Add cardio PRs
      (cardioPRs ?? []).forEach(pr => {
        results.push({
          id: pr.id,
          exerciseName: pr.exercise_name,
          value: pr.duration_seconds,
          unit: 's',
          date: pr.date,
          type: 'cardio',
          duration_seconds: pr.duration_seconds,
          distance_meters: pr.distance_meters ?? undefined,
        });
      });

      // Sort by date descending and take top N
      return results
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  });
}
