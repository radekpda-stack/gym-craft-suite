import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'trainer' | 'client';
  clientId: string;
  trainerId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function useChatMessages(clientId: string | undefined, trainerId: string | undefined) {
  const conversationId = clientId && trainerId ? `${trainerId}-${clientId}` : null;

  const query = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderType: m.sender_type as 'trainer' | 'client',
        clientId: m.client_id,
        trainerId: m.trainer_id,
        content: m.content,
        isRead: m.is_read,
        readAt: m.read_at,
        createdAt: m.created_at,
      }));
    },
    enabled: !!conversationId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, query]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      trainerId,
      content,
      senderType,
    }: {
      clientId: string;
      trainerId: string;
      content: string;
      senderType: 'trainer' | 'client';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const conversationId = `${trainerId}-${clientId}`;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: senderType,
          client_id: clientId,
          trainer_id: trainerId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const conversationId = `${data.trainer_id}-${data.client_id}`;
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });
}

export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-conversations'] });
    },
  });
}

export function useMarkAllMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('trainer_id', user.id)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-conversations'] });
    },
  });
}

export function useUnreadMessageCount(trainerId?: string, clientId?: string) {
  return useQuery({
    queryKey: ['unread-messages', trainerId, clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      let query = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (trainerId) {
        query = query.eq('trainer_id', trainerId);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { count, error } = await query;
      if (error) throw error;

      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useTrainerConversations() {
  return useQuery({
    queryKey: ['trainer-conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all unique conversations with last message
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          conversation_id,
          client_id,
          content,
          created_at,
          is_read,
          sender_type,
          clients (name)
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation and get latest + unread count
      const conversations = new Map<string, any>();
      
      (data || []).forEach((msg: any) => {
        const existing = conversations.get(msg.conversation_id);
        if (!existing) {
          conversations.set(msg.conversation_id, {
            conversationId: msg.conversation_id,
            clientId: msg.client_id,
            clientName: msg.clients?.name || 'Neznámý',
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: msg.sender_type === 'client' && !msg.is_read ? 1 : 0,
          });
        } else if (msg.sender_type === 'client' && !msg.is_read) {
          existing.unreadCount++;
        }
      });

      return Array.from(conversations.values());
    },
  });
}
