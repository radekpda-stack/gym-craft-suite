import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ImportableEvent {
  id: string;
  feed_id: string;
  ics_uid: string;
  summary: string | null;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  matched_client_id: string | null;
  additional_matched_client_ids: string[] | null;
  match_suggestions: Array<{
    client_id: string;
    name: string;
    score: number;
    match_type: string;
  }> | null;
  is_processed: boolean | null;
  skip_import: boolean | null;
  import_approved: boolean | null;
  potential_duplicate_session_id: string | null;
  created_at: string;
  updated_at: string;
  matched_client?: { id: string; name: string } | null;
  additional_clients?: Array<{ id: string; name: string }>;
  potential_duplicate?: { id: string; date: string; notes: string | null } | null;
}

export interface ImportStats {
  total: number;
  readyToImport: number;
  needsAssignment: number;
  skipped: number;
  processed: number;
  potentialDuplicates: number;
}

export function useImportableEvents(feedId: string | null) {
  return useQuery({
    queryKey: ['importable-events', feedId],
    queryFn: async () => {
      if (!feedId) return [];

      // First, get the feed's import_filter_tag for fallback filtering
      const { data: feedData } = await supabase
        .from('calendar_ics_feeds')
        .select('import_filter_tag')
        .eq('id', feedId)
        .single();
      
      const filterTag = feedData?.import_filter_tag;

      const { data, error } = await supabase
        .from('calendar_ics_events')
        .select(`
          *,
          matched_client:clients!calendar_ics_events_matched_client_id_fkey(id, name),
          potential_duplicate:training_sessions!calendar_ics_events_potential_duplicate_session_id_fkey(id, date, notes)
        `)
        .eq('feed_id', feedId)
        .eq('is_processed', false)
        .eq('skip_import', false)
        .order('start_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      // Fallback filter: only show events matching the filter tag (if set)
      // This catches any events that slipped through before the edge function filter was set
      let filteredData = data || [];
      if (filterTag) {
        const tagLower = filterTag.toLowerCase();
        filteredData = filteredData.filter(event => 
          (event.summary || '').toLowerCase().includes(tagLower)
        );
      }

      // Fetch additional client names for group trainings
      const eventsWithAdditionalClients = await Promise.all(
        filteredData.map(async (event) => {
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

      // Transform match_suggestions from Json to proper type
      return eventsWithAdditionalClients.map(event => ({
        ...event,
        match_suggestions: event.match_suggestions as ImportableEvent['match_suggestions'],
      })) as ImportableEvent[];
    },
    enabled: !!feedId,
  });
}

export function useImportStats(feedId: string | null) {
  return useQuery({
    queryKey: ['import-stats', feedId],
    queryFn: async (): Promise<ImportStats> => {
      if (!feedId) {
        return { total: 0, readyToImport: 0, needsAssignment: 0, skipped: 0, processed: 0, potentialDuplicates: 0 };
      }

      // First, get the feed's import_filter_tag for consistent filtering
      const { data: feedData } = await supabase
        .from('calendar_ics_feeds')
        .select('import_filter_tag')
        .eq('id', feedId)
        .single();
      
      const filterTag = feedData?.import_filter_tag;

      const { data, error } = await supabase
        .from('calendar_ics_events')
        .select('id, summary, matched_client_id, is_processed, skip_import, import_approved, potential_duplicate_session_id')
        .eq('feed_id', feedId);

      if (error) throw error;

      // Apply filter tag to stats calculation (same logic as in useImportableEvents)
      let events = data || [];
      if (filterTag) {
        const tagLower = filterTag.toLowerCase();
        events = events.filter(e => 
          (e.summary || '').toLowerCase().includes(tagLower)
        );
      }

      const unprocessed = events.filter(e => !e.is_processed);
      
      return {
        total: events.length,
        readyToImport: unprocessed.filter(e => e.matched_client_id && !e.skip_import).length,
        needsAssignment: unprocessed.filter(e => !e.matched_client_id && !e.skip_import).length,
        skipped: events.filter(e => e.skip_import).length,
        processed: events.filter(e => e.is_processed).length,
        potentialDuplicates: unprocessed.filter(e => e.potential_duplicate_session_id).length,
      };
    },
    enabled: !!feedId,
  });
}

export function useDeleteUnfilteredEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      // Get the feed's filter tag
      const { data: feedData, error: feedError } = await supabase
        .from('calendar_ics_feeds')
        .select('import_filter_tag')
        .eq('id', feedId)
        .single();

      if (feedError) throw feedError;
      
      const filterTag = feedData?.import_filter_tag;
      if (!filterTag) {
        throw new Error('Feed nemá nastavený filtrační tag');
      }

      // Get all unprocessed events that don't match the filter tag
      const { data: eventsToDelete, error: fetchError } = await supabase
        .from('calendar_ics_events')
        .select('id, summary')
        .eq('feed_id', feedId)
        .eq('is_processed', false);

      if (fetchError) throw fetchError;

      const tagLower = filterTag.toLowerCase();
      const idsToDelete = (eventsToDelete || [])
        .filter(e => !(e.summary || '').toLowerCase().includes(tagLower))
        .map(e => e.id);

      if (idsToDelete.length === 0) {
        return { deleted_count: 0 };
      }

      // Delete the events
      const { error: deleteError } = await supabase
        .from('calendar_ics_events')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      return { deleted_count: idsToDelete.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
    },
  });
}

export function useApproveEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'approve_events',
          eventIds,
        },
      });

      if (response.error) throw response.error;
      return response.data as { success: boolean; approved_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
    },
  });
}

export function useSkipEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'skip_events',
          eventIds,
        },
      });

      if (response.error) throw response.error;
      return response.data as { success: boolean; skipped_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
    },
  });
}

export function useCreateApprovedSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string) => {
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'create_approved_sessions',
          feedId,
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        success: boolean;
        sessions_created: number;
        events_processed: number;
        duplicates_skipped: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-core'] });
    },
  });
}

export function useUpdateEventClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      clientId, 
      learn = false 
    }: { 
      eventId: string; 
      clientId: string | null; 
      learn?: boolean;
    }) => {
      // Update the event with the new client match
      const { error } = await supabase
        .from('calendar_ics_events')
        .update({
          matched_client_id: clientId,
          import_approved: clientId ? true : false,
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
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['client-aliases'] });
    },
  });
}
