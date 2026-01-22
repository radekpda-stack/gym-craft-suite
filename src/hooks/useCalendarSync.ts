import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SyncLog {
  total_in_ics: number;
  after_date_filter: number;
  after_tag_filter: number;
  matched_clients: number;
  unmatched: number;
  duplicates_found: number;
  synced_at: string;
}

export interface ICSFeed {
  id: string;
  user_id: string;
  name: string;
  ics_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_log: SyncLog | null;
  events_synced: number;
  sync_from_date: string | null;
  sync_horizon_months: number;
  auto_create_sessions: boolean;
  default_duration: number;
  import_filter_tag: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to transform database row to ICSFeed with proper typing
function transformFeed(row: any): ICSFeed {
  return {
    ...row,
    last_sync_log: row.last_sync_log as SyncLog | null,
  };
}

export interface ICSEvent {
  id: string;
  feed_id: string;
  ics_uid: string;
  summary: string | null;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  matched_client_id: string | null;
  training_session_id: string | null;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

export function useICSFeeds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ics-feeds', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_ics_feeds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(transformFeed);
    },
    enabled: !!user,
  });
}

export function useICSEvents(feedId: string | null) {
  return useQuery({
    queryKey: ['ics-events', feedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_ics_events')
        .select(`
          *,
          matched_client:clients!calendar_ics_events_matched_client_id_fkey(id, name)
        `)
        .eq('feed_id', feedId!)
        .order('start_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch additional client names for group trainings
      const eventsWithAdditionalClients = await Promise.all(
        (data || []).map(async (event) => {
          if (event.additional_matched_client_ids && event.additional_matched_client_ids.length > 0) {
            const { data: additionalClients } = await supabase
              .from('clients')
              .select('id, name')
              .in('id', event.additional_matched_client_ids);
            return { ...event, additional_clients: additionalClients || [] };
          }
          return { ...event, additional_clients: [] };
        })
      );

      return eventsWithAdditionalClients;
    },
    enabled: !!feedId,
  });
}

export function useCreateICSFeed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      ics_url: string;
      sync_from_date?: string;
      sync_horizon_months?: number;
      auto_create_sessions?: boolean;
      default_duration?: number;
      import_filter_tag?: string;
    }) => {
      if (!user) {
        throw new Error('Pro přidání kalendáře musíte být přihlášeni');
      }

      const { data: feed, error } = await supabase
        .from('calendar_ics_feeds')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return transformFeed(feed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
    },
  });
}

export function useUpdateICSFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, last_sync_log, ...data }: Partial<Omit<ICSFeed, 'last_sync_log'>> & { id: string; last_sync_log?: SyncLog | null }) => {
      const { error } = await supabase
        .from('calendar_ics_feeds')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
    },
  });
}

export function useDeleteICSFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const { error } = await supabase
        .from('calendar_ics_feeds')
        .delete()
        .eq('id', feedId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
    },
  });
}

export function useSyncICSFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'sync_feed',
          feedId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
    },
  });
}

export function useCreateSessionsFromEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'create_sessions_from_events',
          feedId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
  });
}

export function useSyncAndCreateSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'sync_and_create_sessions',
          feedId,
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        success: boolean;
        events_synced: number;
        sessions_created: number;
        unmatched_count: number;
        total_events: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useTestICSUrl() {
  return useMutation({
    mutationFn: async (icsUrl: string) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'test_url',
          icsUrl,
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        valid: boolean;
        error?: string;
        events_count?: number;
        sample_events?: Array<{ summary: string; date: string }>;
      };
    },
  });
}

export function useUpdateEventClientMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, clientId, learn = false }: { eventId: string; clientId: string | null; learn?: boolean }) => {
      // Update the event with the new client match
      const { error } = await supabase
        .from('calendar_ics_events')
        .update({
          matched_client_id: clientId,
          is_processed: false, // Reset so it can be re-processed
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      // If learning is requested and we have a client, call the learn action
      if (learn && clientId) {
        await supabase.functions.invoke('sync-ics-calendar', {
          body: {
            action: 'learn_alias',
            eventId,
            clientId,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['client-aliases'] });
    },
  });
}
