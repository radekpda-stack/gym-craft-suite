import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TrainerResultInput {
  challengeId: string;
  clientId: string;
  scorePrimary: number;
  scoreSecondary?: number;
  note?: string;
  mediaUrls?: string[];
}

// Submit result as trainer (coach)
export function useTrainerResultEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: TrainerResultInput) => {
      if (!user) throw new Error('Nepřihlášen');
      
      const { data, error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: input.challengeId,
          client_id: input.clientId,
          score_primary: input.scorePrimary,
          score_secondary: input.scoreSecondary || null,
          note: input.note || null,
          media_urls: input.mediaUrls || null,
          status: 'approved',
          confirmed_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions', variables.challengeId] });
      toast.success('Výsledek zapsán');
    },
    onError: (error) => {
      console.error('Trainer result entry error:', error);
      toast.error('Nepodařilo se zapsat výsledek');
    },
  });
}

// Helper to calculate composite AMRAP score
export function calculateAmrapScore(rounds: number, reps: number): number {
  // Store as rounds.reps for proper sorting (e.g., 18 rounds + 7 reps = 18.007)
  return rounds + (reps / 1000);
}

// Helper to parse composite AMRAP score back to rounds and reps
export function parseAmrapScore(score: number): { rounds: number; reps: number } {
  const rounds = Math.floor(score);
  const reps = Math.round((score - rounds) * 1000);
  return { rounds, reps };
}

// Helper to convert time input (minutes, seconds) to total seconds
export function timeToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

// Helper to parse seconds back to minutes and seconds
export function secondsToTime(totalSeconds: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds };
}

// Format score for display based on scoring type
export function formatScoreDisplay(
  scorePrimary: number, 
  scoringMode: string
): string {
  switch (scoringMode) {
    case 'for_time': {
      const { minutes, seconds } = secondsToTime(scorePrimary);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    case 'amrap':
    case 'rounds_reps': {
      const { rounds, reps } = parseAmrapScore(scorePrimary);
      return `${rounds} kol + ${reps} opak.`;
    }
    case 'max_load':
      return `${scorePrimary} kg`;
    default:
      return scorePrimary.toString();
  }
}
