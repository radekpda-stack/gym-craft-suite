import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingFollowup {
  id: string;
  training_session_id: string | null;
  client_id: string;
  user_id: string;
  content: string;
  followup_type: 'pain' | 'technique' | 'goal' | 'general';
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_in_training_id: string | null;
  created_at: string;
  training_session?: {
    date: string;
  } | null;
  resolved_training?: {
    date: string;
  } | null;
}

export function useTrainingFollowups(clientId: string | undefined) {
  return useQuery({
    queryKey: ['training-followups', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('training_followups')
        .select(`
          *,
          training_session:training_sessions!training_followups_training_session_id_fkey(date),
          resolved_training:training_sessions!training_followups_resolved_in_training_id_fkey(date)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingFollowup[];
    },
    enabled: !!clientId,
  });
}

export function useUnresolvedFollowups(clientId: string | undefined) {
  return useQuery({
    queryKey: ['training-followups', clientId, 'unresolved'],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('training_followups')
        .select(`
          *,
          training_session:training_sessions!training_followups_training_session_id_fkey(date)
        `)
        .eq('client_id', clientId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingFollowup[];
    },
    enabled: !!clientId,
  });
}

export function useTrainingSessionFollowups(trainingSessionId: string | undefined) {
  return useQuery({
    queryKey: ['training-followups', 'session', trainingSessionId],
    queryFn: async () => {
      if (!trainingSessionId) return [];

      const { data, error } = await supabase
        .from('training_followups')
        .select('*')
        .eq('training_session_id', trainingSessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingFollowup[];
    },
    enabled: !!trainingSessionId,
  });
}

interface CreateFollowupParams {
  training_session_id?: string;
  client_id: string;
  content: string;
  followup_type?: 'pain' | 'technique' | 'goal' | 'general';
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateFollowupParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_followups')
        .insert({
          training_session_id: params.training_session_id || null,
          client_id: params.client_id,
          user_id: user.id,
          content: params.content,
          followup_type: params.followup_type || 'general',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-followups', variables.client_id] });
      if (variables.training_session_id) {
        queryClient.invalidateQueries({ queryKey: ['training-followups', 'session', variables.training_session_id] });
      }
    },
  });
}

interface ResolveFollowupParams {
  followupId: string;
  clientId: string;
  resolvedInTrainingId?: string;
}

export function useResolveFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResolveFollowupParams) => {
      const { data, error } = await supabase
        .from('training_followups')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_in_training_id: params.resolvedInTrainingId || null,
        })
        .eq('id', params.followupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-followups', variables.clientId] });
      if (variables.resolvedInTrainingId) {
        queryClient.invalidateQueries({ queryKey: ['training-followups', 'session', variables.resolvedInTrainingId] });
      }
    },
  });
}

export function useDeleteFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followupId, clientId }: { followupId: string; clientId: string }) => {
      const { error } = await supabase
        .from('training_followups')
        .delete()
        .eq('id', followupId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-followups', variables.clientId] });
    },
  });
}
