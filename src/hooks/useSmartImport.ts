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
      return response.data as SmartImportResult;
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
