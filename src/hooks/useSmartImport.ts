import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SmartImportResult {
  success: boolean;
  synced: number;
  matched: number;
  accepted: number;
  imported: number;
  learned_aliases: number;
  needs_manual_count: number;
  needs_manual: Array<{
    id: string;
    summary: string;
    suggestions: Array<{
      clientId: string;
      clientName: string;
      score: number;
      matchType: string;
    }>;
  }>;
  duplicates_skipped: number;
}

export interface SmartImportOptions {
  feedId: string;
  autoAcceptMinScore?: number;
  learnAliases?: boolean;
  autoCreateSessions?: boolean;
}

/**
 * Smart Import - One-click import that combines:
 * 1. Sync new events from calendar
 * 2. Rematch all unmatched events
 * 3. Auto-accept high-confidence matches
 * 4. Learn new aliases
 * 5. Create training sessions
 */
export function useSmartImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SmartImportOptions): Promise<SmartImportResult> => {
      const { feedId, autoAcceptMinScore = 70, learnAliases = true, autoCreateSessions = true } = options;
      
      // Step 1: Smart Import (sync + match + approve)
      const response = await supabase.functions.invoke('sync-ics-calendar', {
        body: {
          action: 'smart_import',
          feedId,
          autoAcceptMinScore,
          learnAliases,
          autoCreateSessions,
        },
      });

      if (response.error) throw response.error;
      const importResult = response.data as SmartImportResult;
      
      // Step 2: Create training sessions from approved events
      let sessionsCreated = 0;
      let duplicatesSkipped = 0;
      
      if (autoCreateSessions) {
        console.log('[Smart Import] Step 2: Creating sessions from approved events...');
        const sessionsResponse = await supabase.functions.invoke('sync-ics-calendar', {
          body: {
            action: 'create_sessions_from_events',
            feedId,
          },
        });
        
        if (!sessionsResponse.error && sessionsResponse.data) {
          sessionsCreated = sessionsResponse.data.sessions_created || 0;
          // Calculate duplicates: events processed but no session created
          const eventsProcessed = sessionsResponse.data.events_processed || 0;
          duplicatesSkipped = Math.max(0, eventsProcessed - sessionsCreated);
          console.log(`[Smart Import] Created ${sessionsCreated} sessions, ${duplicatesSkipped} duplicates skipped`);
        }
      }
      
      // Return combined results
      return {
        ...importResult,
        imported: sessionsCreated,
        duplicates_skipped: duplicatesSkipped,
      };
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['ics-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-core'] });
      queryClient.invalidateQueries({ queryKey: ['client-aliases'] });
    },
  });
}

/**
 * Hook to manually create sessions from already approved events
 * Useful when smart_import timed out before session creation
 */
export function useCreateApprovedSessions() {
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
      return response.data as { sessions_created: number; events_processed: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ics-events'] });
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-core'] });
    },
  });
}

/**
 * Quick assign client to event with inline dropdown
 * Immediately marks event as approved
 */
export function useQuickAssignClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      clientId,
      learnAlias = true,
    }: { 
      eventId: string; 
      clientId: string;
      learnAlias?: boolean;
    }) => {
      // Update event with client and approve
      const { error } = await supabase
        .from('calendar_ics_events')
        .update({
          matched_client_id: clientId,
          import_approved: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      // Learn alias if requested
      if (learnAlias) {
        await supabase.functions.invoke('sync-ics-calendar', {
          body: {
            action: 'learn_alias',
            eventId,
            clientId,
          },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importable-events'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-aliases'] });
    },
  });
}
