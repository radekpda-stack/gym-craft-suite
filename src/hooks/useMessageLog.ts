import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MessageChannel = 'copy' | 'email' | 'sms' | 'whatsapp';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened';
export type InviteType = 'feedback' | 'pre_diagnostic' | 'nutrition';

export interface MessageLogEntry {
  id: string;
  user_id: string;
  invite_type: InviteType;
  invite_id: string;
  client_id: string;
  channel: MessageChannel;
  recipient: string | null;
  provider_message_id: string | null;
  status: MessageStatus;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function useMessageLog(inviteType: InviteType, inviteId: string | undefined) {
  return useQuery({
    queryKey: ['message-log', inviteType, inviteId],
    queryFn: async (): Promise<MessageLogEntry[]> => {
      if (!inviteId) return [];
      
      const { data, error } = await supabase
        .from('message_log')
        .select('*')
        .eq('invite_type', inviteType)
        .eq('invite_id', inviteId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as MessageLogEntry[];
    },
    enabled: !!inviteId,
  });
}

export function useClientMessageLog(clientId: string | undefined) {
  return useQuery({
    queryKey: ['message-log', 'client', clientId],
    queryFn: async (): Promise<MessageLogEntry[]> => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('message_log')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as MessageLogEntry[];
    },
    enabled: !!clientId,
  });
}

export function useLogMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: {
      invite_type: InviteType;
      invite_id: string;
      client_id: string;
      channel: MessageChannel;
      recipient?: string;
      status?: MessageStatus;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('message_log')
        .insert({
          user_id: user.id,
          invite_type: entry.invite_type,
          invite_id: entry.invite_id,
          client_id: entry.client_id,
          channel: entry.channel,
          recipient: entry.recipient || null,
          status: entry.status || 'sent',
          metadata: entry.metadata || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['message-log', data.invite_type, data.invite_id] });
      queryClient.invalidateQueries({ queryKey: ['message-log', 'client', data.client_id] });
    },
  });
}
