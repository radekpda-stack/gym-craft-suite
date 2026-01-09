import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ClientForMigration {
  id: string;
  name: string;
  credit_balance: number;
  has_lots: boolean;
  price_lock_mode: string | null;
  locked_price_list_id: string | null;
}

/**
 * Get clients that need credit migration (have balance but no lots)
 */
export function useClientsForMigration() {
  return useQuery({
    queryKey: ['clients_for_migration'],
    queryFn: async (): Promise<ClientForMigration[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all active clients with positive credit
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, credit_balance, price_lock_mode, locked_price_list_id')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .gt('credit_balance', 0)
        .order('name');

      if (clientsError) throw clientsError;
      if (!clients || clients.length === 0) return [];

      // Get client IDs that already have lots
      const { data: lotsData, error: lotsError } = await supabase
        .from('credit_lots')
        .select('client_id')
        .eq('user_id', user.id);

      if (lotsError) throw lotsError;

      const clientsWithLots = new Set(lotsData?.map(l => l.client_id) || []);

      return clients.map(client => ({
        ...client,
        has_lots: clientsWithLots.has(client.id),
      }));
    },
  });
}

/**
 * Bulk migrate multiple clients
 */
export function useBulkMigrateCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      clientMigrations: Array<{ clientId: string; useOldPriceList: boolean }>
    ): Promise<{ success: number; failed: number; errors: string[] }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Není přihlášený uživatel');

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const { clientId, useOldPriceList } of clientMigrations) {
        try {
          const { data, error } = await supabase.rpc('rpc_migrate_credit_to_lot', {
            p_client_id: clientId,
            p_use_old_price_list: useOldPriceList,
            p_user_id: user.id,
          });

          if (error) throw error;

          const result = data as unknown as { success: boolean; error?: string };
          if (result.success) {
            success++;
          } else {
            failed++;
            errors.push(result.error || 'Neznámá chyba');
          }
        } catch (err) {
          failed++;
          errors.push(err instanceof Error ? err.message : 'Neznámá chyba');
        }
      }

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients_for_migration'] });
      queryClient.invalidateQueries({ queryKey: ['credit_lots'] });
      queryClient.invalidateQueries({ queryKey: ['credit_summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients_price_status'] });

      if (result.failed === 0) {
        toast({
          title: 'Migrace dokončena',
          description: `Úspěšně zmigrováno ${result.success} klientů.`,
        });
      } else {
        toast({
          title: 'Migrace dokončena s chybami',
          description: `Úspěšně: ${result.success}, Selhalo: ${result.failed}`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Bulk migration error:', error);
      toast({
        title: 'Chyba migrace',
        description: 'Nepodařilo se provést migraci.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get migration statistics
 */
export function useMigrationStats() {
  const { data: clients } = useClientsForMigration();

  const needsMigration = clients?.filter(c => !c.has_lots) || [];
  const alreadyMigrated = clients?.filter(c => c.has_lots) || [];
  const totalCreditToMigrate = needsMigration.reduce((sum, c) => sum + (c.credit_balance || 0), 0);

  return {
    needsMigration,
    alreadyMigrated,
    totalCreditToMigrate,
    totalClientsToMigrate: needsMigration.length,
  };
}
