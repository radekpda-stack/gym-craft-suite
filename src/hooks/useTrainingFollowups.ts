import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FollowupPriority = 'high' | 'medium' | 'low';
export type FollowupType = 'pain' | 'technique' | 'goal' | 'general';

export interface TrainingFollowup {
  id: string;
  training_session_id: string | null;
  client_id: string;
  user_id: string;
  content: string;
  followup_type: FollowupType;
  priority: FollowupPriority;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_in_training_id: string | null;
  exercise_id: string | null;
  created_at: string;
  training_session?: {
    date: string;
  } | null;
  resolved_training?: {
    date: string;
  } | null;
  exercise?: {
    name: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

export const FOLLOWUP_TEMPLATES = [
  { label: 'Zeptat se na bolest', content: 'Zeptat se jak je na tom bolest', type: 'pain' as FollowupType },
  { label: 'Zkontrolovat techniku', content: 'Zkontrolovat techniku cviku', type: 'technique' as FollowupType },
  { label: 'Probrat cíle', content: 'Probrat aktuální cíle a pokrok', type: 'goal' as FollowupType },
  { label: 'Dořešit téma', content: 'Dořešit téma z minula', type: 'general' as FollowupType },
];

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
          resolved_training:training_sessions!training_followups_resolved_in_training_id_fkey(date),
          exercise:exercises(name)
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
          training_session:training_sessions!training_followups_training_session_id_fkey(date),
          exercise:exercises(name)
        `)
        .eq('client_id', clientId)
        .eq('is_resolved', false)
        .order('priority', { ascending: true }) // high first
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingFollowup[];
    },
    enabled: !!clientId,
  });
}

export function useAllUnresolvedFollowups() {
  return useQuery({
    queryKey: ['training-followups', 'all-unresolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_followups')
        .select(`
          *,
          training_session:training_sessions!training_followups_training_session_id_fkey(date),
          exercise:exercises(name),
          client:clients(id, name)
        `)
        .eq('is_resolved', false)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingFollowup[];
    },
  });
}

export function useUnresolvedFollowupsCount(clientId: string | undefined) {
  return useQuery({
    queryKey: ['training-followups', clientId, 'unresolved-count'],
    queryFn: async () => {
      if (!clientId) return 0;

      const { count, error } = await supabase
        .from('training_followups')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_resolved', false);

      if (error) throw error;
      return count || 0;
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
        .select('*, exercise:exercises(name)')
        .eq('training_session_id', trainingSessionId)
        .order('priority', { ascending: true })
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
  followup_type?: FollowupType;
  priority?: FollowupPriority;
  exercise_id?: string;
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
          priority: params.priority || 'medium',
          exercise_id: params.exercise_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-followups', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['training-followups', 'all-unresolved'] });
      if (variables.training_session_id) {
        queryClient.invalidateQueries({ queryKey: ['training-followups', 'session', variables.training_session_id] });
      }
    },
  });
}

interface UpdateFollowupParams {
  followupId: string;
  clientId: string;
  content?: string;
  followup_type?: FollowupType;
  priority?: FollowupPriority;
}

export function useUpdateFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateFollowupParams) => {
      const updateData: Record<string, unknown> = {};
      if (params.content !== undefined) updateData.content = params.content;
      if (params.followup_type !== undefined) updateData.followup_type = params.followup_type;
      if (params.priority !== undefined) updateData.priority = params.priority;

      const { data, error } = await supabase
        .from('training_followups')
        .update(updateData)
        .eq('id', params.followupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-followups', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['training-followups', 'all-unresolved'] });
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
      queryClient.invalidateQueries({ queryKey: ['training-followups', 'all-unresolved'] });
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
      queryClient.invalidateQueries({ queryKey: ['training-followups', 'all-unresolved'] });
    },
  });
}
