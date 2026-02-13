import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface BenchmarkResult {
  success?: boolean;
  error?: string;
  client_value?: number;
  percentile?: number;
  median?: number;
  p25?: number;
  p75?: number;
  count?: number;
  group?: string;
  metric_type?: string;
  display_mode?: string;
  available_groups?: string[];
}

interface ChallengeData {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  vod_url: string | null;
  start_at: string;
  end_at: string;
  scoring_type: string;
  primary_metric: string;
  unit_label: string | null;
  allow_multiple_attempts: boolean;
  requires_video: boolean;
}

interface ClientSubmission {
  id: string;
  challenge_id: string;
  score_primary: number;
  score_secondary: number | null;
  submitted_at: string;
  status: string;
}

export function useClientBenchmark(exerciseName: string, metricType: 'strength' | 'time' = 'strength') {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['client-benchmark', clientId, exerciseName, metricType],
    queryFn: async (): Promise<BenchmarkResult> => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_benchmark',
          clientId,
          trainerId,
          exerciseName,
          metricType,
          groupKey: 'all',
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    enabled: !!clientId && !!trainerId && !!exerciseName,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useClientActiveChallenges() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['client-active-challenges', clientId, trainerId],
    queryFn: async () => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_active_challenges',
          clientId,
          trainerId,
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        challenges: ChallengeData[];
        clientSubmissions: ClientSubmission[];
        participantCounts: Record<string, number>;
        display_mode: string;
        min_group_size: number;
      };
    },
    enabled: !!clientId && !!trainerId,
  });
}

export function useSubmitChallengeResult() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async ({ 
      challengeId, 
      score_primary, 
      score_secondary,
      note,
      media_urls 
    }: { 
      challengeId: string; 
      score_primary: number; 
      score_secondary?: number;
      note?: string;
      media_urls?: string[];
    }) => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'submit_challenge',
          clientId,
          trainerId,
          challengeId,
          score_primary,
          score_secondary,
          note,
          media_urls,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-active-challenges'] });
    },
  });
}

export function useChallengeLeaderboard(challengeId: string | null) {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['challenge-leaderboard', challengeId, clientId],
    queryFn: async () => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_leaderboard',
          clientId,
          trainerId,
          challengeId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    enabled: !!clientId && !!trainerId && !!challengeId,
  });
}

export function useClientPrivacySettings() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-privacy-settings', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('allow_anonymous_benchmarks, allow_challenges_participation, gender')
        .eq('id', clientId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useUpdateClientPrivacySettings() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();

  return useMutation({
    mutationFn: async (settings: {
      allow_anonymous_benchmarks?: boolean;
      allow_challenges_participation?: boolean;
    }) => {
      const { error } = await supabase
        .from('clients')
        .update(settings)
        .eq('id', clientId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-privacy-settings'] });
    },
  });
}
