import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface BulkSettingsUpdate {
  clientIds: string[];
  settings: {
    allow_challenges_participation?: boolean;
    allow_anonymous_benchmarks?: boolean;
    is_active?: boolean;
    graphVisibility?: {
      weight?: boolean;
      bodyFat?: boolean;
      trackedExercises?: boolean;
      rowing500m?: boolean;
      rowing1000m?: boolean;
      running500m?: boolean;
      running1000m?: boolean;
    };
    comparisonDisplayMode?: 'percentile' | 'leaderboard' | 'both' | 'none';
  };
}

export function useBulkUpdateClientSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientIds, settings }: BulkSettingsUpdate) => {
      let successCount = 0;
      const errors: string[] = [];

      // Update clients table fields
      const clientUpdates: Record<string, unknown> = {};
      if (settings.allow_challenges_participation !== undefined) {
        clientUpdates.allow_challenges_participation = settings.allow_challenges_participation;
      }
      if (settings.allow_anonymous_benchmarks !== undefined) {
        clientUpdates.allow_anonymous_benchmarks = settings.allow_anonymous_benchmarks;
      }

      if (Object.keys(clientUpdates).length > 0) {
        const { error } = await supabase
          .from('clients')
          .update(clientUpdates)
          .in('id', clientIds);
        
        if (error) {
          errors.push(`Chyba při aktualizaci klientů: ${error.message}`);
        }
      }

      // Update client_accounts fields
      const accountUpdates: Record<string, unknown> = {};
      if (settings.is_active !== undefined) {
        accountUpdates.is_active = settings.is_active;
      }

      if (Object.keys(accountUpdates).length > 0) {
        const { error } = await supabase
          .from('client_accounts')
          .update(accountUpdates)
          .in('client_id', clientIds);
        
        if (error) {
          errors.push(`Chyba při aktualizaci účtů: ${error.message}`);
        }
      }

      // Update portal_settings (graphVisibility, comparisonDisplayMode)
      if (settings.graphVisibility || settings.comparisonDisplayMode) {
        // We need to update each account individually to merge settings
        for (const clientId of clientIds) {
          try {
            // Get current settings
            const { data: account, error: fetchError } = await supabase
              .from('client_accounts')
              .select('portal_settings')
              .eq('client_id', clientId)
              .single();

            if (fetchError) {
              errors.push(`Chyba při načítání nastavení pro klienta ${clientId}`);
              continue;
            }

            const currentSettings = (account?.portal_settings as Record<string, unknown>) || {};
            const newSettings = { ...currentSettings };

            if (settings.graphVisibility) {
              const currentGraphVisibility = (currentSettings.graphVisibility as Record<string, boolean>) || {};
              newSettings.graphVisibility = {
                ...currentGraphVisibility,
                ...settings.graphVisibility,
              };
            }

            if (settings.comparisonDisplayMode) {
              newSettings.comparisonDisplayMode = settings.comparisonDisplayMode;
            }

            const { error: updateError } = await supabase
              .from('client_accounts')
              .update({ portal_settings: newSettings as Json })
              .eq('client_id', clientId);

            if (updateError) {
              errors.push(`Chyba při aktualizaci nastavení pro klienta ${clientId}`);
            } else {
              successCount++;
            }
          } catch (err) {
            errors.push(`Neočekávaná chyba pro klienta ${clientId}`);
          }
        }
      } else {
        successCount = clientIds.length;
      }

      return { successCount, errors, total: clientIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      if (result.errors.length === 0) {
        toast({
          title: 'Nastavení aktualizováno',
          description: `Úspěšně aktualizováno ${result.successCount} klientů`,
        });
      } else {
        toast({
          title: 'Částečná aktualizace',
          description: `Aktualizováno ${result.successCount}/${result.total} klientů. Některé aktualizace selhaly.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se aktualizovat nastavení',
        variant: 'destructive',
      });
    },
  });
}
