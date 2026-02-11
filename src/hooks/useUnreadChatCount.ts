import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadChatCount(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['unread-chat-count', clientId],
    enabled: !!clientId,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!clientId) return 0;
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('sender_type', 'trainer')
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
  });
}
