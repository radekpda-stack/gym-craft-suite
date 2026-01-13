import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

export interface PeerChallengeXPStats {
  client_id: string;
  total_won: number;
  total_lost: number;
  total_bets: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  best_streak: number;
  biggest_win: number;
  biggest_loss: number;
}

export function usePeerChallengeXPStats() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['peer-challenge-xp-stats', clientId],
    queryFn: async (): Promise<PeerChallengeXPStats | null> => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('peer_challenge_xp_stats')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as PeerChallengeXPStats | null;
    },
    enabled: !!clientId,
  });
}

export function useClientXP() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-xp', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('client_xp')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useSetXPBet() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();

  return useMutation({
    mutationFn: async ({
      challengeId,
      xpBet,
    }: {
      challengeId: string;
      xpBet: number;
    }) => {
      if (!clientId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('peer_challenge_participants')
        .update({ xp_bet: xpBet })
        .eq('challenge_id', challengeId)
        .eq('client_id', clientId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['peer-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['my-peer-challenges'] });
    },
  });
}
