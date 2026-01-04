import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  vod_url: string | null;
  start_at: string;
  end_at: string;
  status: 'draft' | 'published' | 'archived';
  scoring_type: 'time_lower_better' | 'value_higher_better' | 'composite';
  primary_metric: 'time_seconds' | 'reps' | 'rounds' | 'weight_kg' | 'distance_m' | 'calories';
  secondary_metric: string | null;
  unit_label: string | null;
  allow_multiple_attempts: boolean;
  requires_video: boolean;
  published_to_portal_clients: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  // New fields for universal metrics
  ranking_mode: 'top1' | 'top3';
  tie_breaker: 'earliest_submission' | 'coach_confirmed_first' | 'same_rank';
  // Training template link
  training_template_id: string | null;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  client_id: string;
  submitted_at: string;
  score_primary: number;
  score_secondary: number | null;
  note: string | null;
  video_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  // New fields for winner tracking
  result_value: number | null;
  result_display: string | null;
  confirmed_by: 'coach' | 'client';
  is_winner: boolean;
  winner_rank: number | null;
  awarded_at: string | null;
  xp_awarded: number;
}

export function useChallenges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['challenges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('created_by_user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Challenge[];
    },
    enabled: !!user?.id,
  });
}

export function useChallengeSubmissions(challengeId: string | null) {
  return useQuery({
    queryKey: ['challenge-submissions', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          *,
          clients:client_id (id, name)
        `)
        .eq('challenge_id', challengeId!)
        .order('score_primary', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!challengeId,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challenge: Partial<Challenge>) => {
      const insertData = {
        title: challenge.title!,
        description: challenge.description,
        instructions: challenge.instructions,
        vod_url: challenge.vod_url,
        start_at: challenge.start_at!,
        end_at: challenge.end_at!,
        status: challenge.status || 'draft',
        scoring_type: challenge.scoring_type || 'value_higher_better',
        primary_metric: challenge.primary_metric || 'reps',
        secondary_metric: challenge.secondary_metric,
        unit_label: challenge.unit_label,
        allow_multiple_attempts: challenge.allow_multiple_attempts ?? true,
        requires_video: challenge.requires_video ?? false,
        published_to_portal_clients: challenge.published_to_portal_clients ?? true,
        created_by_user_id: user!.id,
        ranking_mode: challenge.ranking_mode || 'top3',
        tie_breaker: challenge.tie_breaker || 'earliest_submission',
        training_template_id: challenge.training_template_id || null,
      };

      const { data, error } = await supabase
        .from('challenges')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Výzva vytvořena');
    },
    onError: (error) => {
      console.error('Create challenge error:', error);
      toast.error('Nepodařilo se vytvořit výzvu');
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Challenge> & { id: string }) => {
      const { data, error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Výzva aktualizována');
    },
    onError: (error) => {
      console.error('Update challenge error:', error);
      toast.error('Nepodařilo se aktualizovat výzvu');
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Výzva smazána');
    },
    onError: (error) => {
      console.error('Delete challenge error:', error);
      toast.error('Nepodařilo se smazat výzvu');
    },
  });
}

export function useComparisonSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comparison-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', user!.id)
        .eq('key', 'comparison_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data?.value as {
        display_mode: 'percentile_only' | 'leaderboard_only' | 'both';
        min_group_size: number;
        benchmark_groups_enabled: string[];
      } || {
        display_mode: 'both',
        min_group_size: 8,
        benchmark_groups_enabled: ['all'],
      };
    },
    enabled: !!user?.id,
  });
}

export function useUpdateComparisonSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      display_mode: string;
      min_group_size: number;
      benchmark_groups_enabled: string[];
    }) => {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user!.id)
        .eq('key', 'comparison_settings')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: settings })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({
            user_id: user!.id,
            key: 'comparison_settings',
            value: settings,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-settings'] });
      toast.success('Nastavení uloženo');
    },
    onError: (error) => {
      console.error('Update comparison settings error:', error);
      toast.error('Nepodařilo se uložit nastavení');
    },
  });
}
