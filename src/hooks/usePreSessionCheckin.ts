import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PreSessionCheckin {
  id: string;
  training_session_id: string;
  client_id: string;
  user_id: string;
  energy_level: number | null;
  sleep_quality: number | null;
  pain_area: string | null;
  pain_notes: string | null;
  notes: string | null;
  created_at: string;
}

interface SaveCheckinParams {
  training_session_id: string;
  client_id: string;
  energy_level?: number | null;
  sleep_quality?: number | null;
  pain_area?: string | null;
  pain_notes?: string | null;
  notes?: string | null;
}

export function usePreSessionCheckin(sessionId?: string) {
  return useQuery({
    queryKey: ['pre-session-checkin', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_session_checkins')
        .select('*')
        .eq('training_session_id', sessionId!)
        .maybeSingle();
      if (error) throw error;
      return data as PreSessionCheckin | null;
    },
    enabled: !!sessionId,
  });
}

export function useLatestCheckinForClient(clientId?: string) {
  return useQuery({
    queryKey: ['latest-checkin', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_session_checkins')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PreSessionCheckin | null;
    },
    enabled: !!clientId,
  });
}

export function useSavePreSessionCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveCheckinParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert - one checkin per session
      const { data: existing } = await supabase
        .from('pre_session_checkins')
        .select('id')
        .eq('training_session_id', params.training_session_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('pre_session_checkins')
          .update({
            energy_level: params.energy_level,
            sleep_quality: params.sleep_quality,
            pain_area: params.pain_area,
            pain_notes: params.pain_notes,
            notes: params.notes,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('pre_session_checkins')
          .insert({
            training_session_id: params.training_session_id,
            client_id: params.client_id,
            user_id: user.id,
            energy_level: params.energy_level,
            sleep_quality: params.sleep_quality,
            pain_area: params.pain_area,
            pain_notes: params.pain_notes,
            notes: params.notes,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['pre-session-checkin', params.training_session_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-checkin', params.client_id] });
    },
  });
}
