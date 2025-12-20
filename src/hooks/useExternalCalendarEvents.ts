import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export interface ExternalCalendarEvent {
  id: string;
  external_id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export function useExternalCalendarEvents() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['external-calendar-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('external_calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching external calendar events:', error);
        throw error;
      }

      return data as ExternalCalendarEvent[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('external-calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_calendar_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, query.refetch]);

  return query;
}
