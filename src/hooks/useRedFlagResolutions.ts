import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RedFlagResolution {
  id: string;
  feedback_id: string;
  client_id: string;
  user_id: string;
  resolved_at: string;
  resolution_note: string | null;
  created_at: string;
}

export function useRedFlagResolutions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['red-flag-resolutions', clientId],
    queryFn: async (): Promise<RedFlagResolution[]> => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('red_flag_resolutions')
        .select('*')
        .eq('client_id', clientId)
        .order('resolved_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

export function useResolveRedFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      feedbackId, 
      clientId, 
      note 
    }: { 
      feedbackId: string; 
      clientId: string; 
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('red_flag_resolutions')
        .insert({
          feedback_id: feedbackId,
          client_id: clientId,
          user_id: user.id,
          resolution_note: note || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['red-flag-resolutions', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-timeline', variables.clientId] });
      toast.success('Red flag označen jako vyřešený');
    },
    onError: (error) => {
      toast.error('Chyba při ukládání: ' + error.message);
    },
  });
}

export function useUnresolveRedFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ resolutionId, clientId }: { resolutionId: string; clientId: string }) => {
      const { error } = await supabase
        .from('red_flag_resolutions')
        .delete()
        .eq('id', resolutionId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['red-flag-resolutions', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-timeline', variables.clientId] });
      toast.success('Označení jako vyřešený zrušeno');
    },
    onError: (error) => {
      toast.error('Chyba: ' + error.message);
    },
  });
}
