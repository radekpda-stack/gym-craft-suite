import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RxWorkoutResult {
  id: string;
  rx_workout_id: string;
  client_id: string;
  score_primary: number;
  score_secondary: number | null;
  performed_at: string;
  notes: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    id: string;
    name: string;
    gender: string | null;
  };
}

export interface RxWorkoutResultInput {
  rx_workout_id: string;
  client_id: string;
  score_primary: number;
  score_secondary?: number;
  performed_at?: string;
  notes?: string;
}

// Fetch results for a specific RX workout
export function useRxWorkoutResults(workoutId: string | null) {
  return useQuery({
    queryKey: ['rx-workout-results', workoutId],
    queryFn: async (): Promise<RxWorkoutResult[]> => {
      if (!workoutId) return [];
      
      const { data, error } = await supabase
        .from('rx_workout_results')
        .select(`
          *,
          client:clients(id, name, gender)
        `)
        .eq('rx_workout_id', workoutId)
        .order('score_primary', { ascending: true }); // For time-based, lower is better
      
      if (error) throw error;
      return (data || []) as RxWorkoutResult[];
    },
    enabled: !!workoutId,
  });
}

// Fetch best result per client for leaderboard
export function useRxWorkoutLeaderboard(workoutId: string | null, scoringMode: string = 'for_time') {
  const { data: results = [], isLoading } = useRxWorkoutResults(workoutId);
  
  // Get best result per client
  const leaderboard = results.reduce((acc, result) => {
    const existing = acc.find(r => r.client_id === result.client_id);
    
    if (!existing) {
      acc.push(result);
    } else {
      const isBetter = scoringMode === 'for_time'
        ? result.score_primary < existing.score_primary
        : result.score_primary > existing.score_primary;
      
      if (isBetter) {
        const idx = acc.indexOf(existing);
        acc[idx] = result;
      }
    }
    
    return acc;
  }, [] as RxWorkoutResult[]);
  
  // Sort leaderboard
  const sorted = leaderboard.sort((a, b) => {
    if (scoringMode === 'for_time') {
      return a.score_primary - b.score_primary;
    }
    return b.score_primary - a.score_primary;
  });
  
  return {
    leaderboard: sorted,
    allResults: results,
    isLoading,
  };
}

// Create new result
export function useCreateRxWorkoutResult() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: RxWorkoutResultInput) => {
      if (!user) throw new Error('Nepřihlášen');
      
      const { data, error } = await supabase
        .from('rx_workout_results')
        .insert({
          rx_workout_id: input.rx_workout_id,
          client_id: input.client_id,
          score_primary: input.score_primary,
          score_secondary: input.score_secondary || null,
          performed_at: input.performed_at || new Date().toISOString().split('T')[0],
          notes: input.notes || null,
          recorded_by_user_id: user.id,
        })
        .select(`
          *,
          client:clients(id, name, gender)
        `)
        .single();
      
      if (error) throw error;
      return data as RxWorkoutResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rx-workout-results', variables.rx_workout_id] });
      toast.success('Výsledek zapsán');
    },
    onError: (error: any) => {
      console.error('Create RX result error:', error);
      if (error.code === '23505') {
        toast.error('Klient již má výsledek pro tento den');
      } else {
        toast.error('Nepodařilo se zapsat výsledek');
      }
    },
  });
}

// Update result
export function useUpdateRxWorkoutResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, workoutId, ...updates }: Partial<RxWorkoutResultInput> & { id: string; workoutId: string }) => {
      const { data, error } = await supabase
        .from('rx_workout_results')
        .update({
          score_primary: updates.score_primary,
          score_secondary: updates.score_secondary,
          notes: updates.notes,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rx-workout-results', variables.workoutId] });
      toast.success('Výsledek aktualizován');
    },
    onError: () => {
      toast.error('Nepodařilo se aktualizovat výsledek');
    },
  });
}

// Delete result
export function useDeleteRxWorkoutResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, workoutId }: { id: string; workoutId: string }) => {
      const { error } = await supabase
        .from('rx_workout_results')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rx-workout-results', variables.workoutId] });
      toast.success('Výsledek smazán');
    },
    onError: () => {
      toast.error('Nepodařilo se smazat výsledek');
    },
  });
}

// Helper functions for score formatting
export function formatRxScore(score: number, scoringMode: string, scoreSecondary?: number | null): string {
  switch (scoringMode) {
    case 'for_time': {
      const minutes = Math.floor(score / 60);
      const seconds = Math.round(score % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    case 'amrap':
    case 'rounds_reps': {
      const rounds = Math.floor(score);
      const reps = scoreSecondary ?? Math.round((score - rounds) * 1000);
      return `${rounds} + ${reps}`;
    }
    case 'max_load':
      return `${score} kg`;
    default:
      return score.toString();
  }
}

// Convert time input to seconds
export function timeInputToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

// Convert AMRAP input to score
export function amrapInputToScore(rounds: number, reps: number): { primary: number; secondary: number } {
  return {
    primary: rounds + (reps / 1000),
    secondary: reps,
  };
}
