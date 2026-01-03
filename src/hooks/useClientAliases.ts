import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClientAlias {
  id: string;
  client_id: string;
  alias: string;
  source: string;
  created_at: string;
}

export function useClientAliases(clientId: string | null) {
  return useQuery({
    queryKey: ['client-aliases', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_name_aliases')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientAlias[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientAlias() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ clientId, alias }: { clientId: string; alias: string }) => {
      const { data, error } = await supabase
        .from('client_name_aliases')
        .insert({
          client_id: clientId,
          alias: alias.toLowerCase().trim(),
          source: 'manual',
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientAlias;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-aliases', clientId] });
    },
  });
}

export function useDeleteClientAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aliasId, clientId }: { aliasId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_name_aliases')
        .delete()
        .eq('id', aliasId);

      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-aliases', clientId] });
    },
  });
}

export function useLearnAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, clientId }: { eventId: string; clientId: string }) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'learn_alias',
          eventId,
          clientId,
        },
      });

      if (response.error) throw response.error;
      return response.data as { success: boolean; learned_aliases: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
    },
  });
}
