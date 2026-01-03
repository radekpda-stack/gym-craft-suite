import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnassignedSession {
  id: string;
  date: string;
  duration: number;
  notes: string | null;
  source_ics_event_id: string | null;
  source_event?: {
    id: string;
    summary: string | null;
    match_suggestions: Array<{
      client_id: string;
      name: string;
      score: number;
      match_type: string;
    }> | null;
  } | null;
}

export function useUnassignedSessions() {
  return useQuery({
    queryKey: ['training-sessions', 'unassigned'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get sessions without client_id
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          duration,
          notes,
          source_ics_event_id
        `)
        .eq('user_id', user.id)
        .is('client_id', null)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(20);

      if (error) throw error;

      // Fetch source events separately for match suggestions
      const eventIds = (sessions || [])
        .map(s => s.source_ics_event_id)
        .filter((id): id is string => id !== null);

      let eventsMap = new Map<string, UnassignedSession['source_event']>();
      
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('calendar_ics_events')
          .select('id, summary, match_suggestions')
          .in('id', eventIds);

        if (events) {
          for (const event of events) {
            eventsMap.set(event.id, {
              id: event.id,
              summary: event.summary,
              match_suggestions: event.match_suggestions as UnassignedSession['source_event']['match_suggestions'],
            });
          }
        }
      }

      // Combine sessions with their source events
      const result: UnassignedSession[] = (sessions || []).map(session => ({
        ...session,
        source_event: session.source_ics_event_id 
          ? eventsMap.get(session.source_ics_event_id) || null
          : null,
      }));

      return result;
    },
    staleTime: 30000,
  });
}

export function useUnassignedSessionsCount() {
  return useQuery({
    queryKey: ['training-sessions', 'unassigned-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('client_id', null)
        .gte('date', new Date().toISOString());

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });
}

export function useAssignClientToSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      clientId,
      learnAlias = false,
      eventId,
    }: { 
      sessionId: string; 
      clientId: string;
      learnAlias?: boolean;
      eventId?: string | null;
    }) => {
      // Update the session with the client
      const { error } = await supabase
        .from('training_sessions')
        .update({ client_id: clientId })
        .eq('id', sessionId);

      if (error) throw error;

      // Learn alias from the event if requested
      if (learnAlias && eventId) {
        await supabase.functions.invoke('sync-ics-calendar', {
          body: {
            action: 'learn_alias',
            eventId,
            clientId,
          },
        });
      }

      // Mark related notification as read
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('entity_type', 'training_session')
          .eq('entity_id', sessionId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
